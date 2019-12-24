const core = require('cyberway-core-service');
const { BasicMain } = core.services;
const env = require('./data/env');
const Connector = require('./services/Connector');
const Prism = require('./services/Prism');
const Planner = require('./services/Planner');

class Main extends BasicMain {
    constructor() {
        super(env);

        this.startMongoBeforeBoot();

        this.addNested(new Connector(), new Planner(), new Prism());
    }
}

module.exports = Main;
