const core = require('cyberway-core-service');
const { Logger } = core.utils;

const { TYPES, TRANSFER_LIKE_TYPES } = require('../../common/data/eventTypes');
const EventModel = require('../../common/models/Event');
const UserModel = require('../../common/models/User');
const UserBlockModel = require('../../common/models/UserBlock');
const CommunityBlockModel = require('../../common/models/CommunityBlock');

class Api {
    async getNotifications({ beforeThan, limit, filter }, { userId }) {
        if (filter && filter.length === 0) {
            return {
                items: [],
                lastNotificationTimestamp: null,
            };
        }

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

        if (filter && !filter.includes('all')) {
            match.eventType = {
                $in: filter,
            };
        }

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
                    from: 'users',
                    localField: 'referralUserId',
                    foreignField: 'userId',
                    as: 'referralUser',
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
                    referralUserId: true,
                    data: true,
                    timestamp: '$blockTimeCorrected',
                    isRead: true,
                    userId: true,
                    initiator: {
                        $let: {
                            vars: {
                                user: { $arrayElemAt: ['$initiator', 0] },
                            },
                            in: {
                                userId: '$$user.userId',
                                username: '$$user.username',
                                avatarUrl: '$$user.avatarUrl',
                            },
                        },
                    },
                    referralUser: {
                        $let: {
                            vars: {
                                user: { $arrayElemAt: ['$referralUser', 0] },
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
                if (event.communityId && event.communityId !== 'CMN') {
                    throw new Error('Community is not found');
                }

                delete event.community;
            }

            if (!event.initiator.userId) {
                if (event.initiatorUserId && TRANSFER_LIKE_TYPES.includes(eventType)) {
                    event.initiator = {
                        userId: event.initiatorUserId,
                        username: null,
                        avatarUrl: null,
                    };
                } else {
                    if (event.initiatorUserId) {
                        throw new Error('Initiator user is not found');
                    }

                    delete event.initiator;
                }
            }

            if (event.referralUserId && !event.referralUser.userId) {
                throw new Error('Referral user is not found');
            }

            let data = null;

            switch (eventType) {
                case TYPES.SUBSCRIBE:
                    data = {
                        user: event.initiator,
                    };
                    break;

                case TYPES.MENTION:
                case TYPES.REPLY:
                    data = {
                        author: event.initiator,
                    };
                    break;

                case TYPES.UPVOTE:
                    data = {
                        voter: event.initiator,
                    };
                    break;

                case TYPES.TRANSFER:
                case TYPES.REWARD:
                case TYPES.DONATION:
                    data = {
                        from: event.initiator,
                    };
                    break;

                case TYPES.REFERRAL_REGISTRATION_BONUS:
                case TYPES.REFERRAL_PURCHASE_BONUS:
                    data = {
                        from: event.initiator,
                        referral: event.referralUser,
                    };
                    break;

                default:
            }

            if ([TYPES.MENTION, TYPES.UPVOTE, TYPES.REPLY, TYPES.DONATION].includes(eventType)) {
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

            if (TRANSFER_LIKE_TYPES.includes(eventType)) {
                data = { ...data, ...event.data };
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
        return await this._getStatus(userId);
    }

    async getStatusSystem({ userId }) {
        return await this._getStatus(userId);
    }

    async _getStatus(userId) {
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
                $gt: user.notificationsViewedAt,
            };
        }

        const count = await EventModel.countDocuments(query);

        return {
            unseenCount: count,
        };
    }

    async markAllAsViewed({ until }, { userId }) {
        const now = new Date();
        let date = new Date(until);

        if (!date.getTime() || date > now) {
            Logger.warn(
                `markAllAsViewed called with invalid timestamp or with date in the future: (${until})`
            );
            date = now;
        }

        await UserModel.updateOne(
            {
                userId,
                $or: [
                    {
                        notificationsViewedAt: { $lt: date },
                    },
                    {
                        notificationsViewedAt: { $eq: null },
                    },
                ],
            },
            {
                $set: {
                    notificationsViewedAt: date,
                },
            }
        );
    }
}

module.exports = Api;
