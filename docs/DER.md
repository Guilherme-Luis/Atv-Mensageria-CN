# DER — Banco de Dados `marketplace`

Modelo relacional que recebe os pedidos publicados no tópico `aula-pub` do Google Cloud Pub/Sub.

## Diagrama

```mermaid
erDiagram
    CLIENTE ||--o{ PEDIDO : "realiza"
    VENDEDOR ||--o{ PEDIDO : "vende"
    PEDIDO ||--o{ ITEM_PEDIDO : "contem"
    PEDIDO ||--o| PAGAMENTO : "possui"
    PEDIDO ||--o| ENTREGA : "possui"
    PRODUTO ||--o{ ITEM_PEDIDO : "referenciado_em"
    CATEGORIA ||--o{ ITEM_PEDIDO : "classifica"
    CATEGORIA ||--o{ ITEM_PEDIDO : "subclassifica"
    CATEGORIA ||--o{ CATEGORIA : "pai_de"

    CLIENTE {
        bigint id PK "customer.id do payload"
        varchar nome
        varchar email
        varchar documento
        datetime criado_em
        datetime atualizado_em
    }

    VENDEDOR {
        bigint id PK "seller.id do payload"
        varchar nome
        varchar cidade
        char estado
        datetime criado_em
        datetime atualizado_em
    }

    CATEGORIA {
        varchar id PK "ex: ELEC, PHONE"
        varchar nome
        varchar categoria_pai_id FK "auto-relacionamento"
        datetime criado_em
        datetime atualizado_em
    }

    PRODUTO {
        varchar id PK "product.id do payload"
        varchar titulo
        datetime criado_em
        datetime atualizado_em
    }

    PEDIDO {
        bigint id PK "surrogate key"
        varchar uuid UK "ORD-2025-0001"
        bigint cliente_id FK
        bigint vendedor_id FK
        varchar status
        varchar canal
        decimal valor_total "recalculado a cada ingestao"
        datetime criado_em_origem "created_at do payload"
        varchar metadata_source
        varchar metadata_user_agent
        varchar metadata_ip_address
        varchar mensagem_id "id da mensagem Pub/Sub"
        datetime indexado_em "hora da indexacao na base"
        datetime atualizado_em
    }

    ITEM_PEDIDO {
        bigint id PK
        bigint pedido_id FK
        bigint id_origem "items[].id do payload"
        varchar produto_id FK
        varchar categoria_id FK
        varchar subcategoria_id FK
        decimal preco_unitario
        int quantidade
        decimal valor_total "preco_unitario * quantidade"
        datetime criado_em
    }

    PAGAMENTO {
        bigint id PK
        bigint pedido_id FK "UNIQUE - 1:1 com pedido"
        varchar metodo "pix, credit_card, boleto"
        varchar status
        varchar transacao_id
        datetime atualizado_em
    }

    ENTREGA {
        bigint id PK
        bigint pedido_id FK "UNIQUE - 1:1 com pedido"
        varchar transportadora
        varchar servico
        varchar status
        varchar codigo_rastreio
        datetime atualizado_em
    }
```

## Cardinalidades

| Relacionamento | Cardinalidade | Observação |
|---|---|---|
| cliente → pedido | 1:N | um cliente tem vários pedidos |
| vendedor → pedido | 1:N | `vendedor_id` é opcional (payload pode não trazer `seller`) |
| pedido → item_pedido | 1:N | `ON DELETE CASCADE` |
| produto → item_pedido | 1:N | o mesmo produto aparece em vários pedidos |
| categoria → item_pedido | 1:N (duas vezes) | `categoria_id` e `subcategoria_id` apontam para a mesma tabela |
| categoria → categoria | 1:N | auto-relacionamento: `PHONE` tem `ELEC` como pai |
| pedido → pagamento | 1:1 | garantido por `UNIQUE (pedido_id)` |
| pedido → entrega | 1:1 | garantido por `UNIQUE (pedido_id)` |

## Decisões de modelagem

**Tabelas exigidas pelo enunciado.** `pedido`, `cliente`, `produto` e `item_pedido` existem com esses
nomes exatos. As demais (`vendedor`, `categoria`, `pagamento`, `entrega`) foram acrescentadas para
normalizar o restante do payload.

**Chave natural x chave substituta.** `cliente`, `vendedor`, `produto` e `categoria` usam o id que vem
no payload como chave primária, porque são identificadores estáveis do sistema de origem. `pedido` usa
um `id` auto-incremento com o `uuid` em índice `UNIQUE` — o `uuid` é a chave de negócio usada pela API
e a que garante a idempotência do consumidor.

**`indexado_em`.** Atende ao requisito "registre a hora que a mensagem foi indexada na base de dados".
É gravado a cada ingestão, junto com o `mensagem_id` da mensagem do Pub/Sub que originou a gravação.

**Categoria com auto-relacionamento.** O payload traz `category.sub_category` aninhada. Em vez de duas
tabelas quase idênticas, uma única tabela `categoria` referencia a si mesma por `categoria_pai_id`.
O item guarda as duas pontas (`categoria_id` e `subcategoria_id`) para permitir consulta direta por
qualquer um dos níveis.

**`valor_total` redundante.** O enunciado pede para gravar o total e recalculá-lo quando houver
alteração. Ele é persistido em `pedido.valor_total` e `item_pedido.valor_total`, recalculado a cada
mensagem recebida. A API, porém, **sempre soma dinamicamente** `preco_unitario * quantidade` na
consulta, de modo que o valor exibido não depende da coluna estar em dia.

**`status` como VARCHAR, não ENUM.** O enunciado lista `created, paid, shipped, delivered, canceled`,
mas o payload de exemplo usa `separated`. Um `ENUM` rejeitaria a mensagem do professor; o `VARCHAR`
aceita qualquer status e o `financial-summary` agrupa dinamicamente o que existir na base.

**`metadata` desnormalizado.** `source`, `user_agent` e `ip_address` são telemetria 1:1 com o pedido e
nunca são consultados isoladamente, então ficaram como colunas de `pedido`. Já `pagamento` e `entrega`
viraram tabelas próprias porque têm ciclo de vida e status independentes do pedido.
