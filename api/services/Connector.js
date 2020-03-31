const core = require('cyberway-core-service');
const { Connector: BasicConnector } = core.services;

const { TYPES } = require('../../common/data/eventTypes');
const Api = require('../controllers/Api');

class Connector extends BasicConnector {
    constructor() {
        super();

        this._api = new Api();
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
                            filter: {
                                type: 'array',
                                items: {
                                    type: 'string',
                                    enum: ['all', ...Object.values(TYPES)],
                                },
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
                getStatusSystem: {
                    handler: this._api.getStatusSystem,
                    scope: this._api,
                    validation: {
                        required: ['userId'],
                        properties: {
                            userId: {
                                type: 'string',
                            },
                        },
                    },
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
            requiredClients: {},
        });
    }
}

module.exports = Connector;
