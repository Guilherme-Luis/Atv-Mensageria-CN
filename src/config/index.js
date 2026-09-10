const path = require('path');

require('dotenv').config();

const rootDir = path.resolve(__dirname, '..', '..');

const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS || './sa-grupo-j-key.json';

module.exports = {
  rootDir,
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'marketplace'
  },
  pubsub: {
    projectId: process.env.PUBSUB_PROJECT_ID || 'serjava-demo',
    subscription: process.env.PUBSUB_SUBSCRIPTION || 'grupo-j',
    keyFilename: path.isAbsolute(credentials) ? credentials : path.resolve(rootDir, credentials)
  },
  api: {
    port: Number(process.env.API_PORT || 3000),
    defaultPageSize: 20,
    maxPageSize: 100
  }
};
