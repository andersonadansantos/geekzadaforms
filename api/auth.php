<?php
/**
 * Autenticacao e autorizacao do painel administrativo.
 *
 * Dois papeis:
 *   superadmin -> enxerga todas as categorias e pode limpar tabelas
 *   admin      -> enxerga e apaga apenas a categoria em admin_users.form_id
 *
 * Como funciona:
 *   - No login e gerado um token aleatorio de 256 bits.
 *   - O front envia o token no cabecalho: Authorization: Bearer <token>
 *   - No banco so fica o SHA-256 do token (admin_sessions.token_hash),
 *     entao um dump da tabela nao permite forjar sessao.
 *   - A senha nunca e guardada em texto puro: password_hash / password_verify.
 */

declare(strict_types=1);

require_once __DIR__ . '/config.php';

// ---------------------------------------------------------------------
//  Cifragem das senhas que o superadmin consulta
//
//  Alem do hash bcrypt (que valida o login), guardamos uma copia cifrada
//  em AES-256-GCM para que o superadmin consiga ver a senha atual na aba
//  "Acessos" e repassar para o admin da categoria.
//
//  O formato gravado e: base64( iv | tag | ciphertext )
//
//  ATENCAO: isso torna as senhas reversiveis por quem tiver a chave. A
//  chave vive em api/.secret.key, bloqueado pelo .htaccess. Perder a
//  chave deixa as senhas cifradas ilegiveis e exige senha nova para
//  todos os acessos.
// ---------------------------------------------------------------------

/** Cifra uma senha para guardar no banco. */
function admin_encrypt(string $plain): ?string
{
    if (!admin_secret_ready()) {
        return null;
    }

    $iv     = random_bytes(12);                       // 96 bits, unico por senha
    $tag    = '';
    $cipher = openssl_encrypt(
        $plain,
        'aes-256-gcm',
        (string) ADMIN_SECRET_KEY,
        OPENSSL_RAW_DATA,
        $iv,
        $tag,
        '',
        16
    );

    if ($cipher === false) {
        return null;
    }

    return base64_encode($iv . $tag . $cipher);
}

/** Decifra uma senha guardada. Devolve null se nao der para abrir. */
function admin_decrypt(?string $payload): ?string
{
    if ($payload === null || $payload === '' || !admin_secret_ready()) {
        return null;
    }

    $bruto = base64_decode($payload, true);
    if ($bruto === false || strlen($bruto) < 28) {
        return null;                                   // iv(12) + tag(16) + algo
    }

    $iv      = substr($bruto, 0, 12);
    $tag     = substr($bruto, 12, 16);
    $cipher  = substr($bruto, 28);

    $plain = openssl_decrypt(
        $cipher,
        'aes-256-gcm',
        (string) ADMIN_SECRET_KEY,
        OPENSSL_RAW_DATA,
        $iv,
        $tag
    );

    return $plain === false ? null : $plain;
}

/** Grava hash + copia cifrada sempre juntas, para nao ficarem dessincronizadas. */
function admin_store_password(PDO $pdo, int $userId, string $plain, bool $mustChange = false): void
{
    $pdo->prepare(
        'UPDATE `admin_users`
            SET `password_hash` = ?, `password_crypt` = ?, `must_change_password` = ?
          WHERE `id` = ?'
    )->execute([
        password_hash($plain, PASSWORD_DEFAULT),
        admin_encrypt($plain),
        $mustChange ? 1 : 0,
        $userId,
    ]);
}

/** Validade da sessao do painel. */
const ADMIN_SESSION_TTL = 28800; // 8 horas

/** Quantas tentativas de login sao aceitas por janela de bloqueio. */
const ADMIN_MAX_ATTEMPTS = 8;

/** Janela de bloqueio de login, em segundos. */
const ADMIN_LOCK_WINDOW = 900; // 15 minutos

/** SHA-256 do token: e o que fica gravado no banco. */
function admin_token_hash(string $token): string
{
    return hash('sha256', $token);
}

