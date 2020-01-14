const core = require('cyberway-core-service');
const { MongoDB } = core.services;

const { contentId, revertLog, revertLogIndexes } = require('./common');

module.exports = MongoDB.makeModel(
    'Publication',
    {
        id: {
            type: String,
            require: true,
        },
        type: {
            type: String,
            enum: ['post', 'comment'],
        },
        contentId,
        shortText: {
            type: String,
        },
        imageUrl: {
            type: String,
        },
        parents: {
            type: Object,
        },
        replySentToUserId: {
            type: String,
        },
        mentioned: [
            {
                type: String,
                required: true,
            },
        ],
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
                    id: 1,
                },
                options: {
                    unique: true,
                },
            },
            ...revertLogIndexes,
        ],
    }
);
