const crypto = require('crypto');
const core = require('cyberway-core-service');
const { Logger } = core.utils;

const EventModel = require('../models/Event');
const UserModel = require('../models/User');
const CommunityModel = require('../models/Community');
const UserBlockModel = require('../models/UserBlock');
const CommunityBlockModel = require('../models/CommunityBlock');
const PublicationModel = require('../models/Publication');
const { extractAlias, normalizeCommunityName } = require('../utils/community');
const { getConnector } = require('../utils/processStore');
const { formatContentId, extractPublicationInfo } = require('../utils/publication');

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

    async _processAction(actionInfo, { code, action, args }) {
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
        }
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

    async _processNewCommunity({ blockNum }, { community_name: name, commun_code: communityId }) {
        await CommunityModel.create({
            communityId,
            name: normalizeCommunityName(name),
            alias: extractAlias(name),
            blockNum,
        });
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
        const formattedMessageId = formatContentId(messageId);

        const [author] = await Promise.all([
            this._checkUser(messageId.userId),
            this._checkCommunity(communityId),
            parent_id.author ? this._checkUser(parent_id.author) : null,
        ]);

        const con = getConnector();
        let post;
        let comment;
        let entity;

        if (parent_id.author) {
            try {
                comment = await con.callService('prismApi', 'getComment', messageId);
                entity = comment;
            } catch (err) {
                if (err.code === 404) {
                    // Комментарий был отброшен призмой.
                    Logger.info(`Comment "${formattedMessageId}" is not found in prism (skip).`);
                    return;
                } else {
                    throw err;
                }
            }
        } else {
            try {
                post = await con.callService('prismApi', 'getPost', messageId);
                entity = post;
            } catch (err) {
                if (err.code === 404) {
                    // Пост был отброшен призмой.
                    Logger.info(`Post "${formattedMessageId}" is not found in prism (skip).`);
                    return;
                } else {
                    throw err;
                }
            }
        }

        if (!entity) {
            return;
        }

        const info = extractPublicationInfo(entity);

        const mentioned = await this._processMentions({
            actionInfo,
            communityId,
            messageId,
            author,
            info,
        });

        try {
            await PublicationModel.create({
                ...info,
                type: comment ? 'comment' : 'post',
                contentId: {
                    ...entity.contentId,
                    username: entity.author.username,
                },
                parents: comment ? await this._processParents(comment) : null,
                mentioned,
                blockNum,
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

        const con = getConnector();
        let post;
        let comment;

        if (publication.type === 'comment') {
            comment = await con.callService('prismApi', 'getComment', messageId);
        } else {
            post = await con.callService('prismApi', 'getPost', messageId);
        }

        const info = extractPublicationInfo(post || comment);
        const mentioned = await this._processMentions({
            actionInfo,
            communityId,
            messageId,
            author,
            info,
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

    async _processMentions({ actionInfo, communityId, messageId, author, info, alreadyMentioned }) {
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

            if (mentionedUser) {
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
        }

        return [...mentioned];
    }

    async _processUpvote(
        { blockNum, blockTime, blockTimeCorrected, actionId, notifications },
        { commun_code: communityId, message_id, voter }
    ) {
        const messageId = normalizeMessageId(message_id, communityId);

        await Promise.all([this._checkCommunity(communityId), this._checkUser(messageId.userId)]);

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
        const publication = await PublicationModel.findOne(
            {
                id: formatContentId(contentId),
            },
            {
                _id: true,
                id: true,
                type: isExtended || undefined,
                shortText: isExtended || undefined,
                imageUrl: isExtended || undefined,
                mentions: isExtended || undefined,
                mentioned: isExtended || undefined,
            },
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
