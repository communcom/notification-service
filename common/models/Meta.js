const core = require('cyberway-core-service');
const { MongoDB } = core.services;

module.exports = MongoDB.makeModel('Meta', {
    lastBlockNum: {
        type: Number,
        default: null,
    },
    lastBlockSequence: {
        type: Number,
        default: null,
    },
    lastNotificationBlockNum: {
        type: Number,
        default: null,
    },
});
