const UserSubscription = require('../models/Subscription');

class Api {
    async subscribe({ routing }, { userId }, { platform, clientType }) {
        let type;

        if (clientType === 'web') {
            type = 'web';
        } else {
            type = platform;
        }

        await UserSubscription.create({
            userId,
            type,
            channelId: routing.channelId,
        });
    }

    async unsubscribe({ routing }) {
        await UserSubscription.deleteOne({
            channelId: routing.channelId,
        });
    }
}

module.exports = Api;
