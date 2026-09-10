const express = require('express');
const swaggerUi = require('swagger-ui-express');

const config = require('../config');
const consumidor = require('../consumer/subscriber');
const pool = require('../db/pool');
const openapi = require('./openapi.json');
const requestLogger = require('./requestLogger');
const ordersRouter = require('./routes/orders');

const app = express();

app.use(requestLogger);
app.use(express.json());

app.get('/openapi.json', (req, res) => {
  res.json(openapi);
});

app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapi, {
  customSiteTitle: 'API de Pedidos - Mensageria'
}));

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
  console.log(`Documentacao em http://localhost:${config.api.port}/docs`);
  console.log(`Banco: ${config.db.host}:${config.db.port}/${config.db.database}`);

  try {
    consumidor.iniciar();
  } catch (error) {
    console.error(`Consumidor nao iniciado: ${error.message}`);
    console.error('A API continua respondendo, mas nenhuma mensagem sera consumida.');
  }
});

async function encerrar(sinal) {
  console.log(`\n${sinal} recebido. Encerrando...`);
  console.log(consumidor.resumo());

  try {
    server.close();
    await consumidor.parar();
    await pool.end();
  } catch (error) {
    console.error(`Erro ao encerrar: ${error.message}`);
  }

  process.exit(0);
}

process.on('SIGINT', () => encerrar('SIGINT'));
process.on('SIGTERM', () => encerrar('SIGTERM'));

module.exports = app;
