const express = require('express');

const config = require('../../config');
const { round2 } = require('../../domain/money');
const repositorio = require('../../repositories/orderReadRepository');
const { apresentarPedido, apresentarItens } = require('../presenters/orderPresenter');
const {
  inteiroPositivo,
  inteiroOpcional,
  textoOpcional,
  dataOpcional,
  opcaoValida,
  primeiroDefinido
} = require('../validation');

const router = express.Router();

function extrairFiltros(query) {
  const filtros = {};

  const customerId = inteiroOpcional(primeiroDefinido(query['customer.id'], query.customer_id), 'customer.id');
  if (customerId !== undefined) {
    filtros.customerId = customerId;
  }

  const sellerId = inteiroOpcional(primeiroDefinido(query['seller.id'], query.seller_id), 'seller.id');
  if (sellerId !== undefined) {
    filtros.sellerId = sellerId;
  }

  const productId = textoOpcional(primeiroDefinido(query['product.id'], query.product_id));
  if (productId !== undefined) {
    filtros.productId = productId;
  }

  const status = textoOpcional(query.status);
  if (status !== undefined) {
    filtros.status = status.toLowerCase();
  }

  return filtros;
}

function filtrosAplicados(filtros) {
  const aplicados = {};
  if (filtros.customerId !== undefined) {
    aplicados['customer.id'] = filtros.customerId;
  }
  if (filtros.sellerId !== undefined) {
    aplicados['seller.id'] = filtros.sellerId;
  }
  if (filtros.productId !== undefined) {
    aplicados['product.id'] = filtros.productId;
  }
  if (filtros.status !== undefined) {
    aplicados.status = filtros.status;
  }
  return aplicados;
}

router.get('/', async (req, res, next) => {
  try {
    const page = inteiroPositivo(req.query.page, 'page', 1);
    const pageSize = inteiroPositivo(
      primeiroDefinido(req.query.page_size, req.query.limit),
      'page_size',
      config.api.defaultPageSize,
      config.api.maxPageSize
    );
    const sort = opcaoValida(req.query.sort, 'sort', ['created_at', 'indexed_at'], 'created_at');
    const order = opcaoValida(req.query.order, 'order', ['asc', 'desc'], 'desc');
    const filtros = extrairFiltros(req.query);

    const { total, pedidos } = await repositorio.listarPedidos({ filtros, page, pageSize, sort, order });
    const totalPages = pageSize > 0 ? Math.ceil(total / pageSize) : 0;

    res.json({
      data: pedidos.map(apresentarPedido),
      pagination: {
        page,
        page_size: pageSize,
        total_items: total,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_previous: page > 1
      },
      sort: { field: sort, order },
      filters: filtrosAplicados(filtros)
    });
  } catch (error) {
    next(error);
  }
});

router.get('/financial-summary', async (req, res, next) => {
  try {
    const filtros = {};

    const sellerId = inteiroOpcional(primeiroDefinido(req.query['seller.id'], req.query.seller_id), 'seller.id');
    if (sellerId !== undefined) {
      filtros.sellerId = sellerId;
    }

    const startDate = dataOpcional(primeiroDefinido(req.query.start_date, req.query.from), 'start_date', false);
    if (startDate !== undefined) {
      filtros.startDate = startDate;
    }

    const endDate = dataOpcional(primeiroDefinido(req.query.end_date, req.query.to), 'end_date', true);
    if (endDate !== undefined) {
      filtros.endDate = endDate;
    }

    const { geral, porStatus, porPagamento } = await repositorio.resumoFinanceiro(filtros);

    const byStatus = {};
    for (const linha of porStatus) {
      byStatus[linha.status] = Number(linha.quantidade);
    }

    const byPaymentMethod = {};
    for (const linha of porPagamento) {
      byPaymentMethod[linha.metodo] = {
        count: Number(linha.quantidade),
        total: round2(linha.total)
      };
    }

    res.json({
      total_orders: Number(geral.total_orders),
      total_revenue: round2(geral.total_revenue),
      average_order_value: round2(geral.average_order_value),
      by_status: byStatus,
      by_payment_method: byPaymentMethod,
      filters: {
        'seller.id': filtros.sellerId === undefined ? null : filtros.sellerId,
        start_date: filtros.startDate ? filtros.startDate.toISOString() : null,
        end_date: filtros.endDate ? filtros.endDate.toISOString() : null
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:uuid', async (req, res, next) => {
  try {
    const pedido = await repositorio.buscarPedidoPorUuid(req.params.uuid);

    if (!pedido) {
      return res.status(404).json({
        error: { code: 'ORDER_NOT_FOUND', message: `Pedido "${req.params.uuid}" nao encontrado` }
      });
    }

    res.json(apresentarPedido(pedido));
  } catch (error) {
    next(error);
  }
});

router.get('/:uuid/items', async (req, res, next) => {
  try {
    const pedido = await repositorio.buscarPedidoPorUuid(req.params.uuid);

    if (!pedido) {
      return res.status(404).json({
        error: { code: 'ORDER_NOT_FOUND', message: `Pedido "${req.params.uuid}" nao encontrado` }
      });
    }

    res.json({ uuid: pedido.uuid, items: apresentarItens(pedido) });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
