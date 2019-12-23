const core = require('cyberway-core-service');
const { BasicMain } = core.services;
const env = require('./data/env');
const Connector = require('./services/Connector');
const Prism = require('./services/Prism');

class Main extends BasicMain {
    constructor() {
        super(env);

        this.startMongoBeforeBoot();

        this.addNested(new Prism(), new Connector());
    }
}

module.exports = Main;