/** Dados publicos do usuario, sem hash e sem forma de acessar outra categoria. */
function admin_public_user(array $row): array
{
    return [
        'username'      => $row['username'],
        'display_name'  => $row['display_name'],
        'role'          => $row['role'],
        'form_id'       => $row['form_id'],
        'is_superadmin' => $row['role'] === 'superadmin',
    ];
}

function admin_is_super(array $user): bool
{
    return $user['role'] === 'superadmin';
}

/** O usuario pode acessar esta categoria? */
function admin_can_access(array $user, string $formId): bool
{
    return admin_is_super($user) || $user['form_id'] === $formId;
}

/**
 * Lista de categorias que o usuario pode ver.
 * O superadmin recebe todas; o admin de categoria, apenas a dele.
 */
function admin_scope_forms(array $user): array
{
    if (admin_is_super($user)) {
        return array_keys(form_definitions());
    }
    return [$user['form_id']];
}

// ---------------------------------------------------------------------
//  Bloqueio por tentativas falhas
// ---------------------------------------------------------------------

/**
 * Quantas vezes este usuario errou a senha na janela recente.
 * Consultamos o audit_log, entao o estado vive no banco e nao no arquivo.
 */
function admin_failed_attempts(PDO $pdo, string $username): int
{
    $desde = date('Y-m-d H:i:s', time() - ADMIN_LOCK_WINDOW);

    $stmt = $pdo->prepare(
        "SELECT COUNT(*) FROM `admin_audit_log`
          WHERE `username` = ? AND `action` = 'login_failed' AND `created_at` >= ?"
    );
    $stmt->execute([$username, $desde]);

    return (int) $stmt->fetchColumn();
}

// ---------------------------------------------------------------------
//  Sessao
// ---------------------------------------------------------------------

