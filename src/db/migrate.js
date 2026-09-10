const fs = require('fs');
const path = require('path');

const mysql = require('mysql2/promise');

const config = require('../config');

async function migrate() {
  const { database, ...serverConfig } = config.db;
  const connection = await mysql.createConnection({
    ...serverConfig,
    multipleStatements: true,
    charset: 'utf8mb4_unicode_ci'
  });

  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await connection.changeUser({ database });

    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await connection.query(schema);

    const [tables] = await connection.query('SHOW TABLES');
    const nomes = tables.map(row => Object.values(row)[0]);

    console.log(`Banco "${database}" pronto.`);
    console.log(`Tabelas: ${nomes.join(', ')}`);
  } finally {
    await connection.end();
  }
}

migrate().catch(error => {
  console.error('Falha ao executar a migracao:', error.message);
  process.exit(1);
});
