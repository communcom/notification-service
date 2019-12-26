const core = require('cyberway-core-service');
const { BasicMain } = core.services;
const env = require('./data/env');
const Connector = require('./services/Connector');
const Sender = require('./services/Sender');
const SubscriptionsCleaner = require('./services/SubscriptionsCleaner');

class Main extends BasicMain {
    constructor() {
        super(env);

        this.startMongoBeforeBoot();

        this.addNested(new Connector(), new Sender(), new SubscriptionsCleaner());
    }
}

module.exports = Main;
