const mq = require('amqplib');
const core = require('cyberway-core-service');
const { Service } = core.services;
const { Logger } = core.utils;

const env = require('../data/env');
const { getConnector } = require('../utils/processStore');

const QUEUE_NAME = 'notifications';

class Sender extends Service {
    constructor() {
        super();

        this._mq = null;
        this._ch = null;
    }

    async start() {
        await super.start();

        this._mq = await mq.connect(env.GLS_MQ_CONNECT);
        this._ch = await this._mq.createChannel();
        await this._ch.assertQueue(QUEUE_NAME);

        this._ch.consume(QUEUE_NAME, async msg => {
            let data;

            try {
                data = JSON.parse(msg.content);
                await this._handleNotification(data, msg);
            } catch (err) {
                Logger.warn('Notification handling failed:', data);
                Logger.warn('Error:', err);
            }
        });
    }

    async _handleNotification({ id, eventType, userId }, msg) {
        this._ch.ack(msg);

        const con = getConnector();

        const { tokens } = await con.callService('settings', 'getUserFcmTokens', {
            userId,
        });

        console.log('tokens:', tokens);

        if (!tokens.length) {
            // return;
        }

        const notification = await con.callService('notifications', 'getNotification', { id });

        console.log('notification =', notification);
    }
}

module.exports = Sender;
