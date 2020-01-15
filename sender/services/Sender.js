const fs = require('fs');
const mq = require('amqplib');
const fcm = require('firebase-admin');
const core = require('cyberway-core-service');
const { Service } = core.services;
const { Logger } = core.utils;

const env = require('../data/env');
const { getConnector } = require('../utils/processStore');
const SubscriptionModel = require('../models/Subscription');

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

        const [tokens, sockets] = await Promise.all([
            this._getFcm(userId),
            this._getSockets(userId),
        ]);

        if (!tokens.length && !sockets.length) {
            return;
        }

        const con = getConnector();

        const notification = await con.callService('notifications', 'getNotification', { id });

        if (sockets.length) {
            try {
                await this._sendSocketNotification(notification, sockets);
            } catch (err) {
                Logger.warn('Notification sending via socket failed:', err);
            }
        }

        if (tokens.length) {
            try {
                await this._sendPush(notification, tokens);
            } catch (err) {
                Logger.warn('Notification sending via push failed:', err);
            }
        }
    }

    async _getFcm(userId) {
        try {
            const con = getConnector();

            const { tokens } = await con.callService('settings', 'getUserFcmTokens', {
                userId,
            });

            return tokens.map(({ fcmToken }) => fcmToken);
        } catch (err) {
            Logger.error('settings.getUserFcmTokens failed:', err);
            return [];
        }
    }

    async _getSockets(userId) {
        try {
            const channels = await SubscriptionModel.find(
                { userId },
                { channelId: true },
                { lean: true }
            );

            if (!channels.length) {
                return [];
            }

            const con = getConnector();

            const { connected } = await con.callService('gate', 'checkChannels', {
                channelsIds: channels.map(channel => channel.channelId),
            });

            return connected;
        } catch (err) {
            Logger.error('gate.checkChannels failed:', err);
            return [];
        }
    }

    async _sendSocketNotification(notification, channels) {
        const con = getConnector();

        await Promise.all(
            channels.map(async channelId => {
                try {
                    await con.callService('gate', 'transfer', {
                        channelId,
                        method: 'notifications.newNotification',
                        data: notification,
                    });
                } catch (err) {
                    // 1105 - значит что клиент закрыл соединение
                    if (err.code === 1105) {
                        SubscriptionModel.deleteOne({
                            channelId,
                        }).catch(() => {});
                        return;
                    }

                    Logger.error(`Notification to channel: (${channelId}) failed:`, err);
                }
            })
        );
    }

    async _sendPush(notification, tokens) {
        const message = {
            tokens,
            data: {
                notification: JSON.stringify(notification),
            },
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

            case 'reply':
                return `${notification.author.username} left a comment: “${entry.shortText}”`;

            case 'subscribe':
                return `${notification.user.username} is following you`;

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
