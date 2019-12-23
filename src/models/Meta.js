const core = require('cyberway-core-service');
const { MongoDB } = core.services;

module.exports = MongoDB.makeModel('Meta', {
    lastBlockNum: {
        type: Number,
    },
    lastBlockSequence: {
        type: Number,
    },
});
