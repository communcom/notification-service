const core = require('cyberway-core-service');
const { MongoDB } = core.services;

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
                    userId: 1,
                },
            },
            {
                fields: {
                    username: 1,
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
