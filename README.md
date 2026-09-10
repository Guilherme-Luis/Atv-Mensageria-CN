# Projeto Mensageria — Pedidos de Marketplace

Consumidor do **Google Cloud Pub/Sub** que lê pedidos de um marketplace, persiste em **MySQL** e
expõe uma **API REST** para consulta.

FATEC — Desenvolvimento de Software Multiplataforma — Computação em Nuvem 2 — grupo J.

## Arquitetura

```
                    Google Cloud Pub/Sub
  sistema de vendas ──► tópico aula-pub ──► subscription grupo-j
                                                   │
                                                   ▼
                                       ┌───────────────────────┐
                                       │  consumidor (Node.js) │
                                       │  valida → normaliza   │
                                       │  → persiste → ack     │
                                       └───────────┬───────────┘
                                                   ▼
                                          MySQL (marketplace)
                                                   ▲
                                       ┌───────────┴───────────┐
                                       │   API REST (Express)  │
                                       │        /orders        │
                                       └───────────────────────┘
```

O consumidor e a API são processos independentes: se a API cair, as mensagens continuam sendo
gravadas; se o consumidor cair, o Pub/Sub reentrega as mensagens não confirmadas.

## Requisitos

- Node.js 18+
- MySQL 8
- `sa-grupo-j-key.json` (credencial da service account) na raiz do projeto

## Configuração

```bash
npm install
cp .env.example .env      # ajuste usuário/senha do MySQL se necessário
npm run migrate           # cria o banco "marketplace" e todas as tabelas
```

Variáveis em `.env`:

| Variável | Padrão | Descrição |
|---|---|---|
| `DB_HOST` / `DB_PORT` | `localhost` / `3306` | MySQL |
| `DB_USER` / `DB_PASSWORD` | `root` / `123456` | credenciais |
| `DB_NAME` | `marketplace` | banco criado pelo `migrate` |
| `PUBSUB_PROJECT_ID` | `serjava-demo` | projeto no Google Cloud |
| `PUBSUB_SUBSCRIPTION` | `grupo-j` | subscription do grupo |
| `GOOGLE_APPLICATION_CREDENTIALS` | `./sa-grupo-j-key.json` | chave da service account |
| `API_PORT` | `3000` | porta da API |

## Como executar

```bash
npm run consumer    # consome do Pub/Sub e grava no MySQL
npm run api         # sobe a API em http://localhost:3000
npm run seed        # carrega os payloads de samples/ (demo sem depender do Pub/Sub)
npm run seed 25     # carrega os samples + 25 pedidos gerados
npm run listen      # subscriber simples da 1a fase (só imprime no console)
```

> A service account tem apenas `roles/pubsub.subscriber`, ou seja, **não é possível publicar** no
> tópico da turma. O `npm run seed` injeta payloads pelo mesmo caminho de código do consumidor
> (validação → normalização → persistência), o que permite demonstrar a API sem esperar o professor
> publicar.

## API

Todos os endpoints retornam JSON. Os totais (`total` do pedido e de cada item) são **calculados
dinamicamente** na consulta, a partir de `unit_price × quantity`.

### `GET /orders`

Lista paginada, no contrato do payload.

- **Paginação:** `page` (padrão `1`), `page_size` (padrão `20`, máximo `100`)
- **Ordenação:** `sort` = `created_at` | `indexed_at` (padrão `created_at`), `order` = `asc` | `desc` (padrão `desc`)
- **Filtros:** `customer.id`, `seller.id`, `product.id`, `status`

```bash
curl "http://localhost:3000/orders?page=1&page_size=10&sort=created_at&order=desc"
curl "http://localhost:3000/orders?customer.id=49494"
curl "http://localhost:3000/orders?seller.id=55&status=paid"
curl "http://localhost:3000/orders?product.id=abc-1344"
```

```json
{
  "data": [ { "uuid": "ORD-2025-0001", "total": 5000, "items": [] } ],
  "pagination": {
    "page": 1, "page_size": 10, "total_items": 28, "total_pages": 3,
    "has_next": true, "has_previous": false
  },
  "sort": { "field": "created_at", "order": "desc" },
  "filters": { "customer.id": 49494 }
}
```

### `GET /orders/{uuid}`

Retorna um pedido no mesmo contrato do payload recebido, acrescido de `indexed_at`.

```bash
curl "http://localhost:3000/orders/ORD-2025-0001"
```

### `GET /orders/{uuid}/items`

Somente a estrutura de itens, mantendo o formato do payload.

```bash
curl "http://localhost:3000/orders/ORD-2025-0001/items"
```

