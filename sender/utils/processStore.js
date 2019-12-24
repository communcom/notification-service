const store = {
    connector: null,
    sender: null,
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

function setSender(sender) {
    store.sender = sender;
}

function getSender() {
    if (!store.sender) {
        throw new Error('Sender is not existed');
    }

    return store.sender;
}

module.exports = {
    setConnector,
    getConnector,
    setSender,
    getSender,
};
