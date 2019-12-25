const core = require('cyberway-core-service');
const { MongoDB } = core.services;

const { revertLog, revertLogIndexes } = require('./common');

module.exports = MongoDB.makeModel(
    'User',
    {
        userId: {
            type: String,
            required: true,
        },
        username: {
            type: String,
            required: true,
        },
        avatarUrl: {
            type: String,
            default: null,
        },
        notificationsViewedAt: {
            type: Date,
            default: null,
        },
        blockNum: {
            type: Number,
            required: true,
        },
        revertLog,
    },
    {
        index: [
            {
                fields: {
                    userId: 1,
                },
            },
            {
                fields: {
                    username: 1,
                },
            },
            ...revertLogIndexes,
        ],
    }
);
