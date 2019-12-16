const core = require('cyberway-core-service');
const { Connector: BasicConnector } = core.services;
const env = require('../data/env');
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
                    validation: {
                        required: ['userId'],
                        properties: {
                            userId: {
                                type: 'string',
                            },
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
            },
            requiredClients: {},
        });
    }
}

module.exports = Connector;
