const EventModel = require('../models/Event');
const UserModel = require('../models/User');
const UserBlockModel = require('../models/UserBlock');
const CommunityBlockModel = require('../models/CommunityBlock');

class Api {
    async getNotifications({ beforeThan, limit }, { userId }) {
        const blockingUsers = await UserBlockModel.find(
            { userId },
            { _id: false, blockUserId: true },
            { lean: true }
        );

        const blockingCommunities = await CommunityBlockModel.find(
            {
                userId,
            },
            {
                _id: false,
                blockCommunityId: true,
            },
            { lean: true }
        );

        const match = {
            userId,
        };

        if (blockingUsers.length) {
            match.initiatorUserId = {
                $nin: blockingUsers.map(block => block.blockUserId),
            };
        }

        if (blockingCommunities.length) {
            match.communityId = {
                $nin: blockingCommunities.map(block => block.blockCommunityId),
            };
        }

        if (beforeThan) {
            const date = new Date(beforeThan);

            if (date.toString() === 'Invalid Date') {
                throw {
                    code: 500,
                    message: 'Invalid "beforeThan" parameter value',
                };
            }

            match.blockTimeCorrected = {
                $lte: date,
            };
        }

        const notifications = await this._getNotifications([
            { $match: match },
            { $sort: { blockTimeCorrected: -1 } },
            { $limit: limit },
        ]);

        const first = notifications[0];

        return {
            items: notifications,
            lastNotificationTimestamp: first ? first.timestamp : null,
        };
    }

    async getNotification({ id }) {
        const [notification] = await this._getNotifications([
            {
                $match: {
                    id,
                },
            },
            {
                $limit: 1,
            },
        ]);

        if (!notification) {
            throw {
                code: 404,
                message: 'Notification is not found',
            };
        }

        return notification;
    }

    async _getNotifications(aggregation) {
        const events = await EventModel.aggregate([
            ...aggregation,
            {
                $lookup: {
                    from: 'users',
                    localField: 'initiatorUserId',
                    foreignField: 'userId',
                    as: 'initiator',
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
                $lookup: {
                    from: 'publications',
                    localField: 'publicationId',
                    foreignField: 'id',
                    as: 'entry',
                },
            },
            {
                $project: {
                    _id: false,
                    id: true,
                    eventType: true,
                    communityId: true,
                    initiatorUserId: true,
                    data: true,
                    timestamp: '$blockTimeCorrected',
                    isRead: true,
                    userId: true,
                    initiator: {
                        $let: {
                            vars: {
                                user: { $arrayElemAt: ['initiator', 0] },
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
                    entry: { $arrayElemAt: ['$entry', 0] },
                },
            },
        ]);

        const users = new Set();

        const items = events.map(event => {
            const { id, eventType, userId } = event;

            users.add(userId);

            if (!event.community.communityId) {
                if (event.communityId) {
                    throw new Error('Community is not found');
                }

                delete event.community;
            }

            if (!event.initiator.userId) {
                if (event.initiatorUserId) {
                    throw new Error('User is not found');
                }

                delete event.initiator;
            }

            let data = null;

            switch (eventType) {
                case 'subscribe':
                    data = {
                        user: event.initiator,
                    };
                    break;

                case 'mention':
                    data = {
                        author: event.initiator,
                    };
                    break;

                case 'upvote':
                    data = {
                        voter: event.initiator,
                    };
                    break;

                default:
            }

            if (eventType === 'mention' || eventType === 'upvote') {
                if (!event.entry) {
                    throw new Error('Entry not found');
                }

                data.entityType = event.entry.type;

                const entry = {
                    contentId: event.entry.contentId,
                    shortText: event.entry.shortText || null,
                    imageUrl: event.entry.imageUrl || null,
                };

                if (event.entry.type === 'comment') {
                    entry.parents = event.entry.parents;
                    data.comment = entry;
                } else {
                    data.post = entry;
                }
            }

            return {
                id,
                eventType,
                timestamp: event.timestamp,
                community: event.community,
                userId,
                ...data,
            };
        });

        if (items.length) {
            const userModels = await UserModel.find(
                { userId: { $in: [...users] } },
                { _id: false, userId: true, notificationsViewedAt: true },
                { lean: true }
            );

            const usersViewedAt = new Map(
                userModels.map(({ userId, notificationsViewedAt }) => [
                    userId,
                    notificationsViewedAt,
                ])
            );

            for (const item of items) {
                const notificationsViewedAt = usersViewedAt.get(item.userId);

                item.isNew = notificationsViewedAt ? item.timestamp > notificationsViewedAt : true;
            }
        }

        return items;
    }

    async getStatus({}, { userId }) {
        const user = await UserModel.findOne(
            { userId },
            { _id: false, notificationsViewedAt: true },
            { lean: true }
        );

        if (!user) {
            return {
                unseenCount: 0,
            };
        }

        const query = {
            userId,
        };

        if (user.notificationsViewedAt) {
            query.blockTimeCorrected = {
                $gte: user.notificationsViewedAt,
            };
        }

        const count = await EventModel.countDocuments(query);

        return {
            unseenCount: count,
        };
    }

    async markAllAsViewed({ until }, { userId }) {
        await UserModel.updateOne(
            { userId },
            {
                $set: {
                    notificationsViewedAt: new Date(until),
                },
            }
        );
    }
}

module.exports = Api;
