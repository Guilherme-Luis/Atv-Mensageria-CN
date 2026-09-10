const { round2 } = require('../../domain/money');

function iso(valor) {
  if (!valor) {
    return null;
  }
  return valor instanceof Date ? valor.toISOString() : new Date(valor).toISOString();
}

function apresentarCategoria(linha) {
  if (!linha.categoria_id) {
    return null;
  }

  const categoria = { id: linha.categoria_id, name: linha.categoria_nome };

  if (linha.subcategoria_id) {
    categoria.sub_category = { id: linha.subcategoria_id, name: linha.subcategoria_nome };
  }

  return categoria;
}

function apresentarItem(linha) {
  return {
    id: linha.id_origem === null ? Number(linha.id) : Number(linha.id_origem),
    product: {
      id: linha.produto_id,
      title: linha.produto_titulo
    },
    unit_price: round2(linha.preco_unitario),
    quantity: Number(linha.quantidade),
    category: apresentarCategoria(linha),
    total: round2(linha.total_calculado)
  };
}

function apresentarPedido(linha) {
  const itens = (linha.itens || []).map(apresentarItem);

  return {
    uuid: linha.uuid,
    created_at: iso(linha.criado_em_origem),
    channel: linha.canal,
    total: round2(linha.total_calculado),
    status: linha.status,
    customer: {
      id: Number(linha.cliente_id),
      name: linha.cliente_nome,
      email: linha.cliente_email,
      document: linha.cliente_documento
    },
    seller: linha.vendedor_id === null ? null : {
      id: Number(linha.vendedor_id),
      name: linha.vendedor_nome,
      city: linha.vendedor_cidade,
      state: linha.vendedor_estado
    },
    items: itens,
    shipment: linha.entrega_transportadora === null && linha.entrega_status === null ? null : {
      carrier: linha.entrega_transportadora,
      service: linha.entrega_servico,
      status: linha.entrega_status,
      tracking_code: linha.entrega_rastreio
    },
    payment: linha.pagamento_metodo === null && linha.pagamento_status === null ? null : {
      method: linha.pagamento_metodo,
      status: linha.pagamento_status,
      transaction_id: linha.pagamento_transacao
    },
    metadata: {
      source: linha.metadata_source,
      user_agent: linha.metadata_user_agent,
      ip_address: linha.metadata_ip_address
    },
    indexed_at: iso(linha.indexado_em)
  };
}

function apresentarItens(linha) {
  return (linha.itens || []).map(apresentarItem);
}

module.exports = { apresentarPedido, apresentarItens };
