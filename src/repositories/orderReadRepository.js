const pool = require('../db/pool');

const CAMPOS_ORDENACAO = {
  created_at: 'p.criado_em_origem',
  indexed_at: 'p.indexado_em'
};

const COLUNAS_PEDIDO = `
  p.id, p.uuid, p.status, p.canal, p.valor_total, p.criado_em_origem, p.indexado_em,
  p.metadata_source, p.metadata_user_agent, p.metadata_ip_address,
  c.id AS cliente_id, c.nome AS cliente_nome, c.email AS cliente_email, c.documento AS cliente_documento,
  v.id AS vendedor_id, v.nome AS vendedor_nome, v.cidade AS vendedor_cidade, v.estado AS vendedor_estado,
  pg.metodo AS pagamento_metodo, pg.status AS pagamento_status, pg.transacao_id AS pagamento_transacao,
  e.transportadora AS entrega_transportadora, e.servico AS entrega_servico,
  e.status AS entrega_status, e.codigo_rastreio AS entrega_rastreio,
  (SELECT COALESCE(SUM(it.preco_unitario * it.quantidade), 0)
     FROM item_pedido it WHERE it.pedido_id = p.id) AS total_calculado`;

const JOINS_PEDIDO = `
  FROM pedido p
  JOIN cliente c ON c.id = p.cliente_id
  LEFT JOIN vendedor v ON v.id = p.vendedor_id
  LEFT JOIN pagamento pg ON pg.pedido_id = p.id
  LEFT JOIN entrega e ON e.pedido_id = p.id`;

function montarFiltros(filtros = {}) {
  const clausulas = [];
  const valores = [];

  if (filtros.customerId !== undefined) {
    clausulas.push('p.cliente_id = ?');
    valores.push(filtros.customerId);
  }
  if (filtros.sellerId !== undefined) {
    clausulas.push('p.vendedor_id = ?');
    valores.push(filtros.sellerId);
  }
  if (filtros.status !== undefined) {
    clausulas.push('p.status = ?');
    valores.push(filtros.status);
  }
  if (filtros.productId !== undefined) {
    clausulas.push('EXISTS (SELECT 1 FROM item_pedido i WHERE i.pedido_id = p.id AND i.produto_id = ?)');
    valores.push(filtros.productId);
  }
  if (filtros.startDate !== undefined) {
    clausulas.push('p.criado_em_origem >= ?');
    valores.push(filtros.startDate);
  }
  if (filtros.endDate !== undefined) {
    clausulas.push('p.criado_em_origem <= ?');
    valores.push(filtros.endDate);
  }

  return {
    where: clausulas.length ? `WHERE ${clausulas.join(' AND ')}` : '',
    valores
  };
}

async function buscarItens(pedidoIds) {
  if (!pedidoIds.length) {
    return new Map();
  }

  const [linhas] = await pool.query(
    `SELECT i.pedido_id, i.id, i.id_origem, i.preco_unitario, i.quantidade,
            (i.preco_unitario * i.quantidade) AS total_calculado,
            pr.id AS produto_id, pr.titulo AS produto_titulo,
            cat.id AS categoria_id, cat.nome AS categoria_nome,
            sub.id AS subcategoria_id, sub.nome AS subcategoria_nome
     FROM item_pedido i
     JOIN produto pr ON pr.id = i.produto_id
     LEFT JOIN categoria cat ON cat.id = i.categoria_id
     LEFT JOIN categoria sub ON sub.id = i.subcategoria_id
     WHERE i.pedido_id IN (?)
     ORDER BY i.pedido_id, i.id`,
    [pedidoIds]
  );

  const agrupado = new Map();
  for (const linha of linhas) {
    if (!agrupado.has(linha.pedido_id)) {
      agrupado.set(linha.pedido_id, []);
    }
    agrupado.get(linha.pedido_id).push(linha);
  }
  return agrupado;
}

async function listarPedidos({ filtros = {}, page = 1, pageSize = 20, sort = 'created_at', order = 'desc' }) {
  const { where, valores } = montarFiltros(filtros);
  const coluna = CAMPOS_ORDENACAO[sort] || CAMPOS_ORDENACAO.created_at;
  const direcao = order === 'asc' ? 'ASC' : 'DESC';
  const offset = (page - 1) * pageSize;

  const [contagem] = await pool.query(`SELECT COUNT(*) AS total ${JOINS_PEDIDO} ${where}`, valores);
  const total = Number(contagem[0].total);

  const [linhas] = await pool.query(
    `SELECT ${COLUNAS_PEDIDO} ${JOINS_PEDIDO} ${where}
     ORDER BY ${coluna} ${direcao}, p.id ${direcao}
     LIMIT ? OFFSET ?`,
    [...valores, pageSize, offset]
  );

  const itens = await buscarItens(linhas.map(linha => linha.id));

  return {
    total,
    pedidos: linhas.map(linha => ({ ...linha, itens: itens.get(linha.id) || [] }))
  };
}

async function buscarPedidoPorUuid(uuid) {
  const [linhas] = await pool.query(
    `SELECT ${COLUNAS_PEDIDO} ${JOINS_PEDIDO} WHERE p.uuid = ? LIMIT 1`,
    [uuid]
  );

  if (!linhas.length) {
    return null;
  }

  const itens = await buscarItens([linhas[0].id]);
  return { ...linhas[0], itens: itens.get(linhas[0].id) || [] };
}

async function resumoFinanceiro(filtros = {}) {
  const { where, valores } = montarFiltros(filtros);

  const cte = `
    WITH pedido_total AS (
      SELECT p.id, p.status, pg.metodo AS metodo_pagamento,
             (SELECT COALESCE(SUM(it.preco_unitario * it.quantidade), 0)
                FROM item_pedido it WHERE it.pedido_id = p.id) AS total
      ${JOINS_PEDIDO}
      ${where}
    )`;

  const [geral] = await pool.query(
    `${cte}
     SELECT COUNT(*) AS total_orders,
            COALESCE(SUM(total), 0) AS total_revenue,
            COALESCE(AVG(total), 0) AS average_order_value
     FROM pedido_total`,
    valores
  );

  const [porStatus] = await pool.query(
    `${cte} SELECT status, COUNT(*) AS quantidade FROM pedido_total GROUP BY status ORDER BY status`,
    valores
  );

  const [porPagamento] = await pool.query(
    `${cte}
     SELECT COALESCE(metodo_pagamento, 'unknown') AS metodo,
            COUNT(*) AS quantidade,
            COALESCE(SUM(total), 0) AS total
     FROM pedido_total GROUP BY metodo ORDER BY metodo`,
    valores
  );

  return { geral: geral[0], porStatus, porPagamento };
}

module.exports = { listarPedidos, buscarPedidoPorUuid, resumoFinanceiro };
