const EventModel = require('../models/Event');
const UserBlockModel = require('../models/UserBlock');

class Api {
    async getNotifications({ userId, offset, limit }) {
        const blockingUsers = await UserBlockModel.find(
            { userId },
            { _id: false, blockUserId: true },
            { lean: true }
        );

        const match = {
            userId,
        };

        if (blockingUsers.length) {
            match.initiatorUserId = {
                $nin: blockingUsers.map(user => user.blockUserId),
            };
        }

        const events = await EventModel.aggregate([
            { $match: match },
            { $sort: { blockTime: -1 } },
            { $skip: offset },
            { $limit: limit },
            {
                $lookup: {
                    from: 'users',
                    localField: 'initiatorUserId',
                    foreignField: 'userId',
                    as: 'user',
                },
            },
            {
                $lookup: {
                    from: 'communities',
                    localField: 'communityId',
                    foreignField: 'communityId',
                    as: 'community',
                },
            },
            {
                $project: {
                    _id: false,
                    eventType: true,
                    communityId: true,
                    initiatorUserId: true,
                    data: true,
                    timestamp: '$blockTime',
                    user: {
                        $let: {
                            vars: {
                                user: { $arrayElemAt: ['$user', 0] },
                            },
                            in: {
                                userId: '$$user.userId',
                                username: '$$user.username',
                                avatarUrl: '$$user.avatarUrl',
                            },
                        },
                    },
                    community: {
                        $let: {
                            vars: {
                                community: { $arrayElemAt: ['$community', 0] },
                            },
                            in: {
                                communityId: '$$community.communityId',
                                name: '$$community.name',
                                alias: '$$community.alias',
                                avatarUrl: '$$community.avatarUrl',
                            },
                        },
                    },
                },
            },
        ]);

        const items = events.map(event => {
            if (!event.community.communityId) {
                if (event.communityId) {
                    throw new Error('Community is not found');
                }

                delete event.community;
            }

            if (!event.user.userId) {
                if (event.initiatorUserId) {
                    throw new Error('User is not found');
                }

                delete event.user;
            }

            let data = null;

            switch (event.eventType) {
                case 'subscribe':
                    data = {
                        user: event.user,
                    };
                    break;

                case 'mention':
                    data = {
                        entityType: event.data.entityType,
                        author: event.user,
                        messageId: event.data.messageId,
                    };
                    break;

                case 'upvote':
                    data = {
                        voter: event.user,
                        messageId: event.data.messageId,
                    };
                    break;

                case 'reply':
                    data = {
                        author: event.user,
                        messageId: event.data.messageId,
                        replyMessageId: event.data.replyMessageId,
                    };
                    break;

                default:
            }

            return {
                eventType: event.eventType,
                timestamp: event.timestamp,
                community: event.community,
                ...data,
            };
        });

        return {
            items,
        };
    }
}

module.exports = Api;
