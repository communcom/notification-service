const core = require('cyberway-core-service');
const { BasicMain } = core.services;
const env = require('./data/env');
const Connector = require('./services/Connector');
const Sender = require('./services/Sender');

class Main extends BasicMain {
    constructor() {
        super(env);

        this.addNested(new Connector(), new Sender());
    }
}

module.exports = Main;
