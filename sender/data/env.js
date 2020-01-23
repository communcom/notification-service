const env = process.env;

module.exports = {
    GLS_NOTIFICATIONS_CONNECT: env.GLS_NOTIFICATIONS_CONNECT || 'localhost:3000',
    GLS_PRISM_CONNECT: env.GLS_PRISM_CONNECT,
    GLS_PRISM_API_CONNECT: env.GLS_PRISM_API_CONNECT || env.GLS_PRISM_CONNECT,
    GLS_SETTINGS_CONNECT: env.GLS_SETTINGS_CONNECT || null,
    GLS_GATE_CONNECT: env.GLS_GATE_CONNECT || null,
    GLS_MQ_CONNECT: env.GLS_MQ_CONNECT || 'amqp://localhost',
    FIREBASE_AUTH_FILE: env.FIREBASE_AUTH_FILE || './auth-firebase-adminsdk.json',
};
