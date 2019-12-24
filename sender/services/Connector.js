const core = require('cyberway-core-service');
const { Connector: BasicConnector } = core.services;
const env = require('../data/env');
const { setConnector } = require('../utils/processStore');

class Connector extends BasicConnector {
    constructor() {
        super();

        setConnector(this);
    }

    async start() {
        await super.start({
            serverRoutes: {},
            requiredClients: {
                notifications: env.GLS_NOTIFICATIONS_CONNECT,
                prismApi: env.GLS_PRISM_API_CONNECT,
                settings: env.GLS_SETTINGS_CONNECT,
            },
        });
    }
}

module.exports = Connector;
