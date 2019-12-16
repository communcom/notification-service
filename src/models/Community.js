const core = require('cyberway-core-service');
const { MongoDB } = core.services;

module.exports = MongoDB.makeModel(
    'User',
    {
        communityId: {
            type: String,
            required: true,
        },
        name: {
            type: String,
            required: true,
        },
        alias: {
            type: String,
            required: true,
        },
        avatarUrl: {
            type: String,
        },
        blockNum: {
            type: Number,
            required: true,
        },
        revertLog: {
            type: [
                {
                    blockNum: {
                        type: Number,
                        required: true,
                    },
                    data: {
                        type: Object,
                        required: true,
                    },
                },
            ],
            default: [],
            required: true,
        },
    },
    {
        index: [
            {
                fields: {
                    communityId: 1,
                },
            },
            {
                fields: {
                    blockNum: 1,
                },
            },
            {
                fields: {
                    'revertLog.blockNum': 1,
                },
            },
        ],
    }
);
