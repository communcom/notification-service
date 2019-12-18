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
                getNotifications: {
                    handler: this._api.getNotifications,
                    scope: this._api,
                    requireAuth: true,
                    validation: {
                        properties: {
                            offset: {
                                type: 'number',
                                default: 0,
                            },
                            limit: {
                                type: 'number',
                                default: 20,
                            },
                        },
                    },
                },
                getStatus: {
                    handler: this._api.getStatus,
                    scope: this._api,
                    requireAuth: true,
                },
                markAllAsSeen: {
                    handler: this._api.markAllAsSeen,
                    scope: this._api,
                    requireAuth: true,
                },
            },
            requiredClients: {
                prism: env.GLS_PRISM_CONNECT,
                prismApi: env.GLS_PRISM_API_CONNECT,
            },
        });
    }
}

module.exports = Connector;
