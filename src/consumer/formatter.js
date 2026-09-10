const dinheiro = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

function moeda(valor) {
  return `R$ ${dinheiro.format(Number(valor || 0))}`;
}

function corpo(buffer) {
  try {
    return JSON.stringify(JSON.parse(buffer.toString('utf8')), null, 2);
  } catch (error) {
    return buffer.toString('utf8');
  }
}

function formatarMensagem(buffer, resultado) {
  const cabecalho =
    `[${resultado.indexadoEm.toISOString()}] PUBSUB ${resultado.uuid} ` +
    `${resultado.criado ? 'inserido' : 'atualizado'} | ` +
    `total ${moeda(resultado.total)} | ` +
    `${resultado.pedido.itens.length} ${resultado.pedido.itens.length === 1 ? 'item' : 'itens'} | ` +
    `mensagem ${resultado.mensagemId || '-'}`;

  return `\n${cabecalho}\n${corpo(buffer)}\n`;
}

function formatarDescarte(buffer, mensagemId, motivo) {
  return `\n[${new Date().toISOString()}] PUBSUB mensagem ${mensagemId} descartada: ${motivo}\n${corpo(buffer)}\n`;
}

module.exports = { formatarMensagem, formatarDescarte, moeda };
