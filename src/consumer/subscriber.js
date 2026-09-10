const { PubSub } = require('@google-cloud/pubsub');

const config = require('../config');
const { InvalidPayloadError } = require('../domain/errors');
const { ingerirMensagem } = require('../services/ingestOrder');
const { formatarPedido } = require('./formatter');

const contadores = { processadas: 0, descartadas: 0, falhas: 0 };

let subscription = null;

async function tratarMensagem(message) {
  const indexadoEm = new Date();

  try {
    const resultado = await ingerirMensagem(message.data, {
      mensagemId: message.id,
      indexadoEm
    });

    contadores.processadas += 1;
    console.log(formatarPedido(resultado.pedido, resultado));
    message.ack();
  } catch (error) {
    if (error instanceof InvalidPayloadError) {
      contadores.descartadas += 1;
      console.error(`[${indexadoEm.toISOString()}] PUBSUB mensagem ${message.id} descartada: ${error.message}`);
      console.error(`[${indexadoEm.toISOString()}] PUBSUB conteudo: ${message.data.toString('utf8').slice(0, 500)}`);
      message.ack();
      return;
    }

    contadores.falhas += 1;
    console.error(`[${indexadoEm.toISOString()}] PUBSUB falha ao persistir ${message.id}: ${error.message}`);
    message.nack();
  }
}

function iniciar() {
  if (subscription) {
    return subscription;
  }

  const client = new PubSub({
    projectId: config.pubsub.projectId,
    keyFilename: config.pubsub.keyFilename
  });

  subscription = client.subscription(config.pubsub.subscription, {
    flowControl: { maxMessages: 10 }
  });

  subscription.on('message', tratarMensagem);
  subscription.on('error', error => {
    console.error(`[${new Date().toISOString()}] PUBSUB erro na assinatura: ${error.message}`);
  });

  console.log(
    `Escutando projects/${config.pubsub.projectId}/subscriptions/${config.pubsub.subscription}`
  );

  return subscription;
}

async function parar() {
  if (!subscription) {
    return;
  }

  await subscription.close();
  subscription = null;
}

function resumo() {
  return `processadas: ${contadores.processadas} | descartadas: ${contadores.descartadas} | falhas: ${contadores.falhas}`;
}

module.exports = { iniciar, parar, resumo, contadores };
