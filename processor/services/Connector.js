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
                            beforeThan: {
                                type: ['string', 'number', 'null'],
                                default: null,
                            },
                            limit: {
                                type: 'number',
                                default: 20,
                            },
                        },
                    },
                },
                // For services use only (not client api)
                getNotification: {
                    handler: this._api.getNotification,
                    scope: this._api,
                    validation: {
                        required: ['id'],
                        properties: {
                            id: {
                                type: 'string',
                            },
                        },
                    },
                },
                getStatus: {
                    handler: this._api.getStatus,
                    scope: this._api,
                    requireAuth: true,
                },
                markAllAsViewed: {
                    handler: this._api.markAllAsViewed,
                    scope: this._api,
                    requireAuth: true,
                    validation: {
                        required: ['until'],
                        properties: {
                            until: {
                                type: 'string',
                            },
                        },
                    },
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
