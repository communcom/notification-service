const core = require('cyberway-core-service');
const { Connector: BasicConnector } = core.services;

const env = require('../data/env');
const Api = require('../controllers/Api');
const { setConnector } = require('../utils/processStore');

class Connector extends BasicConnector {
    constructor() {
        super();

        this._api = new Api();

        setConnector(this);
    }

    async start() {
        await super.start({
            serverRoutes: {
                subscribe: {
                    handler: this._api.subscribe,
                    scope: this._api,
                    requireAuth: true,
                },
                unsubscribe: {
                    handler: this._api.unsubscribe,
                    scope: this._api,
                    requireAuth: true,
                },
            },
            requiredClients: {
                notifications: env.GLS_NOTIFICATIONS_CONNECT,
                prismApi: env.GLS_PRISM_API_CONNECT,
                settings: env.GLS_SETTINGS_CONNECT,
                gate: env.GLS_GATE_CONNECT,
            },
        });
    }
}

module.exports = Connector;
