const core = require('cyberway-core-service');
const { MongoDB } = core.services;

module.exports = MongoDB.makeModel(
    'UserBlock',
    {
        userId: {
            type: String,
            required: true,
        },
        blockUserId: {
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
                    blockUserId: 1,
                },
                options: {
                    unique: true,
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