```json
{
  "uuid": "ORD-2025-0001",
  "items": [
    {
      "id": 1,
      "product": { "id": "abc-1344", "title": "televisao bonita" },
      "unit_price": 2500,
      "quantity": 2,
      "category": {
        "id": "ELEC", "name": "Eletrônicos",
        "sub_category": { "id": "PHONE", "name": "Smartphones" }
      },
      "total": 5000
    }
  ]
}
```

### `GET /orders/financial-summary`

**Filtros:** `seller.id`, `start_date`, `end_date` (aceitam `YYYY-MM-DD` ou ISO 8601; `end_date` em
formato de data cobre o dia inteiro).

```bash
curl "http://localhost:3000/orders/financial-summary"
curl "http://localhost:3000/orders/financial-summary?seller.id=55&start_date=2025-10-01&end_date=2025-10-10"
```

```json
{
  "total_orders": 28,
  "total_revenue": 82212,
  "average_order_value": 2936.14,
  "by_status": { "created": 2, "paid": 5, "shipped": 7, "delivered": 8, "canceled": 5 },
  "by_payment_method": {
    "pix": { "count": 11, "total": 35983.3 },
    "credit_card": { "count": 9, "total": 27234.6 },
    "boleto": { "count": 8, "total": 18994.1 }
  },
  "filters": { "seller.id": null, "start_date": null, "end_date": null }
}
```

### `GET /health`

Verifica a API e a conexão com o banco.

### Erros

| Código HTTP | Quando |
|---|---|
| `400` | parâmetro inválido (`page=0`, `sort=preco`, data malformada) |
| `404` | pedido inexistente ou rota inexistente |
| `500` | erro interno (detalhe fica no log, não na resposta) |

```json
{ "error": { "code": "ORDER_NOT_FOUND", "message": "Pedido ORD-X nao encontrado" } }
```

## Banco de dados

O diagrama e as decisões de modelagem estão em [docs/DER.md](docs/DER.md).
O DDL completo está em [src/db/schema.sql](src/db/schema.sql).

Tabelas: `cliente`, `vendedor`, `categoria`, `produto`, `pedido`, `item_pedido`, `pagamento`, `entrega`.

## Estrutura

```
src/
  api/
    routes/orders.js          rotas REST
    presenters/               linhas do banco -> contrato do payload
    validation.js             validação de query params
    server.js                 Express, /health, tratamento de erros
  config/                     leitura do .env
  consumer/index.js           assinante Pub/Sub -> persistência
  db/
    schema.sql                DDL
    migrate.js                cria banco e tabelas
    pool.js                   pool mysql2 (UTC, decimais numéricos)
  domain/
    orderPayload.js           validação e normalização do payload
    money.js                  arredondamento monetário
    errors.js                 InvalidPayloadError
  repositories/
    orderWriteRepository.js   upsert transacional
    orderReadRepository.js    consultas da API
  services/ingestOrder.js     ponte usada pelo consumidor e pelo seed
scripts/seed.js               carga local de demonstração
samples/                      payloads de exemplo
examples/listen-only.js       subscriber da 1a fase
docs/DER.md                   DER
```

## Decisões de implementação

**Idempotência.** O Pub/Sub entrega *pelo menos uma vez*. A gravação é um `UPSERT` pelo `uuid` dentro
de uma transação, e os itens são substituídos por completo — reprocessar a mesma mensagem não duplica
nada e reflete a versão mais recente do pedido.

**`ack` x `nack`.** Payload inválido (JSON quebrado, sem `uuid`, sem `product.id`) é registrado no log
e recebe `ack`: reentregar não resolveria e a mensagem travaria a fila. Falha de banco recebe `nack`,
para o Pub/Sub reentregar quando o banco voltar.

**Totais.** Persistidos (`valor_total`) e recalculados a cada mensagem, como pede o enunciado, mas a
API soma dinamicamente na consulta — o valor retornado nunca depende da coluna estar atualizada.

**Fuso horário.** O pool usa `timezone: 'Z'`; `created_at` entra e sai em UTC/ISO 8601, igual ao payload.

**Valores monetários.** `DECIMAL(14,2)` no banco. Em JSON são números — `5000.00` é serializado como
`5000`, porque JSON não preserva zeros à direita.

**`indexed_at` na resposta.** Campo adicional ao contrato do payload, para evidenciar o requisito de
registrar a hora de indexação.

## Entregáveis

| Item | Onde |
|---|---|
| Consumidor Pub/Sub → base relacional | `src/consumer/`, `src/repositories/orderWriteRepository.js` |
| Tabelas `pedido`, `cliente`, `produto`, `item_pedido` | `src/db/schema.sql` |
| Hora da indexação | `pedido.indexado_em` |
| API com paginação, ordenação e filtros | `src/api/routes/orders.js` |
| DER | [docs/DER.md](docs/DER.md) |
| Fontes no git | este repositório |
