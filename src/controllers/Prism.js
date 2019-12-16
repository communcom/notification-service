const core = require('cyberway-core-service');
const { Logger } = core.utils;

const EventModel = require('../models/Event');
const UserModel = require('../models/User');
const UserBlockModel = require('../models/UserBlock');

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
                        Logger.error('Actions processing failed (skip):', blockInfo, action, err);
                    }
                }
            }
        }
    }

    async revertTo(blockNum) {
        Logger.info(`Reverting to block num: ${blockNum}.`);
        await this._removeAbove(blockNum);
    }

    async processFork(baseBlockNum) {
        Logger.info(`Fork processing. Revert to block num: ${baseBlockNum}.`);
        await this._removeAbove(baseBlockNum);
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

        try {
            await UserModel.create({
                userId,
                username,
                blockNum,
            });
        } catch (err) {
            // If error is not duplication
            if (err.code !== 11000) {
                throw err;
            }
        }
    }

    async _processNewPublication(
        { blockNum },
        { commun_code: communityId, message_id, parent_id, body }
    ) {
        const messageId = normalizeMessageId(message_id);
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
                { userId: true },
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

        await EventModel.create({
            eventType: 'upvote',
            userId: messageId.author,
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

    async _removeAbove(blockNum) {
        const removeCondition = {
            blockNum: {
                $gt: blockNum,
            },
        };

        await Promise.all([
            UserModel.deleteMany(removeCondition),
            EventModel.deleteMany(removeCondition),
        ]);
    }
}

function normalizeMessageId(messageId) {
    return {
        userId: messageId.author,
        permlink: messageId.permlink,
    };
}

module.exports = Prism;
