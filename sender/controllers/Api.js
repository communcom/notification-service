const SubscriptionModel = require('../../common/models/Subscription');

class Api {
    async subscribe({ routing }, { userId }, { platform, clientType }) {
        let type;

        if (clientType === 'web') {
            type = 'web';
        } else {
            type = platform;
        }

        await SubscriptionModel.create({
            userId,
            type,
            channelId: routing.channelId,
            actualizedAt: new Date(),
        });
    }

    async unsubscribe({ routing }) {
        await SubscriptionModel.deleteOne({
            channelId: routing.channelId,
        });
    }
}

module.exports = Api;
