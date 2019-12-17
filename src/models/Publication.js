const core = require('cyberway-core-service');
const { MongoDB } = core.services;

const contentId = {
    communityId: {
        type: String,
        required: true,
    },
    userId: {
        type: String,
        required: true,
    },
    permlink: {
        type: String,
        required: true,
    },
};

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
        mentioned: [
            {
                type: String,
                required: true,
            },
        ],
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
        ],
    }
);
