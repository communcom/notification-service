const core = require('cyberway-core-service');
const { MongoDB } = core.services;

module.exports = MongoDB.makeModel(
    'Subscription',
    {
        userId: {
            type: String,
            required: true,
        },
        type: {
            type: String,
            enum: ['web', 'ios', 'android'],
            required: true,
        },
        channelId: {
            type: String,
            required: true,
        },
        actualizedAt: {
            type: Date,
            required: true,
        },
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
                    channelId: 1,
                },
                options: {
                    unique: true,
                },
            },
            {
                fields: {
                    actualizedAt: 1,
                },
            },
        ],
    }
);
