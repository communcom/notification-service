const crypto = require('crypto');
const core = require('cyberway-core-service');
const { Logger } = core.utils;

const EventModel = require('../../common/models/Event');
const UserModel = require('../../common/models/User');
const CommunityModel = require('../../common/models/Community');
const UserBlockModel = require('../../common/models/UserBlock');
const CommunityBlockModel = require('../../common/models/CommunityBlock');
const PublicationModel = require('../../common/models/Publication');
const { extractAlias, normalizeCommunityName } = require('../utils/community');
const { getConnector } = require('../utils/globals');
const { formatContentId, extractPublicationInfo } = require('../utils/publication');

const IGNORE_USER_ID = ['c.gallery', 'c.point'];
const POINT_TYPE = {
    POINT: 'point',
    TOKEN: 'token',
};

const VOTE_LEADER_TYPE = {
    VOTE: 'vote',
    UNVOTE: 'unvote',
};

class NoEntityError extends Error {}

class NoUserError extends NoEntityError {
    constructor() {
        super('User is not found');
    }
}

class NoCommunityError extends NoEntityError {
    constructor() {
        super('Community is not found');
    }
}

class NoPublicationError extends NoEntityError {
    constructor() {
        super('Publication is not found');
    }
}

class Prism {
    async processBlock(block) {
        const blockInfo = {
            blockId: block.id,
            blockNum: block.blockNum,
            blockTime: block.blockTime,
            sequence: block.sequence,
            notifications: [],
        };

        let actionNum = 0;

        for (const trx of block.transactions) {
            for (let i = 0; i < trx.actions.length; i++) {
                const action = trx.actions[i];
                actionNum++;

                // Process only original action and skip unparsed actions
                if (action.code === action.receiver && action.args) {
                    try {
                        await this._processAction(
                            {
                                ...blockInfo,
                                actionId: `${blockInfo.blockId}:${trx.id}:${i}`,
                                // Используем корректированное время чтобы нотификации из одного блока имели разное время
                                blockTimeCorrected: block.blockTime + actionNum,
                            },
                            action
                        );
                    } catch (err) {
                        if (err instanceof NoEntityError) {
                            continue;
                        }

                        Logger.error('Critical error!');
                        Logger.error('Action processing failed, block info:', blockInfo);
                        Logger.error('Action:', action);
                        Logger.error('Error:', err);
                        process.exit(1);
                    }
                }
            }
        }

        return blockInfo.notifications;
    }

    async revertTo(blockNum) {
        Logger.info(`Reverting to block num: ${blockNum}.`);
        await this._revertTo(blockNum);
    }

    async processFork(baseBlockNum) {
        Logger.info(`Fork processing. Revert to block num: ${baseBlockNum}.`);
        await this._revertTo(baseBlockNum);
    }

    async _processAction(actionInfo, { code, receiver, action, args }) {
        switch (code) {
            case 'cyber.domain':
                switch (action) {
                    case 'newusername':
                        await this._processNewUser(actionInfo, args);
                        break;
                    default:
                }
                break;

            case 'c.list':
                switch (action) {
                    case 'create':
                        await this._processNewCommunity(actionInfo, args);
                        break;
                    case 'setsysparams':
                        await this._processCommunityUpdate(actionInfo, args);
                        break;
                    case 'setinfo':
                        await this._processCommunityInfo(actionInfo, args);
                        break;
                    case 'hide':
                        await this._processCommunityHide(actionInfo, args);
                        break;
                    case 'unhide':
                        await this._processCommunityUnhide(actionInfo, args);
                        break;
                    default:
                }
                break;

            case 'c.gallery':
                switch (action) {
                    case 'create':
                        await this._processNewPublication(actionInfo, args);
                        break;
                    case 'update':
                        await this._processPublicationUpdate(actionInfo, args);
                        break;
                    case 'upvote':
                        await this._processUpvote(actionInfo, args);
                        break;
                    default:
                }
                break;

            case 'c.social':
                switch (action) {
                    case 'updatemeta':
                        await this._updateMeta(actionInfo, args);
                        break;
                    case 'block':
                        await this._processUserBlock(actionInfo, args);
                        break;
                    case 'unblock':
                        await this._processUserUnblock(actionInfo, args);
                        break;
                    case 'pin':
                        await this._processSubscription(actionInfo, args);
                        break;
                    default:
                }
                break;

            case 'c.point':
                switch (action) {
                    case 'transfer':
                        await this._processTransfer(code, actionInfo, args);
                        break;
                    default:
                }
                break;

            case 'c.ctrl':
                switch (action) {
                    case 'voteleader':
                        await this._processVoteLeader(actionInfo, args, VOTE_LEADER_TYPE.VOTE);
                        break;
                    /* enable if needed
                    case 'unvotelead':
                        await this._processVoteLeader(actionInfo, args, VOTE_LEADER_TYPE.UNVOTE);
                        break;
                    */
                    default:
                }
                break;
            default:
        }

        if (code === 'cyber.token' && receiver === 'cyber.token') {
            switch (action) {
                case 'transfer':
                    await this._processTransfer(code, actionInfo, args);
                    break;
                default:
            }
        }
    }

