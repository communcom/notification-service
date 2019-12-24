const core = require('cyberway-core-service');
const { MongoDB } = core.services;
const { revertLog, revertLogIndexes } = require('./common');

module.exports = MongoDB.makeModel(
    'Community',
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
                    communityId: 1,
                },
            },
            ...revertLogIndexes,
        ],
    }
);
