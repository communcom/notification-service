const fs = require('fs');
const mq = require('amqplib');
const fcm = require('firebase-admin');
const core = require('cyberway-core-service');
const { Service } = core.services;
const { Logger } = core.utils;

const env = require('../data/env');
const { getConnector } = require('../utils/processStore');

const QUEUE_NAME = 'notifications';

const fcmAuth = JSON.parse(fs.readFileSync(env.FIREBASE_AUTH_FILE));

class Sender extends Service {
    constructor() {
        super();

        this._mq = null;
        this._channel = null;

        fcm.initializeApp({
            credential: fcm.credential.cert(fcmAuth),
            databaseURL: `https://${fcmAuth.project_id}.firebaseio.com`,
        });
    }

    async start() {
        await super.start();

        this._mq = await mq.connect(env.GLS_MQ_CONNECT);
        this._channel = await this._mq.createChannel();
        await this._channel.assertQueue(QUEUE_NAME);

        this._channel.consume(QUEUE_NAME, async msg => {
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
        this._channel.ack(msg);

        const con = getConnector();

        const { tokens } = await con.callService('settings', 'getUserFcmTokens', {
            userId,
        });

        if (!tokens.length) {
            return;
        }

        const notification = await con.callService('notifications', 'getNotification', { id });

        await this._sendPush(notification, tokens.map(({ fcmToken }) => fcmToken));
    }

    async _sendPush(notification, tokens) {
        const message = {
            tokens,
            data: notification,
            notification: {
                body: this._extractBody(notification),
            },
        };

        Logger.info('Try to send notification:', message);

        try {
            const response = await fcm.messaging().sendMulticast(message);
            Logger.info('FCM response:', response);
        } catch (err) {
            Logger.warn('Error sending message:', err);
        }
    }

    _extractBody(notification) {
        const entry = notification.comment || notification.post || null;

        switch (notification.eventType) {
            case 'upvote': {
                let text = `${notification.voter.username} liked your ${notification.entityType}`;

                if (entry.shortText) {
                    text += `: “${entry.shortText}”`;
                }

                return text;
            }

            case 'mention':
                return `${notification.author.username} mentioned you in a ${notification.entityType}: “${entry.shortText}”`;

            case 'subscribe':
                return `${notification.use.username} is following you`;

            default:
                Logger.error(
                    `Unknown notification type (${notification.eventType}):`,
                    notification
                );
                throw new Error('Invalid event type');
        }
    }
}

module.exports = Sender;
