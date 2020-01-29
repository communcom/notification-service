const core = require('cyberway-core-service');
const { Connector: BasicConnector } = core.services;
const env = require('../../common/data/env');
const { setConnector } = require('../utils/globals');

class Connector extends BasicConnector {
    constructor() {
        super();
        setConnector(this);
    }

    async start() {
        await super.start({
            serverRoutes: {},
            requiredClients: {
                prism: env.GLS_PRISM_CONNECT,
                prismApi: env.GLS_PRISM_API_CONNECT,
            },
        });
    }
}

module.exports = Connector;
