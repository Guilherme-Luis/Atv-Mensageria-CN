const mysql = require('mysql2/promise');

const config = require('../config');

const pool = mysql.createPool({
  ...config.db,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: 'Z',
  decimalNumbers: true,
  dateStrings: false,
  charset: 'utf8mb4_unicode_ci'
});

module.exports = pool;
