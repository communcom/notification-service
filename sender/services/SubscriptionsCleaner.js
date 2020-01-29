const { difference } = require('lodash');
const core = require('cyberway-core-service');
const { Service } = core.services;
const { Logger } = core.utils;

const SubscriptionModel = require('../../common/models/Subscription');
const { getConnector } = require('../utils/processStore');

const CLEAN_EVERY_MS = 60 * 60 * 1000;

class SubscriptionsCleaner extends Service {
    async start() {
        this._interval = setInterval(() => {
            this._currentTick = this._tick().catch(err => {
                Logger.warn('SubscriptionsCleaner tick failed:', err);
            });
        }, CLEAN_EVERY_MS);
    }

    async stop() {
        this._stop = true;
        clearInterval(this._interval);

        await this._currentTick;
    }

    async _tick() {
        const date = new Date();
        date.setHours(date.getHours() - 1);

        while (true) {
            const subscriptions = await SubscriptionModel.find(
                {
                    actualizedAt: {
                        $lt: date,
                    },
                },
                {
                    channelId: true,
                },
                {
                    limit: 100,
                }
            );

            if (!subscriptions.length) {
                break;
            }

            const con = getConnector();

            const channelsIds = subscriptions.map(({ channelId }) => channelId);

            const checkDate = new Date();

            const { connected } = await con.callService('gate', 'checkChannels', {
                channelsIds,
            });

            const disconnected = difference(channelsIds, connected);

            await SubscriptionModel.deleteMany({
                channelId: { $in: disconnected },
            });

            await SubscriptionModel.update(
                {
                    channelId: { $in: connected },
                },
                {
                    $set: {
                        actualizedAt: checkDate,
                    },
                }
            );

            if (this._stop) {
                break;
            }
        }
    }
}

module.exports = SubscriptionsCleaner;
