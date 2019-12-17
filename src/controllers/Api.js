const EventModel = require('../models/Event');
const UserBlockModel = require('../models/UserBlock');
const CommunityBlockModel = require('../models/CommunityBlock');

class Api {
    async getNotifications({ userId, offset, limit }) {
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
                    entry: { $arrayElemAt: ['$entry', 0] },
                },
            },
        ]);

        const items = events.map(event => {
            const { eventType } = event;

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

                default:
            }

            if (eventType === 'mention' || eventType === 'upvote') {
                data.entryType = event.type;
                data.contentId = event.entry.contentId;
                data.imageUrl = event.entry.imageUrl;

                if (event.entry.type === 'comment') {
                    data.parents = event.entry.parents;
                }
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
