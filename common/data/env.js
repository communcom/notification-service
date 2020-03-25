const env = process.env;

module.exports = {
    GLS_PRISM_CONNECT: env.GLS_PRISM_CONNECT,
    GLS_PRISM_API_CONNECT: env.GLS_PRISM_API_CONNECT || env.GLS_PRISM_CONNECT,
    GLS_GUARANTEED_BLOCK_NUM: parseInt(env.GLS_GUARANTEED_BLOCK_NUM, 10) || null,
    GLS_MQ_CONNECT: env.GLS_MQ_CONNECT || 'amqp://localhost',
    GLS_DISABLE_SENDING: Boolean(env.GLS_DISABLE_SENDING && env.GLS_DISABLE_SENDING !== 'false'),
    GLS_NATS_START: env.GLS_NATS_START || null,
    GLS_BOUNTY_ACCOUNT: env.GLS_BOUNTY_ACCOUNT || 'c.bounty',
};
