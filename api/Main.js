const core = require('cyberway-core-service');
const { BasicMain } = core.services;
const env = require('../common/data/env');
const Connector = require('./services/Connector');

class Main extends BasicMain {
    constructor() {
        super(env);

        this.startMongoBeforeBoot();

        this.addNested(new Connector());
    }
}

module.exports = Main;