    async _processVoteLeader(
        { blockNum, blockTime, blockTimeCorrected, actionId, notifications },
        { commun_code: communityId, leader: userId, voter },
        type
    ) {
        if (!communityId) {
            return;
        }

        const eventType = type === VOTE_LEADER_TYPE.VOTE ? 'voteLeader' : 'unvoteLeader';
        const id = makeId(actionId, eventType, userId);

        await EventModel.create({
            id,
            eventType,
            communityId,
            userId,
            initiatorUserId: voter,
            blockNum,
            blockTime,
            blockTimeCorrected,
            data: {
                voter,
            },
        });

        notifications.push({
            id,
            eventType,
            userId,
        });
    }

    async _processTransfer(code, actionInfo, { from, to, quantity, memo }) {
        const pointType = code === 'cyber.token' ? POINT_TYPE.TOKEN : POINT_TYPE.POINT;
        const [amount, symbol] = quantity.split(' ');

        if (pointType === POINT_TYPE.TOKEN && symbol !== 'CMN') {
            return;
        }

        const { blockNum, blockTime, blockTimeCorrected, actionId, notifications } = actionInfo;

        const rewardMatch = memo.match(/^reward for ([0-9]+)$/);
        if (rewardMatch) {
            const [_, tracery] = rewardMatch;

            const userId = to;
            const eventType = 'reward';
            const id = makeId(actionId, eventType, userId);

            await EventModel.create({
                id,
                eventType,
                communityId: symbol,
                userId,
                blockNum,
                blockTime,
                blockTimeCorrected,
                data: {
                    amount,
                    tracery,
                },
            });

            notifications.push({
                id,
                eventType,
                userId,
            });

            return;
        }

        if (IGNORE_USER_ID.includes(from) || IGNORE_USER_ID.includes(to)) {
            return;
        }

        const userId = to;
        const eventType = 'transfer';
        const id = makeId(actionId, eventType, userId);

        await EventModel.create({
            id,
            eventType,
            communityId: symbol,
            userId,
            initiatorUserId: from,
            blockNum,
            blockTime,
            blockTimeCorrected,
            data: {
                amount,
                pointType,
            },
        });

        notifications.push({
            id,
            eventType,
            userId,
        });
    }

    async _processNewUser({ blockNum }, { owner: userId, name: username, creator }) {
        if (creator !== 'c') {
            return;
        }

        await UserModel.create({
            userId,
            username,
            blockNum,
        });
    }

    async _processNewCommunity({ blockNum }, { commun_code: communityId, community_name: name }) {
        await CommunityModel.create({
            communityId,
            name: normalizeCommunityName(name),
            alias: extractAlias(name),
            blockNum,
        });
    }

    async _processCommunityUpdate(
        { blockNum },
        { commun_code: communityId, community_name: name }
    ) {
        if (!name) {
            return;
        }

        const community = CommunityModel.findOne(
            { communityId: communityId },
            { _id: true, name: true },
            { lean: true }
        );

        if (!community) {
            return;
        }

        await CommunityModel.updateOne(
            {
                _id: community._id,
            },
            {
                $set: {
                    name: normalizeCommunityName(name),
                },
                $addToSet: {
                    revertLog: {
                        blockNum,
                        data: {
                            name: community.name,
                        },
                    },
                },
            }
        );
    }

    async _processCommunityInfo(
        { blockNum },
        { commun_code: communityId, avatar_image: avatarUrl }
    ) {
        if (!avatarUrl) {
            return;
        }

        const community = await CommunityModel.findOne(
            {
                communityId,
            },
            {
                _id: true,
                avatarUrl: true,
            },
            {
                lean: true,
            }
        );

        if (!community) {
            return;
        }

        await CommunityModel.updateOne(
            {
                _id: community._id,
            },
            {
                $set: {
                    avatarUrl,
                },
                $addToSet: {
                    revertLog: {
                        blockNum,
                        data: {
                            avatarUrl: community.avatarUrl,
                        },
                    },
                },
            }
        );
    }

