const core = require('cyberway-core-service');
const { MongoDB } = core.services;

module.exports = MongoDB.makeModel(
    'Event',
    {
        id: {
            type: String,
            required: true,
        },
        eventType: {
            type: String,
            required: true,
        },
        communityId: {
            type: String,
            default: null,
        },
        userId: {
            type: String,
            required: true,
        },
        initiatorUserId: {
            type: String,
            default: null,
        },
        referralUserId: {
            type: String,
            default: null,
        },
        publicationId: {
            type: String,
            default: null,
        },
        blockNum: {
            type: Number,
            required: true,
        },
        blockTime: {
            type: Date,
            required: true,
        },
        blockTimeCorrected: {
            type: Date,
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
                    blockTimeCorrected: -1,
                },
            },
            {
                fields: {
                    id: 1,
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
