const env = process.env;

module.exports = {
    GLS_PRISM_CONNECT: env.GLS_PRISM_CONNECT,
    GLS_PRISM_API_CONNECT: env.GLS_PRISM_API_CONNECT || env.GLS_PRISM_CONNECT,
    GLS_GUARANTEED_BLOCK_NUM: parseInt(env.GLS_GUARANTEED_BLOCK_NUM, 10) || null,
};
