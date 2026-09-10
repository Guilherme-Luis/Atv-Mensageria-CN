const fs = require('fs');
const path = require('path');

const pool = require('../src/db/pool');
const { ingerirPayload } = require('../src/services/ingestOrder');

const STATUS = ['created', 'paid', 'shipped', 'delivered', 'canceled'];
const METODOS = ['pix', 'credit_card', 'boleto'];
const CANAIS = ['web', 'mobile_app', 'marketplace'];

const CLIENTES = [
  { id: 7788, name: 'Maria Oliveira', email: 'maria@email.com', document: '987.654.321-00' },
  { id: 49494, name: 'João Pereira', email: 'joao@email.com', document: '123.456.789-00' },
  { id: 30211, name: 'Ana Souza', email: 'ana@email.com', document: '555.444.333-22' },
  { id: 88102, name: 'Carlos Lima', email: 'carlos@email.com', document: '111.222.333-44' }
];

const VENDEDORES = [
  { id: 55, name: 'Tech Store', city: 'São Paulo', state: 'SP' },
  { id: 91, name: 'Casa & Cia', city: 'Campinas', state: 'SP' },
  { id: 120, name: 'Mundo Games', city: 'Curitiba', state: 'PR' }
];

const PRODUTOS = [
  { id: 'abc-1344', title: 'televisao bonita', price: 2500.0, cat: ['ELEC', 'Eletrônicos'], sub: ['TV', 'Televisores'] },
  { id: 'xyz-9080', title: 'fone de ouvido', price: 349.9, cat: ['ELEC', 'Eletrônicos'], sub: ['AUDIO', 'Áudio'] },
  { id: 'hom-5521', title: 'cafeteira italiana', price: 189.9, cat: ['HOME', 'Casa'], sub: ['KITCHEN', 'Cozinha'] },
  { id: 'gam-7742', title: 'controle sem fio', price: 429.0, cat: ['GAME', 'Games'], sub: ['ACC', 'Acessórios'] },
  { id: 'liv-3310', title: 'livro de arquitetura', price: 129.5, cat: ['BOOK', 'Livros'], sub: ['TECH', 'Tecnologia'] }
];

function sortear(lista) {
  return lista[Math.floor(Math.random() * lista.length)];
}

function gerarPedido(indice) {
  const cliente = sortear(CLIENTES);
  const vendedor = sortear(VENDEDORES);
  const quantidadeItens = 1 + Math.floor(Math.random() * 3);
  const data = new Date(Date.UTC(2025, 9, 1 + (indice % 28), 8 + (indice % 12), (indice * 7) % 60));

  const items = [];
  for (let i = 0; i < quantidadeItens; i += 1) {
    const produto = sortear(PRODUTOS);
    if (items.some(item => item.product.id === produto.id)) {
      continue;
    }
    items.push({
      id: items.length + 1,
      product: { id: produto.id, title: produto.title },
      unit_price: produto.price,
      quantity: 1 + Math.floor(Math.random() * 3),
      category: {
        id: produto.cat[0],
        name: produto.cat[1],
        sub_category: { id: produto.sub[0], name: produto.sub[1] }
      }
    });
  }

  const metodo = sortear(METODOS);

  return {
    uuid: `ORD-2025-${String(1000 + indice).padStart(4, '0')}`,
    created_at: data.toISOString(),
    channel: sortear(CANAIS),
    status: sortear(STATUS),
    customer: cliente,
    seller: vendedor,
    items,
    shipment: {
      carrier: sortear(['Correios', 'Jadlog', 'Loggi']),
      service: sortear(['SEDEX', 'PAC', 'Expresso']),
      status: sortear(['created', 'shipped', 'delivered']),
      tracking_code: `BR${String(100000000 + indice)}`
    },
    payment: {
      method: metodo,
      status: 'approved',
      transaction_id: `pay_${String(900000000 + indice)}`
    },
    metadata: {
      source: 'seed',
      user_agent: 'seed-script/1.0',
      ip_address: '127.0.0.1'
    }
  };
}

function carregarSamples() {
  const dir = path.resolve(__dirname, '..', 'samples');
  if (!fs.existsSync(dir)) {
    return [];
  }
  return fs
    .readdirSync(dir)
    .filter(nome => nome.endsWith('.json'))
    .sort()
    .map(nome => JSON.parse(fs.readFileSync(path.join(dir, nome), 'utf8')));
}

async function seed() {
  const extras = Number(process.argv[2] || 0);
  const payloads = carregarSamples();

  for (let i = 1; i <= extras; i += 1) {
    payloads.push(gerarPedido(i));
  }

  let inseridos = 0;
  let atualizados = 0;

  for (const payload of payloads) {
    const resultado = await ingerirPayload(payload, { mensagemId: 'seed-local' });
    if (resultado.criado) {
      inseridos += 1;
    } else {
      atualizados += 1;
    }
    console.log(`${resultado.uuid} -> ${resultado.criado ? 'inserido' : 'atualizado'} (R$ ${resultado.total.toFixed(2)})`);
  }

  console.log(`\nTotal: ${payloads.length} pedidos (${inseridos} inseridos, ${atualizados} atualizados)`);
  await pool.end();
}

seed().catch(async error => {
  console.error('Falha no seed:', error.message);
  await pool.end();
  process.exit(1);
});
