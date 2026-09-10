const { parseMensagem } = require('../domain/orderPayload');
const { salvarPedido } = require('../repositories/orderWriteRepository');

async function ingerirMensagem(buffer, contexto = {}) {
  const pedido = parseMensagem(buffer);
  const resultado = await salvarPedido(pedido, contexto);
  return { ...resultado, pedido, mensagemId: contexto.mensagemId || null };
}

module.exports = { ingerirMensagem };
