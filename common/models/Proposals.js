const core = require('cyberway-core-service');
const { MongoDB } = core.services;

module.exports = MongoDB.makeModel(
    'Proposals',
    {
        communityId: {
            type: String,
            required: true,
        },
        proposer: {
            type: String,
            required: true,
        },
        proposalId: {
            type: String,
            required: true,
        },
        type: {
            type: String,
            enum: ['banPost'],
            required: true,
        },
        blockTime: {
            type: Date,
            required: true,
        },
        expiration: {
            type: Date,
            required: true,
        },
        data: {
            type: Object,
        },
    },
    {
        index: [
            {
                fields: {
                    proposer: 1,
                    proposalId: 1,
                },
            },
        ],
    }
);
