const core = require('cyberway-core-service');
const { MongoDB } = core.services;

module.exports = MongoDB.makeModel(
    'CommunityBlock',
    {
        userId: {
            type: String,
            required: true,
        },
        blockCommunityId: {
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
                    blockCommunityId: 1,
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
