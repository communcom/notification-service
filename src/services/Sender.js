const mq = require('amqplib');
const { chunk } = require('lodash');
const core = require('cyberway-core-service');
const { Service } = core.services;

const env = require('../data/env');
const { setSender } = require('../utils/processStore');

const QUEUE_NAME = 'notifications';

class Sender extends Service {
    constructor() {
        super();

        this._mq = null;
        this._ch = null;

        setSender(this);
    }

    async start() {
        await super.start();

        this._mq = await mq.connect(env.GLS_MQ_CONNECT);
        this._ch = await this._mq.createChannel();
        await this._ch.assertQueue(QUEUE_NAME);
    }

    async processNotifications(notifications, blockTime) {
        for (const part of chunk(notifications, 50)) {
            await Promise.all(
                part.map(({ id, eventType, userId }) =>
                    this._ch.sendToQueue(
                        QUEUE_NAME,
                        Buffer.from(JSON.stringify({ id, eventType, userId, blockTime })),
                        {
                            expiration: 10 * 60 * 1000,
                        }
                    )
                )
            );
        }
    }
}

module.exports = Sender;
