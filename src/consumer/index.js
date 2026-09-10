const { PubSub } = require('@google-cloud/pubsub');

const config = require('../config');
const pool = require('../db/pool');
const { InvalidPayloadError } = require('../domain/errors');
const { ingerirMensagem } = require('../services/ingestOrder');

const pubSubClient = new PubSub({
  projectId: config.pubsub.projectId,
  keyFilename: config.pubsub.keyFilename
});

const subscription = pubSubClient.subscription(config.pubsub.subscription, {
  flowControl: { maxMessages: 10 }
});

let processadas = 0;
let descartadas = 0;

async function tratarMensagem(message) {
  const indexadoEm = new Date();

  try {
    const resultado = await ingerirMensagem(message.data, {
      mensagemId: message.id,
      indexadoEm
    });

    processadas += 1;
    console.log(
      `[${indexadoEm.toISOString()}] pedido ${resultado.uuid} ${resultado.criado ? 'inserido' : 'atualizado'} ` +
      `(total R$ ${resultado.total.toFixed(2)}, mensagem ${message.id})`
    );
    message.ack();
  } catch (error) {
    if (error instanceof InvalidPayloadError) {
      descartadas += 1;
      console.error(`Mensagem ${message.id} descartada: ${error.message}`);
      console.error(`Conteudo: ${message.data.toString('utf8').slice(0, 500)}`);
      message.ack();
      return;
    }

    console.error(`Falha ao persistir a mensagem ${message.id}: ${error.message}`);
    message.nack();
  }
}

async function encerrar(sinal) {
  console.log(`\n${sinal} recebido. Encerrando consumidor...`);
  console.log(`Mensagens processadas: ${processadas} | descartadas: ${descartadas}`);
  try {
    await subscription.close();
    await pool.end();
  } catch (error) {
    console.error(`Erro ao encerrar: ${error.message}`);
  }
  process.exit(0);
}

subscription.on('message', tratarMensagem);
subscription.on('error', error => {
  console.error('Erro na assinatura:', error.message);
});

process.on('SIGINT', () => encerrar('SIGINT'));
process.on('SIGTERM', () => encerrar('SIGTERM'));

console.log(
  `Consumidor ativo em projects/${config.pubsub.projectId}/subscriptions/${config.pubsub.subscription}`
);
console.log(`Persistindo em ${config.db.host}:${config.db.port}/${config.db.database}`);