    async _processNewPublication(actionInfo, { commun_code: communityId, message_id, parent_id }) {
        const { blockNum } = actionInfo;

        const messageId = normalizeMessageId(message_id, communityId);

        const [author] = await Promise.all([
            this._checkUser(messageId.userId),
            this._checkCommunity(communityId),
            parent_id.author ? this._checkUser(parent_id.author) : null,
        ]);

        let post;
        let comment;
        let entity;

        try {
            if (parent_id.author) {
                comment = await this._callPrismSafe('getComment', messageId);
                entity = comment;
            } else {
                post = await this._callPrismSafe('getPost', messageId);
                entity = post;
            }
        } catch (err) {
            Logger.error('Unknown error from prism:', err);
            return;
        }

        if (!entity) {
            return;
        }

        const info = extractPublicationInfo(entity);

        let parents = null;
        let replySentToUserId = null;

        if (comment) {
            parents = await this._processParents(comment);

            replySentToUserId = await this._processReply(comment, {
                actionInfo,
                communityId,
                messageId,
                info,
            });
        }

        const mentioned = await this._processMentions({
            actionInfo,
            communityId,
            messageId,
            author,
            info,
            replySentToUserId,
        });

        try {
            if (!entity.author.username) {
                Logger.error('Entity without author username:', entity);
            }

            await PublicationModel.create({
                ...info,
                type: comment ? 'comment' : 'post',
                contentId: {
                    ...entity.contentId,
                    username: entity.author.username,
                },
                parents,
                mentioned,
                blockNum,
                replySentToUserId,
            });
        } catch (err) {
            if (err.code === 11000) {
                Logger.warn(`Duplication publication at block num: ${blockNum}:`, entity.contentId);
            } else {
                throw err;
            }
        }
    }

    async _processParents({ parents }) {
        const postAuthor = await UserModel.findOne(
            { userId: parents.post.userId },
            { _id: false, username: true },
            { lean: true }
        );

        if (!postAuthor) {
            throw new NoUserError();
        }

        parents.post.username = postAuthor.username;

        if (parents.comment) {
            const commentAuthor = await UserModel.findOne(
                { userId: parents.comment.userId },
                { _id: false, username: true },
                { lean: true }
            );

            if (!commentAuthor) {
                throw new NoUserError();
            }

            parents.comment.username = commentAuthor.username;
        }

        return parents;
    }

    async _processPublicationUpdate(actionInfo, { commun_code: communityId, message_id }) {
        const { blockNum } = actionInfo;
        const messageId = normalizeMessageId(message_id, communityId);

        const [author, publication] = await Promise.all([
            this._checkUser(messageId.userId),
            this._checkPublication(messageId, true),
            this._checkCommunity(communityId),
        ]);

        let post;
        let comment;

        try {
            if (publication.type === 'comment') {
                comment = await this._callPrismSafe('getComment', messageId);
            } else {
                post = await this._callPrismSafe('getPost', messageId);
            }
        } catch (err) {
            Logger.error('Unknown error from prism:', err);
            return;
        }

        if (!comment && !post) {
            return;
        }

        const info = extractPublicationInfo(post || comment);
        const mentioned = await this._processMentions({
            actionInfo,
            communityId,
            messageId,
            author,
            info,
            replySentToUserId: publication.replySentToUserId,
            alreadyMentioned: publication.mentioned,
        });

        await PublicationModel.updateOne(
            {
                id: publication.id,
            },
            {
                $set: {
                    shortText: info.shortText,
                    imageUrl: info.imageUrl,
                    mentions: info.mentions,
                    mentioned,
                },
                $addToSet: {
                    revertLog: {
                        blockNum,
                        data: {
                            shortText: publication.shortText,
                            imageUrl: publication.imageUrl,
                            mentions: publication.mentions,
                            mentioned: publication.mentioned,
                        },
                    },
                },
            }
        );
    }

