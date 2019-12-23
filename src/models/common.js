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
    username: {
        type: String,
    },
};

const revertLog = {
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
};

const revertLogIndexes = [
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
];

module.exports = {
    contentId,
    revertLog,
    revertLogIndexes,
};
