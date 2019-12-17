const store = {
    connector: null,
};

function setConnector(connector) {
    store.connector = connector;
}

function getConnector() {
    if (!store.connector) {
        throw new Error('Connector is not existed');
    }

    return store.connector;
}

module.exports = {
    setConnector,
    getConnector,
};
