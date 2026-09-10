const express = require('express');

const config = require('../config');
const pool = require('../db/pool');
const ordersRouter = require('./routes/orders');

const app = express();

app.use(express.json());

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: config.db.database });
  } catch (error) {
    res.status(503).json({ status: 'unavailable', message: error.message });
  }
});

app.use('/orders', ordersRouter);

app.use((req, res) => {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: `Rota ${req.method} ${req.originalUrl} nao existe` }
  });
});

app.use((error, req, res, next) => {
  const status = error.status || 500;

  if (status >= 500) {
    console.error(error);
  }

  res.status(status).json({
    error: {
      code: status === 400 ? 'INVALID_REQUEST' : 'INTERNAL_ERROR',
      message: status >= 500 ? 'Erro interno ao processar a requisicao' : error.message
    }
  });
});

const server = app.listen(config.api.port, () => {
  console.log(`API disponivel em http://localhost:${config.api.port}`);
  console.log(`Banco: ${config.db.host}:${config.db.port}/${config.db.database}`);
});

async function encerrar(sinal) {
  console.log(`\n${sinal} recebido. Encerrando API...`);
  server.close();
  await pool.end();
  process.exit(0);
}

process.on('SIGINT', () => encerrar('SIGINT'));
process.on('SIGTERM', () => encerrar('SIGTERM'));

module.exports = app;
