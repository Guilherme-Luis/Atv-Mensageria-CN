const pool = require('../db/pool');
const { round2 } = require('../domain/money');

async function upsertCliente(conn, cliente) {
  await conn.execute(
    `INSERT INTO cliente (id, nome, email, documento) VALUES (?, ?, ?, ?) AS novo
     ON DUPLICATE KEY UPDATE nome = novo.nome, email = novo.email, documento = novo.documento`,
    [cliente.id, cliente.nome, cliente.email, cliente.documento]
  );
}

async function upsertVendedor(conn, vendedor) {
  if (!vendedor) {
    return;
  }
  await conn.execute(
    `INSERT INTO vendedor (id, nome, cidade, estado) VALUES (?, ?, ?, ?) AS novo
     ON DUPLICATE KEY UPDATE nome = novo.nome, cidade = novo.cidade, estado = novo.estado`,
    [vendedor.id, vendedor.nome, vendedor.cidade, vendedor.estado]
  );
}

async function upsertCategoria(conn, categoria, categoriaPaiId) {
  if (!categoria) {
    return null;
  }
  await conn.execute(
    `INSERT INTO categoria (id, nome, categoria_pai_id) VALUES (?, ?, ?) AS nova
     ON DUPLICATE KEY UPDATE nome = nova.nome, categoria_pai_id = COALESCE(nova.categoria_pai_id, categoria.categoria_pai_id)`,
    [categoria.id, categoria.nome, categoriaPaiId || null]
  );
  return categoria.id;
}

async function upsertProduto(conn, produto) {
  await conn.execute(
    `INSERT INTO produto (id, titulo) VALUES (?, ?) AS novo
     ON DUPLICATE KEY UPDATE titulo = novo.titulo`,
    [produto.id, produto.titulo]
  );
}

async function upsertPedido(conn, pedido, contexto) {
  const metadata = pedido.metadata || {};
  const [resultado] = await conn.execute(
    `INSERT INTO pedido (
       uuid, cliente_id, vendedor_id, status, canal, valor_total, criado_em_origem,
       metadata_source, metadata_user_agent, metadata_ip_address, mensagem_id, indexado_em
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) AS novo
     ON DUPLICATE KEY UPDATE
       cliente_id = novo.cliente_id,
       vendedor_id = novo.vendedor_id,
       status = novo.status,
       canal = novo.canal,
       valor_total = novo.valor_total,
       criado_em_origem = novo.criado_em_origem,
       metadata_source = novo.metadata_source,
       metadata_user_agent = novo.metadata_user_agent,
       metadata_ip_address = novo.metadata_ip_address,
       mensagem_id = novo.mensagem_id,
       indexado_em = novo.indexado_em`,
    [
      pedido.uuid,
      pedido.cliente.id,
      pedido.vendedor ? pedido.vendedor.id : null,
      pedido.status,
      pedido.canal,
      pedido.valorTotal,
      pedido.criadoEmOrigem,
      metadata.source || null,
      metadata.userAgent || null,
      metadata.ipAddress || null,
      contexto.mensagemId || null,
      contexto.indexadoEm
    ]
  );

  const [linhas] = await conn.execute('SELECT id FROM pedido WHERE uuid = ?', [pedido.uuid]);
  return { id: linhas[0].id, criado: resultado.affectedRows === 1 };
}

async function substituirItens(conn, pedidoId, itens) {
  await conn.execute('DELETE FROM item_pedido WHERE pedido_id = ?', [pedidoId]);

  for (const item of itens) {
    await upsertProduto(conn, item.produto);
    const categoriaId = await upsertCategoria(conn, item.categoria, null);
    const subcategoriaId = await upsertCategoria(conn, item.subcategoria, categoriaId);

    await conn.execute(
      `INSERT INTO item_pedido (
         pedido_id, id_origem, produto_id, categoria_id, subcategoria_id,
         preco_unitario, quantidade, valor_total
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        pedidoId,
        item.idOrigem,
        item.produto.id,
        categoriaId,
        subcategoriaId,
        item.precoUnitario,
        item.quantidade,
        item.valorTotal
      ]
    );
  }
}

async function upsertPagamento(conn, pedidoId, pagamento) {
  if (!pagamento) {
    return;
  }
  await conn.execute(
    `INSERT INTO pagamento (pedido_id, metodo, status, transacao_id) VALUES (?, ?, ?, ?) AS novo
     ON DUPLICATE KEY UPDATE metodo = novo.metodo, status = novo.status, transacao_id = novo.transacao_id`,
    [pedidoId, pagamento.metodo, pagamento.status, pagamento.transacaoId]
  );
}

async function upsertEntrega(conn, pedidoId, entrega) {
  if (!entrega) {
    return;
  }
  await conn.execute(
    `INSERT INTO entrega (pedido_id, transportadora, servico, status, codigo_rastreio) VALUES (?, ?, ?, ?, ?) AS nova
     ON DUPLICATE KEY UPDATE transportadora = nova.transportadora, servico = nova.servico,
       status = nova.status, codigo_rastreio = nova.codigo_rastreio`,
    [pedidoId, entrega.transportadora, entrega.servico, entrega.status, entrega.codigoRastreio]
  );
}

async function recalcularTotal(conn, pedidoId) {
  const [linhas] = await conn.execute(
    'SELECT COALESCE(SUM(preco_unitario * quantidade), 0) AS total FROM item_pedido WHERE pedido_id = ?',
    [pedidoId]
  );
  const total = round2(Number(linhas[0].total));
  await conn.execute('UPDATE pedido SET valor_total = ? WHERE id = ?', [total, pedidoId]);
  return total;
}

async function salvarPedido(pedido, contexto = {}) {
  const indexadoEm = contexto.indexadoEm || new Date();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    await upsertCliente(conn, pedido.cliente);
    await upsertVendedor(conn, pedido.vendedor);

    const { id, criado } = await upsertPedido(conn, pedido, {
      mensagemId: contexto.mensagemId,
      indexadoEm
    });

    await substituirItens(conn, id, pedido.itens);
    await upsertPagamento(conn, id, pedido.pagamento);
    await upsertEntrega(conn, id, pedido.entrega);

    const total = await recalcularTotal(conn, id);

    await conn.commit();

    return { id, uuid: pedido.uuid, criado, total, indexadoEm };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

module.exports = { salvarPedido };
