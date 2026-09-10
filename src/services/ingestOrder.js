const { parseMensagem } = require('../domain/orderPayload');
const { salvarPedido } = require('../repositories/orderWriteRepository');

async function ingerirMensagem(buffer, contexto = {}) {
  const pedido = parseMensagem(buffer);
  return salvarPedido(pedido, contexto);
}

module.exports = { ingerirMensagem };