/** Registra um evento no log de auditoria. */
function admin_audit(PDO $pdo, ?array $user, string $action, ?string $detail = null): void
{
    try {
        $pdo->prepare(
            'INSERT INTO `admin_audit_log` (`user_id`, `username`, `action`, `detail`, `ip_address`)
             VALUES (:uid, :uname, :act, :det, :ip)'
        )->execute([
            'uid'   => $user['id'] ?? null,
            'uname' => $user['username'] ?? ($detail ?? null),
            'act'   => $action,
            'det'   => $detail === null ? null : substr($detail, 0, 255),
            'ip'    => substr((string) ($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45),
        ]);
    } catch (Throwable $e) {
        // Auditoria nunca pode derrubar a operacao principal.
        error_log('[geekzada] falha na auditoria: ' . $e->getMessage());
    }
}

/**
 * Autentica e abre a sessao.
 *
 * @return array{token: string, user: array}
 */
function admin_login(PDO $pdo, string $username, string $password): array
{
    $username = trim($username);

    if ($username === '' || $password === '') {
        fail(400, 'Informe usuario e senha.');
    }

    // Trava por tentativas, antes mesmo de tocar no hash.
    if (admin_failed_attempts($pdo, $username) >= ADMIN_MAX_ATTEMPTS) {
        fail(429, 'Muitas tentativas de login. Aguarde 15 minutos e tente de novo.');
    }

    $stmt = $pdo->prepare(
        'SELECT `id`, `username`, `password_hash`, `password_crypt`, `display_name`, `role`, `form_id`, `is_active`
           FROM `admin_users` WHERE `username` = ?'
    );
    $stmt->execute([$username]);
    $row = $stmt->fetch();

    // Mensagem generica de proposito: nao revela se o usuario existe.
    // $row vem como false quando nao achou, e admin_audit espera ?array.
    if (!$row || !password_verify($password, $row['password_hash'])) {
        admin_audit($pdo, $row ?: null, 'login_failed', 'senha incorreta');
        fail(401, 'Usuario ou senha incorretos.');
    }

    if ((int) $row['is_active'] !== 1) {
        admin_audit($pdo, $row, 'login_blocked', 'conta desativada');
        fail(403, 'Este acesso esta desativado. Fale com o superadmin.');
    }

    // Rehash transparente, caso o custo do algoritmo tenha mudado.
    // Se reescreve o hash, regrava tambem a copia cifrada para as duas
    // continuarem representando a mesma senha.
    if (password_needs_rehash($row['password_hash'], PASSWORD_DEFAULT)) {
        admin_store_password($pdo, (int) $row['id'], $password);
    } elseif (admin_secret_ready() && ($row['password_crypt'] ?? null) === null) {
        // Acesso antigo, sem a copia cifrada: aproveita o login para gravar.
        admin_store_password($pdo, (int) $row['id'], $password);
    }

    $token     = bin2hex(random_bytes(32));
    $tokenHash = admin_token_hash($token);

    $pdo->prepare(
        'INSERT INTO `admin_sessions` (`token_hash`, `user_id`, `expires_at`)
         VALUES (:th, :uid, :exp)'
    )->execute([
        'th'  => $tokenHash,
        'uid' => $row['id'],
        'exp' => date('Y-m-d H:i:s', time() + ADMIN_SESSION_TTL),
    ]);

    $pdo->prepare('UPDATE `admin_users` SET `last_login_at` = NOW() WHERE `id` = ?')
        ->execute([$row['id']]);

    admin_audit($pdo, $row, 'login', 'papel ' . $row['role']);

    // Uma sessao por usuario: as anteriores deixam de valer.
    $pdo->prepare(
        'DELETE FROM `admin_sessions`
          WHERE `user_id` = ? AND `token_hash` <> ? AND `expires_at` < NOW()'
    )->execute([$row['id'], $tokenHash]);

    return ['token' => $token, 'user' => admin_public_user($row)];
}

/** Le o token do cabecalho Authorization (ou de ?token=, util em testes). */
function admin_token_from_request(): string
{
    // O Apache com mod_php costuma descartar "Authorization", entao o
    // .htaccess faz SetEnvIf para repassar como HTTP_AUTHORIZATION.
    // Ainda assim lemos tambem os outros nomes que o servidor pode usar,
    // para o login funcionar mesmo em outra configuracao de hospedagem.
    $header = '';
    foreach (['HTTP_AUTHORIZATION', 'REDIRECT_HTTP_AUTHORIZATION', 'REDIRECT_REDIRECT_HTTP_AUTHORIZATION'] as $key) {
        if (!empty($_SERVER[$key])) {
            $header = (string) $_SERVER[$key];
            break;
        }
    }

    if ($header === '' && function_exists('apache_request_headers')) {
        foreach ((array) apache_request_headers() as $name => $value) {
            if (strcasecmp((string) $name, 'Authorization') === 0) {
                $header = (string) $value;
                break;
            }
        }
    }

    if ($header !== '' && preg_match('/Bearer\s+(\S+)/i', $header, $m)) {
        return $m[1];
    }

    return trim((string) ($_REQUEST['token'] ?? ''));
}

/** Usuario da sessao atual, ou null se nao houver sessao valida. */
function admin_current(PDO $pdo): ?array
{
    $token = admin_token_from_request();
    if ($token === '') {
        return null;
    }

    $stmt = $pdo->prepare(
        'SELECT a.`id`, a.`username`, a.`display_name`, a.`role`, a.`form_id`, a.`is_active`
           FROM `admin_sessions` s
           JOIN `admin_users` a ON a.`id` = s.`user_id`
          WHERE s.`token_hash` = ? AND s.`expires_at` > NOW()'
    );
    $stmt->execute([admin_token_hash($token)]);
    $row = $stmt->fetch();

    if (!$row || (int) $row['is_active'] !== 1) {
        return null;
    }

    return $row;
}

/** Igual admin_current, mas exige sessao valida. */
function admin_require(PDO $pdo): array
{
    $user = admin_current($pdo);
    if ($user === null) {
        fail(401, 'Faca login no painel para continuar.');
    }
    return $user;
}

/** Encerra a sessao atual. */
function admin_logout(PDO $pdo): void
{
    $token = admin_token_from_request();
    if ($token !== '') {
        $pdo->prepare('DELETE FROM `admin_sessions` WHERE `token_hash` = ?')
            ->execute([admin_token_hash($token)]);
    }
}

/** Encerra todas as sessoes de um usuario (troca de senha, conta desativada). */
function admin_revoke_all(PDO $pdo, int $userId): void
{
    $pdo->prepare('DELETE FROM `admin_sessions` WHERE `user_id` = ?')->execute([$userId]);
}

/**
 * Troca a propria senha: exige a senha atual e encerra as outras sessoes.
 */
function admin_change_password(PDO $pdo, array $user, string $atual, string $nova): void
{
    if (strlen($nova) < 6) {
        fail(400, 'A nova senha precisa ter ao menos 6 caracteres.');
    }

    $stmt = $pdo->prepare('SELECT `password_hash` FROM `admin_users` WHERE `id` = ?');
    $stmt->execute([$user['id']]);
    $hash = $stmt->fetchColumn();

    if (!$hash || !password_verify($atual, (string) $hash)) {
        admin_audit($pdo, $user, 'password_change_failed', 'senha atual incorreta');
        fail(401, 'Senha atual incorreta.');
    }

    $pdo->prepare(
        'UPDATE `admin_users` SET `password_hash` = ?, `password_crypt` = ?, `must_change_password` = 0 WHERE `id` = ?'
    )->execute([password_hash($nova, PASSWORD_DEFAULT), admin_encrypt($nova), $user['id']]);

    // Encerra tudo menos a sessao que esta trocando a senha agora.
    $pdo->prepare(
        'DELETE FROM `admin_sessions` WHERE `user_id` = ? AND `token_hash` <> ?'
    )->execute([$user['id'], admin_token_hash(admin_token_from_request())]);

    admin_audit($pdo, $user, 'password_changed', 'senha trocada pelo proprio usuario');
}

// ---------------------------------------------------------------------
//  Gestao de acessos (exclusiva do superadmin)
// ---------------------------------------------------------------------

/**
 * Gera uma senha aleatoria forte.
 * Evita ambiguedade de caracteres (0/O, 1/l/I) para nao causar erro de
 * digitacao quando o superadmin repassar a senha para o admin.
 */
function admin_generate_password(int $len = 12): string
{
    // Evita caracteres que confundem na digitacao: sem 0/O, 1/l/I.
    $alfabeto = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    $max = strlen($alfabeto) - 1;
    $senha = '';

    for ($i = 0; $i < $len; $i++) {
        // random_int e criptografico; nao substitua por rand()
        $senha .= $alfabeto[random_int(0, $max)];
    }

    return $senha;
}

/** Lista os acessos do painel. Exclusivo do superadmin. */
function admin_list_users(PDO $pdo): array
{
    $rows = $pdo->query(
        'SELECT a.`id`, a.`username`, a.`display_name`, a.`role`, a.`form_id`,
                a.`is_active`, a.`last_login_at`, a.`created_at`, a.`password_crypt`,
                c.`label` AS `form_label`, c.`sort_order`,
                (SELECT COUNT(*) FROM `admin_sessions` s
                  WHERE s.`user_id` = a.`id` AND s.`expires_at` > NOW()) AS `sessoes_ativas`
           FROM `admin_users` a
           LEFT JOIN `form_catalog` c ON c.`form_key` = a.`form_id`
          ORDER BY (a.`role` = \'superadmin\') DESC, c.`sort_order` IS NULL, c.`sort_order`, a.`username`'
    )->fetchAll();

    $usuarios = [];
    foreach ($rows as $r) {
        $usuarios[] = [
            'id'            => (int) $r['id'],
            'username'      => $r['username'],
            'display_name'  => $r['display_name'],
            'role'          => $r['role'],
            'form_id'       => $r['form_id'],
            'form_label'    => $r['form_label'],
            'is_active'     => (int) $r['is_active'] === 1,
            'last_login_at' => $r['last_login_at'],
            'created_at'    => $r['created_at'],
            'sessoes_ativas'=> (int) $r['sessoes_ativas'],
            // senha em texto puro, decifrada sob demanda. Vem null se a
            // chave de .secret.key nao estiver disponivel.
            'senha'         => admin_decrypt($r['password_crypt']),
        ];
    }

    return $usuarios;
}

/**
 * Define a senha de um acesso. Exclusivo do superadmin.
 *
 * A senha nunca e devolvida por este metodo: o hash e de sentido unico.
 * O que devolvido e a senha em texto puro apenas quando o proprio
 * superadmin gerou uma senha nova, para que ele possa repassar ao
 * usuario e anotar. Ela nao fica gravada em lugar nenhum.
 *
 * @return array{senha: ?string}
 */
function admin_set_password(PDO $pdo, array $actor, int $alvoId, ?string $nova): array
{
    if (!admin_is_super($actor)) {
        admin_audit($pdo, $actor, 'access_denied', 'set-password');
        fail(403, 'Apenas o superadmin pode trocar a senha dos acessos.');
    }

    $stmt = $pdo->prepare(
        'SELECT `id`, `username` FROM `admin_users` WHERE `id` = ?'
    );
    $stmt->execute([$alvoId]);
    $alvo = $stmt->fetch();

    if (!$alvo) {
        fail(404, 'Usuario nao encontrado.');
    }

    // Se nao veio senha, o servidor gera uma.
    $gerada = false;
    if ($nova === null || trim($nova) === '') {
        $nova = admin_generate_password();
        $gerada = true;
    }

    if (strlen($nova) < 6) {
        fail(400, 'A senha precisa ter ao menos 6 caracteres.');
    }

    $pdo->prepare(
        'UPDATE `admin_users`
            SET `password_crypt` = ?, `must_change_password` = ?, `is_active` = 1,
                `password_hash` = ?
          WHERE `id` = ?'
    )->execute([
        admin_encrypt($nova),
        $gerada ? 1 : 0,
        password_hash($nova, PASSWORD_DEFAULT),
        $alvoId,
    ]);

    // A senha nova derruba as sessoes abertas daquele usuario, para que
    // ninguem continue usando a sessao com a senha antiga.
    admin_revoke_all($pdo, $alvoId);

    admin_audit($pdo, $actor, 'set_password', 'para ' . $alvo['username'] . ($gerada ? ' (gerada)' : ' (manual)'));

    return ['senha' => $gerada ? $nova : null];
}

/** Ativa ou desativa um acesso. Exclusivo do superadmin. */
function admin_toggle_active(PDO $pdo, array $actor, int $alvoId): bool
{
    if (!admin_is_super($actor)) {
        admin_audit($pdo, $actor, 'access_denied', 'toggle-active');
        fail(403, 'Apenas o superadmin pode ativar ou desativar acessos.');
    }

    $stmt = $pdo->prepare('SELECT `username`, `is_active`, `role` FROM `admin_users` WHERE `id` = ?');
    $stmt->execute([$alvoId]);
    $alvo = $stmt->fetch();

    if (!$alvo) {
        fail(404, 'Usuario nao encontrado.');
    }

    // Impede que o superadmin fique trancado para fora do proprio painel.
    if ($alvo['role'] === 'superadmin' && (int) $alvo['is_active'] === 1) {
        fail(400, 'Voce nao pode desativar o proprio acesso de superadmin.');
    }

    $novo = (int) $alvo['is_active'] === 1 ? 0 : 1;

    $pdo->prepare('UPDATE `admin_users` SET `is_active` = ? WHERE `id` = ?')
        ->execute([$novo, $alvoId]);

    if ($novo === 0) {
        admin_revoke_all($pdo, $alvoId);
    }

    admin_audit($pdo, $actor, 'toggle_active', $alvo['username'] . ' -> ' . ($novo ? 'ativo' : 'inativo'));

    return $novo === 1;
}

// ---------------------------------------------------------------------
//  Criacao dos acessos do painel
//
//  Fica aqui, e nao no seed_admin.php, porque o mesmo codigo serve para a
//  linha de comando (seed_admin.php) e para a instalacao pela web em
//  hospedagem sem SSH (install.php). Uma unica fonte evita que os dois
//  caminhos acabem criando usuarios diferentes.
// ---------------------------------------------------------------------

/** Categorias que ganham um admin proprio. */
function admin_categorias_com_admin(): array
{
    return [
        ['username' => 'admin_kpop',       'form' => 'kpop',          'label' => 'K-Pop'],
        ['username' => 'admin_cosplayer',  'form' => 'cosplayerperf', 'label' => 'Cosplayer'],
        ['username' => 'admin_arena',      'form' => 'arena',         'label' => 'Arena Gamer'],
        ['username' => 'admin_imprensa',   'form' => 'imprensa',      'label' => 'Imprensa'],
        ['username' => 'admin_estandista', 'form' => 'estandista',    'label' => 'Expositores'],
        ['username' => 'admin_usinageek',  'form' => 'usinageek',     'label' => 'Usina Geek'],
    ];
}

/** Os 7 acessos do painel: um superadmin e um admin por categoria. */
function admin_lista_de_usuarios(): array
{
    $usuarios = [[
        'username'     => 'superadmin',
        'display_name' => 'Super Admin',
        'role'         => 'superadmin',
        'form_id'      => null,
    ]];

    foreach (admin_categorias_com_admin() as $c) {
        $usuarios[] = [
            'username'     => $c['username'],
            'display_name' => 'Admin ' . $c['label'],
            'role'         => 'admin',
            'form_id'      => $c['form'],
        ];
    }

    return $usuarios;
}

/**
 * Cria os acessos que ainda nao existem e, com $reset, redefine a senha de
 * todos. Devolve o que aconteceu com cada um.
 *
 * @return list<array{username:string, acao:string, senha:?string}>
 */
function admin_seed_users(PDO $pdo, string $senha, bool $reset): array
{
    $select = $pdo->prepare('SELECT `id` FROM `admin_users` WHERE `username` = ?');
    $insert = $pdo->prepare(
        'INSERT INTO `admin_users`
            (`username`, `password_hash`, `password_crypt`, `display_name`, `role`, `form_id`, `is_active`, `must_change_password`)
         VALUES (:u, :h, :c, :d, :r, :f, 1, 1)'
    );
    $update = $pdo->prepare(
        'UPDATE `admin_users`
            SET `password_hash` = :h, `password_crypt` = :c, `display_name` = :d, `role` = :r,
                `form_id` = :f, `is_active` = 1, `must_change_password` = 1
          WHERE `username` = :u'
    );

    $resultado = [];

    foreach (admin_lista_de_usuarios() as $u) {
        $select->execute([$u['username']]);
        $existente = $select->fetch();

        if ($existente && !$reset) {
            $resultado[] = ['username' => $u['username'], 'acao' => 'mantido', 'senha' => null];
            continue;
        }

        $hash = password_hash($senha, PASSWORD_DEFAULT);
        $cifrado = admin_encrypt($senha);

        if ($existente) {
            $update->execute([
                'h' => $hash, 'c' => $cifrado, 'd' => $u['display_name'], 'r' => $u['role'],
                'f' => $u['form_id'], 'u' => $u['username'],
            ]);
            // Trocar a senha precisa derrubar as sessoes ja abertas.
            $pdo->prepare(
                'DELETE `s` FROM `admin_sessions` `s`
                  JOIN `admin_users` `a` ON `a`.`id` = `s`.`user_id`
                  WHERE `a`.`username` = ?'
            )->execute([$u['username']]);
            $acao = 'senha redefinida';
        } else {
            $insert->execute([
                'u' => $u['username'], 'h' => $hash, 'c' => $cifrado,
                'd' => $u['display_name'], 'r' => $u['role'], 'f' => $u['form_id'],
            ]);
            $acao = 'criado';
        }

        $resultado[] = ['username' => $u['username'], 'acao' => $acao, 'senha' => $senha];
    }

    return $resultado;
}

/**
 * Categorias do catalogo que ainda nao existem. O seed depende delas por
 * causa da chave estrangeira de admin_users.form_id.
 *
 * @return list<string>
 */
function admin_categorias_ausentes(PDO $pdo): array
{
    $faltando = [];

    foreach (admin_categorias_com_admin() as $c) {
        $checa = $pdo->prepare('SELECT 1 FROM `form_catalog` WHERE `form_key` = ?');
        $checa->execute([$c['form']]);
        if (!$checa->fetchColumn()) {
            $faltando[] = $c['form'];
        }
    }

    return $faltando;
}
