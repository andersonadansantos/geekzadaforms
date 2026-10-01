-- =====================================================================
--  GeekZada Forms - Esquema unico de inscricoes
--  Banco: geekzada   |   Motor: MySQL 8 / MariaDB 10.4+
--
--  Todos os formularios vivem no MESMO banco e sao separados pelo
--  par (form_submissions.id, form_submissions.form_id):
--
--    form_submissions  -> tabela mestra, gera o ID e guarda o log
--                         unificado + o payload bruto (data_json)
--    <form>_registrations -> tabela tipada de cada formulario,
--                         com id = FK para form_submissions.id
--
--  Ou seja: um unico ID distingue os formularios, mas cada um
--  mantem suas colunas proprias (necessario para o export Excel).
-- =====================================================================

CREATE DATABASE IF NOT EXISTS `geekzada`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `geekzada`;

-- ---------------------------------------------------------------------
-- 1. Catalogo de formularios (registra quais formularios existem)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `form_catalog` (
  `form_key`   VARCHAR(32)  NOT NULL COMMENT 'Chave usada no front (ex.: kpop)',
  `label`      VARCHAR(64)  NOT NULL COMMENT 'Nome exibido no painel',
  `table_name` VARCHAR(64)  NOT NULL COMMENT 'Tabela de detalhe',
  `sort_order` INT          NOT NULL DEFAULT 0,
  `is_active`  TINYINT(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (`form_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 2. Tabela mestra: um registro por inscricao, de qualquer formulario
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `form_submissions` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `form_id`    VARCHAR(32)     NOT NULL COMMENT 'Formulario (kpop, arena, ...)',
  `created_at` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `ip_address` VARCHAR(45)     NULL,
  `user_agent` VARCHAR(255)    NULL,
  `data_json`  LONGTEXT        NULL COMMENT 'Payload original enviado pelo form',
  PRIMARY KEY (`id`),
  KEY `idx_submissions_form_created` (`form_id`, `created_at`),
  KEY `idx_submissions_created` (`created_at`),
  CONSTRAINT `fk_submissions_catalog`
    FOREIGN KEY (`form_id`) REFERENCES `form_catalog` (`form_key`)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 3. Detalhe: K-Pop
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `kpop_registrations` (
  `id`                BIGINT UNSIGNED NOT NULL COMMENT 'FK -> form_submissions.id',
  `group_name`        VARCHAR(150)  NULL,
  `category`          VARCHAR(100)  NULL,
  `fandom_name`       VARCHAR(150)  NULL,
  `whatsapp`          VARCHAR(45)   NULL,
  `email`             VARCHAR(150)  NULL,
  `birth_date`        VARCHAR(20)   NULL,
  `city_state`        VARCHAR(150)  NULL,
  `members_names`     TEXT          NULL,
  `members_ages`      VARCHAR(255)  NULL,
  `members_count`     INT           NULL,
  `duration`          VARCHAR(50)   NULL,
  `song_artist`       VARCHAR(150)  NULL,
  `social_links`      TEXT          NULL,
  `video_link`        VARCHAR(500)  NULL,
  `technical_needs`   TEXT          NULL,
  `image_release`     TINYINT(1)    NOT NULL DEFAULT 0,
  `rules_agreement`   TINYINT(1)    NOT NULL DEFAULT 0,
  `signature`         VARCHAR(150)  NULL,
  `created_at`        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_kpop_created` (`created_at`),
  CONSTRAINT `fk_kpop_submission`
    FOREIGN KEY (`id`) REFERENCES `form_submissions` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 4. Detalhe: Cosplayer Performance
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `cosplayer_registrations` (
  `id`                    BIGINT UNSIGNED NOT NULL COMMENT 'FK -> form_submissions.id',
  `full_name`             VARCHAR(150) NOT NULL,
  `artistic_name`         VARCHAR(150) NULL,
  `instagram_link`        VARCHAR(500) NULL,
  `email`                 VARCHAR(150) NULL,
  `phone`                 VARCHAR(45)  NULL,
  `rg`                    VARCHAR(45)  NULL,
  `cpf`                   VARCHAR(45)  NULL,
  `character_name_origin` TEXT         NULL,
  `created_at`            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cosplayer_created` (`created_at`),
  CONSTRAINT `fk_cosplayer_submission`
    FOREIGN KEY (`id`) REFERENCES `form_submissions` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 5. Detalhe: Arena Gamer
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `arena_registrations` (
  `id`            BIGINT UNSIGNED NOT NULL COMMENT 'FK -> form_submissions.id',
  `name`          VARCHAR(150) NOT NULL,
  `email`         VARCHAR(150) NULL,
  `whatsapp`      VARCHAR(45)  NULL,
  `birth_date`    VARCHAR(20)  NULL,
  `bairro`        VARCHAR(120) NULL,
  `city`          VARCHAR(120) NULL,
  `identification` VARCHAR(255) NULL COMMENT 'Identidades selecionadas',
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_arena_created` (`created_at`),
  CONSTRAINT `fk_arena_submission`
    FOREIGN KEY (`id`) REFERENCES `form_submissions` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 6. Detalhe: Imprensa
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `press_registrations` (
  `id`                 BIGINT UNSIGNED NOT NULL COMMENT 'FK -> form_submissions.id',
  `full_name`          VARCHAR(150)  NOT NULL,
  `badge_name`         VARCHAR(150)  NULL,
  `document`           VARCHAR(45)   NULL,
  `whatsapp`           VARCHAR(45)   NULL,
  `email`              VARCHAR(150)  NULL,
  `media_outlet`       VARCHAR(150)  NULL,
  `media_type`         VARCHAR(100)  NULL,
  `role`               VARCHAR(100)  NULL,
  `city_state`         VARCHAR(150)  NULL,
  `link`               VARCHAR(500)  NULL,
  `coverage_type`      TEXT          NULL,
  `special_credential` TEXT          NULL,
  `equipment`          TEXT          NULL,
  `responsibility_term` TINYINT(1)   NOT NULL DEFAULT 0,
  `image_release`      TINYINT(1)    NOT NULL DEFAULT 0,
  `rules_agreement`    TINYINT(1)    NOT NULL DEFAULT 0,
  `signature`          VARCHAR(150)  NULL,
  `created_at`         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_press_created` (`created_at`),
  CONSTRAINT `fk_press_submission`
    FOREIGN KEY (`id`) REFERENCES `form_submissions` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 7. Detalhe: Estandistas / Expositores
--    Campos *_json guardam listas multiplas (mantidas como JSON).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `estandista_registrations` (
  `id`                        BIGINT UNSIGNED NOT NULL COMMENT 'FK -> form_submissions.id',
  `company_name`              VARCHAR(150)  NOT NULL,
  `razao_social`              VARCHAR(200)  NULL,
  `document`                  VARCHAR(45)   NULL,
  `responsible_name`          VARCHAR(150)  NULL,
  `whatsapp`                  VARCHAR(45)   NULL,
  `email`                     VARCHAR(150)  NULL,
  `portfolio_link`            VARCHAR(500)  NULL,
  `category`                  VARCHAR(100)  NULL,
  `segment_description`       TEXT          NULL,
  `main_products_json`        TEXT          NULL COMMENT 'Lista de produtos (JSON)',
  `average_price`             VARCHAR(100)  NULL,
  `target_audience`           TEXT          NULL COMMENT 'Opcoes marcadas',
  `target_audience_other`     VARCHAR(255)  NULL,
  `previous_events_participation` TINYINT(1) NOT NULL DEFAULT 0,
  `previous_events_details`   TEXT          NULL,
  `food_flagship`             VARCHAR(100)  NULL,
  `food_options_json`         TEXT          NULL COMMENT 'Opcoes de comida (JSON)',
  `food_needs_json`           TEXT          NULL COMMENT 'Necesidades alimentares (JSON)',
  `space_size`                VARCHAR(50)   NULL,
  `space_size_custom`         VARCHAR(100)  NULL,
  `structure_type`            VARCHAR(100)  NULL,
  `energy_need`               VARCHAR(100)  NULL,
  `energy_equipment_count`    INT           NULL,
  `staff_count`               VARCHAR(50)   NULL,
  `staff_justification`       TEXT          NULL,
  `differential`              TEXT          NULL,
  `interactive_experiences_json` TEXT      NULL COMMENT 'Experiencias (JSON)',
  `interactive_experiences_other` VARCHAR(255) NULL,
  `declaration_true`          TINYINT(1)    NOT NULL DEFAULT 0,
  `declaration_curatorship`   TINYINT(1)    NOT NULL DEFAULT 0,
  `created_at`                DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_estandista_created` (`created_at`),
  CONSTRAINT `fk_estandista_submission`
    FOREIGN KEY (`id`) REFERENCES `form_submissions` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 8. Detalhe: Usina Geek
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `usinageek_registrations` (
  `id`             BIGINT UNSIGNED NOT NULL COMMENT 'FK -> form_submissions.id',
  `name`           VARCHAR(150) NOT NULL,
  `email`          VARCHAR(150) NULL,
  `whatsapp`       VARCHAR(45)  NULL,
  `birth_date`     VARCHAR(20)  NULL,
  `bairro`         VARCHAR(120) NULL,
  `city`           VARCHAR(120) NULL,
  `identification` VARCHAR(255) NULL,
  `image_release`  TINYINT(1)  NOT NULL DEFAULT 0,
  `rules_agreement` TINYINT(1)  NOT NULL DEFAULT 0,
  `created_at`     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_usinageek_created` (`created_at`),
  CONSTRAINT `fk_usinageek_submission`
    FOREIGN KEY (`id`) REFERENCES `form_submissions` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 9. Visao unificada: todos os formularios em uma unica consulta
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW `v_all_submissions` AS
SELECT
  s.`id`            AS `id`,
  s.`form_id`       AS `form_id`,
  c.`label`         AS `form_label`,
  s.`created_at`    AS `created_at`,
  s.`ip_address`    AS `ip_address`,
  k.`group_name`    AS `group_name`,
  k.`whatsapp`      AS `whatsapp`,
  k.`email`         AS `email`,
  cp.`full_name`    AS `cosplayer_name`,
  a.`name`          AS `arena_name`,
  pr.`full_name`    AS `press_name`,
  e.`company_name`  AS `company_name`,
  u.`name`          AS `usinageek_name`
FROM `form_submissions` s
JOIN `form_catalog` c ON c.`form_key` = s.`form_id`
LEFT JOIN `kpop_registrations`      k  ON k.`id`  = s.`id`
LEFT JOIN `cosplayer_registrations` cp ON cp.`id` = s.`id`
LEFT JOIN `arena_registrations`     a  ON a.`id`  = s.`id`
LEFT JOIN `press_registrations`     pr ON pr.`id` = s.`id`
LEFT JOIN `estandista_registrations` e ON e.`id`  = s.`id`
LEFT JOIN `usinageek_registrations` u  ON u.`id`  = s.`id`;

-- ---------------------------------------------------------------------
-- 10. Catalogo inicial
-- ---------------------------------------------------------------------
INSERT INTO `form_catalog` (`form_key`, `label`, `table_name`, `sort_order`) VALUES
  ('kpop',           'K-Pop',              'kpop_registrations',      1),
  ('cosplayerperf',  'Cosplayer Perf.',    'cosplayer_registrations', 2),
  ('arena',          'Arena Gamer',         'arena_registrations',     3),
  ('imprensa',       'Imprensa',            'press_registrations',     4),
  ('estandista',     'Expositores',         'estandista_registrations',5),
  ('usinageek',      'Usina Geek',          'usinageek_registrations', 6)
ON DUPLICATE KEY UPDATE
  `label`      = VALUES(`label`),
  `table_name` = VALUES(`table_name`),
  `sort_order` = VALUES(`sort_order`);

-- ---------------------------------------------------------------------
-- 11. Usuarios do painel administrativo
--
--  role = 'superadmin'  -> ve todas as categorias e pode limpar tabelas
--  role = 'admin'       -> ve e apaga apenas a categoria em form_id
--
--  A senha nunca e gravada em texto puro. Guardamos duas representacoes:
--    password_hash -> hash bcrypt, e o que realmente valida o login;
--    password_crypt -> copia cifrada com AES-256-GCM, para que o superadmin
--                      consiga exibir a senha do acesso na aba "Acessos".
--  A copia so pode ser lida com a chave de api/.secret.key. Sem essa chave
--  o login continua funcionando (o hash basta), mas a senha nao aparece.
--  Os usuarios iniciais sao criados por api/seed_admin.php, que tambem
--  calcula o hash e a copia cifrada de forma segura.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `admin_users` (
  `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `username`      VARCHAR(64)  NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL COMMENT 'Hash gerado por password_hash()',
  `password_crypt` VARCHAR(255) NULL COMMENT 'Senha cifrada em AES-256-GCM: iv(12)+tag(16)+texto, em base64',
  `display_name`  VARCHAR(120) NOT NULL,
  `role`          ENUM('superadmin', 'admin') NOT NULL DEFAULT 'admin',
  `form_id`       VARCHAR(32)  NULL COMMENT 'NULL apenas para superadmin',
  `is_active`     TINYINT(1)   NOT NULL DEFAULT 1,
  `must_change_password` TINYINT(1) NOT NULL DEFAULT 0,
  `last_login_at` DATETIME     NULL,
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_admin_username` (`username`),
  KEY `idx_admin_form` (`form_id`),
  CONSTRAINT `fk_admin_form`
    FOREIGN KEY (`form_id`) REFERENCES `form_catalog` (`form_key`)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 11b. Migracao: installs criados antes da aba "Acessos" mostrar senhas
--
--  O CREATE TABLE acima ignora tabelas ja existentes, entao a coluna
--  password_crypt precisa ser adicionada a parte. Depois de rodar isto,
--  um "php api/seed_admin.php --reset" preenche a copia cifrada de todos.
--  A checagem em information_schema mantem o script seguro para rodar
--  varias vezes (o IF NOT EXISTS de ADD COLUMN so existe no MySQL 8.0.29+).
-- ---------------------------------------------------------------------
SET @col = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME   = 'admin_users'
     AND COLUMN_NAME  = 'password_crypt'
);
SET @sql = IF(@col = 0,
  'ALTER TABLE `admin_users` ADD COLUMN `password_crypt` VARCHAR(255) NULL
     COMMENT ''Senha cifrada em AES-256-GCM: iv(12)+tag(16)+texto, em base64''
     AFTER `password_hash`',
  'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------
-- 12. Sessoes do painel
--
--  Guarda-se apenas o hash SHA-256 do token, nunca o token em si, para
--  que um dump da tabela nao permita forjar uma sessao.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `admin_sessions` (
  `token_hash` CHAR(64)     NOT NULL COMMENT 'sha256 do token enviado ao front',
  `user_id`    INT UNSIGNED NOT NULL,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` DATETIME     NOT NULL,
  PRIMARY KEY (`token_hash`),
  KEY `idx_session_user` (`user_id`),
  KEY `idx_session_expires` (`expires_at`),
  CONSTRAINT `fk_session_user`
    FOREIGN KEY (`user_id`) REFERENCES `admin_users` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 13. Registro de acessos (auditoria do painel)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `admin_audit_log` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`    INT UNSIGNED    NULL,
  `username`   VARCHAR(64)     NULL,
  `action`     VARCHAR(48)     NOT NULL,
  `detail`     VARCHAR(255)    NULL,
  `ip_address` VARCHAR(45)     NULL,
  `created_at` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_user` (`user_id`),
  KEY `idx_audit_created` (`created_at`),
  CONSTRAINT `fk_audit_user`
    FOREIGN KEY (`user_id`) REFERENCES `admin_users` (`id`)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