    async _processReply(comment, { actionInfo, communityId, info, messageId }) {
        const { parents } = comment;

        // process only top level comments
        if (parents.comment) {
            return;
        }

        const { userId } = parents.post;

        if (userId === comment.author.userId) {
            return;
        }

        try {
            await this._checkUser(userId);
        } catch {
            return;
        }

        const { blockNum, blockTime, blockTimeCorrected, actionId, notifications } = actionInfo;

        const id = makeId(actionId, 'reply', userId);

        await EventModel.create({
            id,
            eventType: 'reply',
            communityId,
            publicationId: info.id,
            userId,
            initiatorUserId: messageId.userId,
            blockNum,
            blockTime,
            blockTimeCorrected,
            data: {},
        });

        notifications.push({
            id,
            eventType: 'reply',
            userId,
        });

        return userId;
    }

    async _processMentions({
        actionInfo,
        communityId,
        messageId,
        author,
        info,
        replySentToUserId,
        alreadyMentioned,
    }) {
        const { blockNum, blockTime, blockTimeCorrected, actionId, notifications } = actionInfo;
        const mentioned = new Set(alreadyMentioned || []);

        for (const username of info.mentions) {
            if (username === author.username || mentioned.has(username)) {
                continue;
            }

            const mentionedUser = await UserModel.findOne(
                { username },
                { _id: false, userId: true },
                { lean: true }
            );

            if (!mentionedUser || mentionedUser.userId === replySentToUserId) {
                continue;
            }

            if (
                await this._checkUserBlock(mentionedUser.userId, {
                    communityId,
                    userId: author.userId,
                })
            ) {
                continue;
            }

            const id = makeId(actionId, 'mention', mentionedUser.userId);

            await EventModel.create({
                id,
                eventType: 'mention',
                communityId,
                publicationId: info.id,
                userId: mentionedUser.userId,
                initiatorUserId: messageId.userId,
                blockNum,
                blockTime,
                blockTimeCorrected,
                data: {},
            });

            notifications.push({
                id,
                eventType: 'mention',
                userId: mentionedUser.userId,
            });

            mentioned.add(username);
        }

        return [...mentioned];
    }

    async _processUpvote(
        { blockNum, blockTime, blockTimeCorrected, actionId, notifications },
        { commun_code: communityId, message_id, voter }
    ) {
        const messageId = normalizeMessageId(message_id, communityId);

        await Promise.all([
            this._checkCommunity(communityId),
            this._checkUser(messageId.userId),
            this._checkPublication(messageId),
        ]);

        if (await this._checkUserBlock(messageId.userId, { communityId, userId: voter })) {
            return;
        }

        const id = makeId(actionId, 'upvote', messageId.userId);

        await EventModel.create({
            id,
            eventType: 'upvote',
            communityId,
            userId: messageId.userId,
            initiatorUserId: voter,
            publicationId: formatContentId(messageId),
            blockNum,
            blockTime,
            blockTimeCorrected,
            data: {},
        });

        notifications.push({
            id,
            eventType: 'upvote',
            userId: messageId.userId,
        });
    }

    async _processSubscription(
        { blockNum, blockTime, blockTimeCorrected, actionId, notifications },
        { pinner, pinning }
    ) {
        await Promise.all([this._checkUser(pinner), this._checkUser(pinning)]);

        if (await this._checkUserBlock(pinning, { userId: pinner })) {
            return;
        }

        const id = makeId(actionId, 'subscribe', pinning);

        await EventModel.create({
            id,
            eventType: 'subscribe',
            userId: pinning,
            initiatorUserId: pinner,
            blockNum,
            blockTime,
            blockTimeCorrected,
            data: {},
        });

        notifications.push({
            id,
            eventType: 'subscribe',
            userId: pinning,
        });
    }

    async _processUserBlock({ blockNum }, { blocker, blocking }) {
        try {
            await UserBlockModel.create({
                userId: blocker,
                blockUserId: blocking,
                blockNum,
            });
        } catch (err) {
            if (err.code !== 11000) {
                throw err;
            }
        }
    }

    async _processUserUnblock({}, { blocker, blocking }) {
        await UserBlockModel.deleteOne({
            userId: blocker,
            blockUserId: blocking,
        });
    }

    async _processCommunityHide({ blockNum }, { commun_code: communityId, follower: userId }) {
        try {
            await CommunityBlockModel.create({
                userId,
                blockCommunityId: communityId,
                blockNum,
            });
        } catch (err) {
            if (err.code !== 11000) {
                throw err;
            }
        }
    }

    async _processCommunityUnhide({}, { commun_code: communityId, follower: userId }) {
        // TODO: Rewrite on revertLog for fork handling
        await UserBlockModel.deleteOne({
            userId,
            blockCommunityId: communityId,
        });
    }

