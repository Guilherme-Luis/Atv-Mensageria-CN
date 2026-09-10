const config = require('../config');
const pool = require('../db/pool');
const consumidor = require('./subscriber');

consumidor.iniciar();

console.log(`Persistindo em ${config.db.host}:${config.db.port}/${config.db.database}`);

async function encerrar(sinal) {
  console.log(`\n${sinal} recebido. Encerrando consumidor...`);
  console.log(consumidor.resumo());

  try {
    await consumidor.parar();
    await pool.end();
  } catch (error) {
    console.error(`Erro ao encerrar: ${error.message}`);
  }

  process.exit(0);
}

process.on('SIGINT', () => encerrar('SIGINT'));
process.on('SIGTERM', () => encerrar('SIGTERM'));
