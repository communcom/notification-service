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
        blockNum: {
            type: Number,
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
        ],
    }
);
