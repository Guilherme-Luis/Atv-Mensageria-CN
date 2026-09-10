# Atividade de Mensageria - Computação em Nuvem

Consumidor do Google Cloud Pub/Sub que lê pedidos de um marketplace, grava no MySQL e disponibiliza
uma API REST para consulta.

## Requisitos

- Node.js 18 ou superior
- MySQL 8
- Arquivo `sa-grupo-j-key.json` na raiz do projeto (credencial da service account)

## Configuração

```bash
npm install
cp .env.example .env
npm run migrate
```

O `.env` guarda os dados de acesso ao MySQL, a subscription do Pub/Sub e a porta da API.
O `migrate` cria o banco `marketplace` e as tabelas.

## Executando

```bash
npm start          # sobe a API e escuta a subscription no mesmo processo
npm run consumer   # sobe apenas o consumidor, sem a API
```

O `npm start` já deixa o consumidor escutando, então um terminal só resolve. O console mostra as
requisições recebidas e os pedidos que chegam do Pub/Sub:

```
API disponivel em http://localhost:3000
Documentacao em http://localhost:3000/docs
Banco: localhost:3306/marketplace
Escutando projects/serjava-demo/subscriptions/grupo-j

==========================================================================
  PEDIDO ORD-2025-0001  [INSERIDO]
==========================================================================
  Recebido    01/10/2025 10:15:03 UTC
  Mensagem    15098036413456
  Criado em   01/10/2025 10:15:00 UTC
  Status      separated   (canal: mobile_app)
  Cliente     7788 - Maria Oliveira <maria@email.com>
  Vendedor    55 - Tech Store (São Paulo/SP)
  Pagamento   pix / approved  pay_987654321
  Entrega     Correios / SEDEX / shipped  BR123456789
--------------------------------------------------------------------------
  Itens       1 item
      2x  televisao bonita                R$ 2.500,00     R$ 5.000,00
         abc-1344  Eletrônicos > Smartphones
--------------------------------------------------------------------------
  TOTAL DO PEDIDO                                              R$ 5.000,00
==========================================================================

[2025-10-01T10:15:20.118Z] HTTP GET /orders?page=1 200 12.4ms
```

A base só recebe pedidos quando chega mensagem no tópico `aula-pub`.

## Documentação

Com a API no ar, a documentação Swagger fica em <http://localhost:3000/docs> e permite testar as
rotas pelo navegador. A especificação OpenAPI é servida em `/openapi.json` e o arquivo está em
[src/api/openapi.json](src/api/openapi.json).

## Endpoints

### GET /orders

Lista os pedidos paginados, no mesmo formato do payload recebido.

Parâmetros: `page`, `page_size`, `sort` (`created_at` ou `indexed_at`), `order` (`asc` ou `desc`).

Filtros: `customer.id`, `seller.id`, `product.id`, `status`.

```bash
curl "http://localhost:3000/orders?page=1&page_size=10&order=desc"
curl "http://localhost:3000/orders?customer.id=7788&status=paid"
```

### GET /orders/{uuid}

Retorna um pedido específico.

### GET /orders/{uuid}/items

Retorna apenas os itens do pedido.

### GET /orders/financial-summary

Totais consolidados, com contagem por status e por forma de pagamento.
Aceita os filtros `seller.id`, `start_date` e `end_date` (formato `YYYY-MM-DD`).

```bash
curl "http://localhost:3000/orders/financial-summary?seller.id=55&start_date=2025-10-01&end_date=2025-10-31"
```

### GET /health

Checa se a API e o banco estão respondendo.

## Banco de dados

Tabelas: `cliente`, `vendedor`, `categoria`, `produto`, `pedido`, `item_pedido`, `pagamento` e
`entrega`. O DDL completo está em [src/db/schema.sql](src/db/schema.sql).

A coluna `pedido.indexado_em` guarda a hora em que a mensagem foi gravada no banco, e `pedido.uuid`
identifica o pedido de forma única. Como o Pub/Sub pode entregar a mesma mensagem mais de uma vez, a
gravação é feita por upsert nesse uuid, então reprocessar uma mensagem não duplica registros.

Os totais do pedido e de cada item são gravados no banco e recalculados a cada mensagem, mas a API
sempre soma `unit_price * quantity` na hora da consulta.

## Estrutura

```
src/
  api/            rotas, validação, resposta e especificação OpenAPI
  config/         leitura do .env
  consumer/       assinante do Pub/Sub (usado pela API e isolado)
  db/             schema, migração e pool de conexões
  domain/         validação e normalização do payload
  repositories/   escrita e leitura no MySQL
  services/       ligação entre a mensagem e a persistência
```
