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
                $nin: blockingUsers.map(user => user.blockUseId),
            };
        }

        const events = await EventModel.find(
            match,
            { eventType: true, data: true, timestamp: true },
            {
                lean: true,
                skip: offset,
                limit,
                sort: { timestamp: -1 },
            }
        );

        return {
            items: events,
        };
    }
}

module.exports = Api;