    async _updateMeta({ blockNum }, { account, meta }) {
        const avatarUrl = meta.avatar_url;

        if (!avatarUrl) {
            return;
        }

        const user = await UserModel.findOne(
            { userId: account },
            { _id: true, avatarUrl: true },
            { lean: true }
        );

        if (!user) {
            return;
        }

        await UserModel.updateOne(
            {
                _id: user._id,
            },
            {
                $set: {
                    avatarUrl,
                },
                $addToSet: {
                    revertLog: {
                        blockNum,
                        data: {
                            avatarUrl: user.avatarUrl,
                        },
                    },
                },
            }
        );
    }

    async _checkUser(userId) {
        const user = await UserModel.findOne(
            { userId },
            { _id: false, userId: true, username: true },
            { lean: true }
        );

        if (!user) {
            throw new NoUserError();
        }

        return user;
    }

    async _checkUserBlock(userId, block) {
        const [blockedUser, blockedCommunity] = await Promise.all([
            block.userId
                ? UserBlockModel.findOne(
                      {
                          userId,
                          blockUserId: block.userId,
                      },
                      { _id: true },
                      { lean: true }
                  )
                : null,
            block.communityId
                ? CommunityBlockModel.findOne(
                      {
                          userId,
                          blockCommunityId: block.communityId,
                      },
                      { _id: true },
                      { lean: true }
                  )
                : null,
        ]);

        return Boolean(blockedUser || blockedCommunity);
    }

    async _checkCommunity(communityId) {
        const community = await CommunityModel.findOne(
            { communityId },
            { _id: true },
            { lean: true }
        );

        if (!community) {
            throw new NoCommunityError();
        }
    }

    async _checkPublication(contentId, isExtended) {
        const projection = {
            _id: true,
            id: true,
        };

        if (isExtended) {
            projection.type = true;
            projection.shortText = true;
            projection.imageUrl = true;
            projection.mentions = true;
            projection.mentioned = true;
            projection.replySentToUserId = true;
        }

        const publication = await PublicationModel.findOne(
            {
                id: formatContentId(contentId),
            },
            projection,
            {
                lean: true,
            }
        );

        if (!publication) {
            throw new NoPublicationError();
        }

        return publication;
    }

    async _revertTo(blockNum) {
        const removeCondition = {
            blockNum: {
                $gt: blockNum,
            },
        };

        await Promise.all([
            UserModel.deleteMany(removeCondition),
            CommunityModel.deleteMany(removeCondition),
            EventModel.deleteMany(removeCondition),
            UserBlockModel.deleteMany(removeCondition),
            CommunityBlockModel.deleteMany(removeCondition),
            PublicationModel.deleteMany(removeCondition),
        ]);

        await Promise.all([
            this._revertChanges(UserModel, blockNum),
            this._revertChanges(CommunityModel, blockNum),
            this._revertChanges(PublicationModel, blockNum),
        ]);
    }

    async _revertChanges(Model, blockNum) {
        const items = await Model.find(
            {
                'revertLog.blockNum': {
                    $gte: blockNum,
                },
            },
            {
                _id: true,
                revertLog: true,
            },
            {
                lean: true,
            }
        );

        const updates = {};

        for (const { _id, revertLog } of items) {
            for (let i = revertLog.length - 1; i >= 0; i--) {
                const change = revertLog[i];

                if (change.blockNum < blockNum) {
                    break;
                }

                Object.assign(updates, change.data);
            }

            await Model.updateOne(
                { _id },
                {
                    $set: updates,
                    $pull: { revertLog: { blockNum: { $gte: blockNum } } },
                }
            );
        }
    }

    async _callPrismSafe(method, params) {
        const con = getConnector();

        try {
            return await con.callService('prismApi', method, params);
        } catch (err) {
            if (err.code === 404) {
                // Публикация была отброшена призмой.
                Logger.info(
                    `Prism entity "${method}" "${JSON.stringify(params)}" is not found (skip).`
                );
                return null;
            } else {
                throw err;
            }
        }
    }
}

function normalizeMessageId(messageId, communityId) {
    return {
        communityId,
        userId: messageId.author,
        permlink: messageId.permlink,
    };
}

function makeId(actionId, eventType, userId) {
    const key = `${actionId}|${eventType}|${userId}`;
    const sha = crypto.createHash('sha1');
    sha.update(key);
    return sha.digest('hex');
}

module.exports = Prism;
