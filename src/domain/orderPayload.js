const { InvalidPayloadError } = require('./errors');
const { round2, toAmount } = require('./money');

const STATUS_PADRAO = 'created';

function texto(value, tamanho) {
  if (value === null || value === undefined) {
    return null;
  }
  const resultado = String(value).trim();
  if (!resultado) {
    return null;
  }
  return tamanho ? resultado.slice(0, tamanho) : resultado;
}

function inteiro(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return Math.trunc(parsed);
}

function dataUtc(value) {
  if (!value) {
    return null;
  }
  const data = new Date(value);
  return Number.isNaN(data.getTime()) ? null : data;
}

function normalizarCategoria(raw) {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const id = texto(raw.id, 64);
  if (!id) {
    return null;
  }
  return { id, nome: texto(raw.name, 255) || id };
}

function normalizarItem(raw, posicao) {
  if (!raw || typeof raw !== 'object') {
    throw new InvalidPayloadError(`items[${posicao}] nao e um objeto`);
  }

  const produtoId = texto(raw.product && raw.product.id, 64);
  if (!produtoId) {
    throw new InvalidPayloadError(`items[${posicao}].product.id e obrigatorio`);
  }

  const quantidade = inteiro(raw.quantity);
  if (quantidade === null || quantidade < 0) {
    throw new InvalidPayloadError(`items[${posicao}].quantity invalido`);
  }

  const precoUnitario = toAmount(raw.unit_price);
  const categoria = normalizarCategoria(raw.category);
  const subcategoria = normalizarCategoria(raw.category && raw.category.sub_category);

  return {
    idOrigem: inteiro(raw.id),
    produto: {
      id: produtoId,
      titulo: texto(raw.product.title, 255) || produtoId
    },
    categoria,
    subcategoria,
    precoUnitario,
    quantidade,
    valorTotal: round2(precoUnitario * quantidade)
  };
}

function normalizarPedido(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new InvalidPayloadError('payload deve ser um objeto JSON');
  }

  const uuid = texto(raw.uuid, 64);
  if (!uuid) {
    throw new InvalidPayloadError('uuid e obrigatorio');
  }

  if (!raw.customer || typeof raw.customer !== 'object') {
    throw new InvalidPayloadError('customer e obrigatorio');
  }

  const clienteId = inteiro(raw.customer.id);
  if (clienteId === null) {
    throw new InvalidPayloadError('customer.id e obrigatorio');
  }

  if (raw.items !== undefined && !Array.isArray(raw.items)) {
    throw new InvalidPayloadError('items deve ser uma lista');
  }

  const itens = (raw.items || []).map(normalizarItem);
  const vendedorId = raw.seller ? inteiro(raw.seller.id) : null;

  return {
    uuid,
    status: (texto(raw.status, 32) || STATUS_PADRAO).toLowerCase(),
    canal: texto(raw.channel, 64),
    criadoEmOrigem: dataUtc(raw.created_at),
    valorTotal: round2(itens.reduce((soma, item) => soma + item.valorTotal, 0)),
    cliente: {
      id: clienteId,
      nome: texto(raw.customer.name, 255) || `cliente-${clienteId}`,
      email: texto(raw.customer.email, 255),
      documento: texto(raw.customer.document, 32)
    },
    vendedor: vendedorId === null ? null : {
      id: vendedorId,
      nome: texto(raw.seller.name, 255) || `vendedor-${vendedorId}`,
      cidade: texto(raw.seller.city, 255),
      estado: texto(raw.seller.state, 2)
    },
    itens,
    pagamento: raw.payment && typeof raw.payment === 'object' ? {
      metodo: texto(raw.payment.method, 32),
      status: texto(raw.payment.status, 32),
      transacaoId: texto(raw.payment.transaction_id, 128)
    } : null,
    entrega: raw.shipment && typeof raw.shipment === 'object' ? {
      transportadora: texto(raw.shipment.carrier, 64),
      servico: texto(raw.shipment.service, 64),
      status: texto(raw.shipment.status, 32),
      codigoRastreio: texto(raw.shipment.tracking_code, 64)
    } : null,
    metadata: raw.metadata && typeof raw.metadata === 'object' ? {
      source: texto(raw.metadata.source, 64),
      userAgent: texto(raw.metadata.user_agent, 512),
      ipAddress: texto(raw.metadata.ip_address, 45)
    } : null
  };
}

function parseMensagem(buffer) {
  let raw;
  try {
    raw = JSON.parse(buffer.toString('utf8'));
  } catch (error) {
    throw new InvalidPayloadError(`JSON invalido: ${error.message}`);
  }
  return normalizarPedido(raw);
}

module.exports = { normalizarPedido, parseMensagem, STATUS_PADRAO };
