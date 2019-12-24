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

        return {
            items: notifications,
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
                    entry: { $arrayElemAt: ['$entry', 0] },
                },
            },
        ]);

        const items = events.map(event => {
            const { id, eventType } = event;

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

            switch (eventType) {
                case 'subscribe':
                    data = {
                        user: event.user,
                    };
                    break;

                case 'mention':
                    data = {
                        author: event.user,
                    };
                    break;

                case 'upvote':
                    data = {
                        voter: event.user,
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
                ...data,
            };
        });

        return items;
    }

    async getStatus({}, { userId }) {
        const user = await UserModel.findOne(
            { userId },
            { _id: false, lastVisitAt: true },
            { lean: true }
        );

        if (!user) {
            return {
                hasUnseen: false,
            };
        }

        const query = {
            userId,
        };

        if (user.lastVisitAt) {
            query.createdAt = {
                $gte: user.lastVisitAt,
            };
        }

        const somethingFound = await EventModel.findOne(query, { _id: true }, { lean: true });

        return {
            hasUnseen: Boolean(somethingFound),
        };
    }

    async markAllAsViewed({}, { userId }) {
        await UserModel.updateOne(
            { userId },
            {
                $set: {
                    lastVisitAt: new Date(),
                },
            }
        );
    }

    async markAsRead({ notificationId }, { userId }) {
        await EventModel.updateOne(
            {
                notificationId,
                userId,
            },
            {
                $set: {
                    isRead: true,
                },
            }
        );
    }
}

module.exports = Api;
