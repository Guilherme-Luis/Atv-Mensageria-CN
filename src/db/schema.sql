CREATE TABLE IF NOT EXISTS cliente (
  id BIGINT UNSIGNED NOT NULL,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) NULL,
  documento VARCHAR(32) NULL,
  criado_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  atualizado_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_cliente_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS vendedor (
  id BIGINT UNSIGNED NOT NULL,
  nome VARCHAR(255) NOT NULL,
  cidade VARCHAR(255) NULL,
  estado CHAR(2) NULL,
  criado_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  atualizado_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS categoria (
  id VARCHAR(64) NOT NULL,
  nome VARCHAR(255) NOT NULL,
  categoria_pai_id VARCHAR(64) NULL,
  criado_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  atualizado_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_categoria_pai (categoria_pai_id),
  CONSTRAINT fk_categoria_pai FOREIGN KEY (categoria_pai_id) REFERENCES categoria (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS produto (
  id VARCHAR(64) NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  criado_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  atualizado_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pedido (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  uuid VARCHAR(64) NOT NULL,
  cliente_id BIGINT UNSIGNED NOT NULL,
  vendedor_id BIGINT UNSIGNED NULL,
  status VARCHAR(32) NOT NULL,
  canal VARCHAR(64) NULL,
  valor_total DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  criado_em_origem DATETIME(3) NULL,
  metadata_source VARCHAR(64) NULL,
  metadata_user_agent VARCHAR(512) NULL,
  metadata_ip_address VARCHAR(45) NULL,
  mensagem_id VARCHAR(128) NULL,
  indexado_em DATETIME(3) NOT NULL,
  atualizado_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_pedido_uuid (uuid),
  KEY idx_pedido_cliente (cliente_id),
  KEY idx_pedido_vendedor (vendedor_id),
  KEY idx_pedido_status (status),
  KEY idx_pedido_criado_em_origem (criado_em_origem),
  CONSTRAINT fk_pedido_cliente FOREIGN KEY (cliente_id) REFERENCES cliente (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_pedido_vendedor FOREIGN KEY (vendedor_id) REFERENCES vendedor (id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS item_pedido (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  pedido_id BIGINT UNSIGNED NOT NULL,
  id_origem BIGINT UNSIGNED NULL,
  produto_id VARCHAR(64) NOT NULL,
  categoria_id VARCHAR(64) NULL,
  subcategoria_id VARCHAR(64) NULL,
  preco_unitario DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  quantidade INT UNSIGNED NOT NULL DEFAULT 0,
  valor_total DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  criado_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_item_pedido_pedido (pedido_id),
  KEY idx_item_pedido_produto (produto_id),
  KEY idx_item_pedido_categoria (categoria_id),
  KEY idx_item_pedido_subcategoria (subcategoria_id),
  CONSTRAINT fk_item_pedido_pedido FOREIGN KEY (pedido_id) REFERENCES pedido (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_item_pedido_produto FOREIGN KEY (produto_id) REFERENCES produto (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_item_pedido_categoria FOREIGN KEY (categoria_id) REFERENCES categoria (id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_item_pedido_subcategoria FOREIGN KEY (subcategoria_id) REFERENCES categoria (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pagamento (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  pedido_id BIGINT UNSIGNED NOT NULL,
  metodo VARCHAR(32) NULL,
  status VARCHAR(32) NULL,
  transacao_id VARCHAR(128) NULL,
  atualizado_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_pagamento_pedido (pedido_id),
  KEY idx_pagamento_metodo (metodo),
  CONSTRAINT fk_pagamento_pedido FOREIGN KEY (pedido_id) REFERENCES pedido (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS entrega (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  pedido_id BIGINT UNSIGNED NOT NULL,
  transportadora VARCHAR(64) NULL,
  servico VARCHAR(64) NULL,
  status VARCHAR(32) NULL,
  codigo_rastreio VARCHAR(64) NULL,
  atualizado_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_entrega_pedido (pedido_id),
  CONSTRAINT fk_entrega_pedido FOREIGN KEY (pedido_id) REFERENCES pedido (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
