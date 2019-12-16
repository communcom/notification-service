const core = require('cyberway-core-service');
const { Logger } = core.utils;

const EventModel = require('../models/Event');
const UserModel = require('../models/User');
const CommunityModel = require('../models/Community');
const UserBlockModel = require('../models/UserBlock');
const { extractAlias } = require('../utils/community');

class NoUserError extends Error {
    constructor() {
        super('User is not found');
    }
}

class Prism {
    async processBlock(block) {
        const blockInfo = {
            blockId: block.id,
            blockNum: block.blockNum,
        };

        for (const trx of block.transactions) {
            for (const action of trx.actions) {
                // Process only original action and skip unparsed actions
                if (action.code === action.receiver && action.args) {
                    try {
                        await this._processAction(blockInfo, action);
                    } catch (err) {
                        if (err instanceof NoUserError) {
                            continue;
                        }

                        Logger.error('Critical error!');
                        Logger.error('Action processing failed:', blockInfo, action, err);
                        process.exit(1);
                    }
                }
            }
        }
    }

    async revertTo(blockNum) {
        Logger.info(`Reverting to block num: ${blockNum}.`);
        await this._revertTo(blockNum);
    }

    async processFork(baseBlockNum) {
        Logger.info(`Fork processing. Revert to block num: ${baseBlockNum}.`);
        await this._revertTo(baseBlockNum);
    }

    async _processAction(blockInfo, { code, action, args }) {
        switch (code) {
            case 'cyber.domain':
                switch (action) {
                    case 'newusername':
                        await this._processNewUser(blockInfo, args);
                        break;
                    default:
                }
                break;

            case 'c.list':
                switch (action) {
                    case 'create':
                        await this._processNewCommunity(blockInfo, args);
                        break;
                    case 'setinfo':
                        await this._processCommunityInfo(blockInfo, args);
                        break;
                }
                break;

            case 'c.gallery':
                switch (action) {
                    case 'create':
                        await this._processNewPublication(blockInfo, args);
                        break;
                    case 'upvote':
                        await this._processUpvote(blockInfo, args);
                        break;
                    default:
                }
                break;

            case 'c.social':
                switch (action) {
                    case 'updatemeta':
                        await this._updateMeta(blockInfo, args);
                        break;
                    case 'block':
                        await this._processUserBlock(blockInfo, args);
                        break;
                    case 'unblock':
                        await this._processUserUnblock(blockInfo, args);
                        break;
                    case 'pin':
                        await this._processSubscription(blockInfo, args);
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
            name,
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

    async _processNewPublication(
        { blockNum },
        { commun_code: communityId, message_id, parent_id, body }
    ) {
        const messageId = normalizeMessageId(message_id);

        await this._checkUser(messageId.userId);

        const contentType = Boolean(parent_id.author) ? 'comment' : 'post';

        const mentions = new Set();

        let doc;
        try {
            doc = JSON.parse(body);
        } catch (err) {
            Logger.warn('Invalid publication body:', messageId);
            return;
        }

        for (const node of doc.content) {
            if (node.type === 'paragraph') {
                for (const leaf of node.content) {
                    if (leaf.type === 'mention' && leaf.content !== messageId.userId) {
                        mentions.add(leaf.content);
                    }
                }
            }
        }

        for (const username of mentions) {
            const mentionedUser = await UserModel.findOne(
                { username },
                { _id: false, userId: true },
                { lean: true }
            );

            if (mentionedUser) {
                await EventModel.create({
                    eventType: 'mention',
                    userId: mentionedUser.userId,
                    initiatorUserId: messageId.userId,
                    blockNum,
                    timestamp: new Date(),
                    data: {
                        communityId,
                        contentType,
                        messageId: normalizeMessageId(messageId),
                    },
                });
            }
        }
    }

    async _processUpvote({ blockNum }, { commun_code: communityId, message_id, voter }) {
        const messageId = normalizeMessageId(message_id);

        await this._checkUser(messageId.userId);

        await EventModel.create({
            eventType: 'upvote',
            userId: messageId.userId,
            initiatorUserId: voter,
            blockNum,
            timestamp: new Date(),
            data: {
                communityId,
                messageId,
            },
        });
    }

    async _processSubscription({ blockNum }, { pinner, pinning }) {
        await this._checkUser(pinner);
        await this._checkUser(pinning);

        await EventModel.create({
            eventType: 'subscribe',
            userId: pinning,
            initiatorUserId: pinner,
            blockNum,
            timestamp: new Date(),
            data: {
                follower: pinner,
            },
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
        const user = await UserModel.findOne({ userId }, { _id: true }, { lean: true });

        if (!user) {
            throw new NoUserError();
        }
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
        ]);

        await Promise.all([
            this._revertChanges(UserModel, blockNum),
            this._revertChanges(CommunityModel, blockNum),
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
            let stopOn = null;

            for (let i = revertLog.length - 1; i >= 0; i--) {
                const change = revertLog[i];

                if (change.blockNum < blockNum) {
                    stopOn = i;
                    break;
                }

                Object.assign(updates, change.data);
            }

            if (stopOn === null) {
                updates.revertLog = [];
            } else {
                updates.revertLog = revertLog.slice(0, stopOn + 1);
            }

            await Model.updateOne(
                { _id },
                {
                    $set: updates,
                }
            );
        }
    }
}

function normalizeMessageId(messageId) {
    return {
        userId: messageId.author,
        permlink: messageId.permlink,
    };
}

module.exports = Prism;
