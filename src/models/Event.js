const core = require('cyberway-core-service');
const { MongoDB } = core.services;

module.exports = MongoDB.makeModel(
    'Event',
    {
        eventType: {
            type: String,
            required: true,
        },
        userId: {
            type: String,
            required: true,
        },
        initiatorUserId: {
            type: String,
            default: null,
        },
        timestamp: {
            type: Date,
            required: true,
        },
        blockNum: {
            type: Number,
            required: true,
        },
        data: {
            type: Object,
            required: true,
        },
    },
    {
        index: [
            {
                fields: {
                    userId: 1,
                    timestamp: -1,
                },
            },
            {
                fields: {
                    blockNum: 1,
                },
            },
        ],
    }
);
