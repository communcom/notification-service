const core = require('cyberway-core-service');
const { BasicMain } = core.services;
const env = require('./data/env');
const Connector = require('./services/Connector');
const Prism = require('./services/Prism');
const Sender = require('./services/Sender');

class Main extends BasicMain {
    constructor() {
        super(env);

        this.startMongoBeforeBoot();

        this.addNested(new Connector(), new Sender(), new Prism());
    }
}

module.exports = Main;
