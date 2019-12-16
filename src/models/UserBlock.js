const core = require('cyberway-core-service');
const { MongoDB } = core.services;

module.exports = MongoDB.makeModel(
    'UserBlock',
    {
        useId: {
            type: String,
            required: true,
        },
        blockUseId: {
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
                    useId: 1,
                    blockUseId: 1,
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
