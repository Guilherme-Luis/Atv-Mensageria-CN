const LARGURA = 74;

const dinheiro = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

function moeda(valor) {
  return `R$ ${dinheiro.format(Number(valor || 0))}`;
}

function dataHora(valor) {
  if (!valor) {
    return '-';
  }

  const data = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(data.getTime())) {
    return '-';
  }

  const partes = data.toISOString().split('T');
  return `${partes[0].split('-').reverse().join('/')} ${partes[1].slice(0, 8)} UTC`;
}

function linha(caractere) {
  return caractere.repeat(LARGURA);
}

function campo(rotulo, valor) {
  return `  ${rotulo.padEnd(12)}${valor}`;
}

function textoCliente(cliente) {
  const email = cliente.email ? ` <${cliente.email}>` : '';
  return `${cliente.id} - ${cliente.nome}${email}`;
}

function textoVendedor(vendedor) {
  if (!vendedor) {
    return '-';
  }

  const local = [vendedor.cidade, vendedor.estado].filter(Boolean).join('/');
  return `${vendedor.id} - ${vendedor.nome}${local ? ` (${local})` : ''}`;
}

function textoPagamento(pagamento) {
  if (!pagamento) {
    return '-';
  }

  const partes = [pagamento.metodo, pagamento.status].filter(Boolean).join(' / ');
  return `${partes || '-'}${pagamento.transacaoId ? `  ${pagamento.transacaoId}` : ''}`;
}

function textoEntrega(entrega) {
  if (!entrega) {
    return '-';
  }

  const partes = [entrega.transportadora, entrega.servico, entrega.status].filter(Boolean).join(' / ');
  return `${partes || '-'}${entrega.codigoRastreio ? `  ${entrega.codigoRastreio}` : ''}`;
}

function textoCategoria(item) {
  const nomes = [item.categoria && item.categoria.nome, item.subcategoria && item.subcategoria.nome];
  return nomes.filter(Boolean).join(' > ');
}

function linhasDosItens(itens) {
  if (!itens.length) {
    return [campo('Itens', 'nenhum item no pedido')];
  }

  const resultado = [campo('Itens', `${itens.length} ${itens.length === 1 ? 'item' : 'itens'}`)];

  for (const item of itens) {
    const titulo = item.produto.titulo.length > 28
      ? `${item.produto.titulo.slice(0, 27)}…`
      : item.produto.titulo;

    resultado.push(
      `    ${String(item.quantidade).padStart(3)}x  ${titulo.padEnd(29)}` +
      `${moeda(item.precoUnitario).padStart(14)}${moeda(item.valorTotal).padStart(16)}`
    );

    const categoria = textoCategoria(item);
    if (categoria) {
      resultado.push(`         ${item.produto.id}  ${categoria}`);
    }
  }

  return resultado;
}

function formatarPedido(pedido, resultado) {
  const acao = resultado.criado ? 'INSERIDO' : 'ATUALIZADO';

  return [
    '',
    linha('='),
    `  PEDIDO ${pedido.uuid}  [${acao}]`,
    linha('='),
    campo('Recebido', dataHora(resultado.indexadoEm)),
    campo('Mensagem', resultado.mensagemId || '-'),
    campo('Criado em', dataHora(pedido.criadoEmOrigem)),
    campo('Status', `${pedido.status}${pedido.canal ? `   (canal: ${pedido.canal})` : ''}`),
    campo('Cliente', textoCliente(pedido.cliente)),
    campo('Vendedor', textoVendedor(pedido.vendedor)),
    campo('Pagamento', textoPagamento(pedido.pagamento)),
    campo('Entrega', textoEntrega(pedido.entrega)),
    linha('-'),
    ...linhasDosItens(pedido.itens),
    linha('-'),
    `  TOTAL DO PEDIDO${moeda(resultado.total).padStart(LARGURA - 17)}`,
    linha('='),
    ''
  ].join('\n');
}

module.exports = { formatarPedido, moeda, dataHora };
