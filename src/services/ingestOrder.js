const { normalizarPedido, parseMensagem } = require('../domain/orderPayload');
const { salvarPedido } = require('../repositories/orderWriteRepository');

async function ingerirPayload(raw, contexto = {}) {
  const pedido = normalizarPedido(raw);
  return salvarPedido(pedido, contexto);
}

async function ingerirMensagem(buffer, contexto = {}) {
  const pedido = parseMensagem(buffer);
  return salvarPedido(pedido, contexto);
}

module.exports = { ingerirPayload, ingerirMensagem };
