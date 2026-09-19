const path = require('path');

require('dotenv').config();

const rootDir = path.resolve(__dirname, '..', '..');

const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;

module.exports = {
  rootDir,
  db: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  },
  pubsub: {
    projectId: process.env.PUBSUB_PROJECT_ID,
    subscription: process.env.PUBSUB_SUBSCRIPTION,
    keyFilename: path.isAbsolute(credentials) ? credentials : path.resolve(rootDir, credentials)
  },
  api: {
    port: Number(process.env.API_PORT),
    defaultPageSize: 20,
    maxPageSize: 100
  }
};
