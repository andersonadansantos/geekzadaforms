<?php
/**
 * API REST dos formularios GeekZada.
 *
 * Banco unico "geekzada". Todos os formularios sao gravados em
 * form_submissions (tabela mestra, gera o ID) + uma tabela de detalhe
 * por formulario. A separacao e feita pelo par
 * (form_submissions.id, form_submissions.form_id).
 *
 * Endpoints publicos
 *   GET  api/?action=health
 *   POST api/?action=submit   { form_id, data: {...} }
 *
 * Endpoints do painel (exigem Authorization: Bearer <token>)
 *   POST api/?action=login   { username, password } -> { token, user }
 *   POST api/?action=logout
 *   GET  api/?action=me                        -> dados de quem esta logado
 *   POST api/?action=change-password { current_password, new_password }
 *   GET  api/?action=counts                    -> so as categorias do usuario
 *   GET  api/?action=list&form_id=kpop         -> exige acesso a categoria
 *   POST api/?action=delete   { id }           -> exige acesso a categoria
 *   POST api/?action=delete-all { form_id }    -> apenas superadmin
 *
 * Gestao de acessos (apenas superadmin)
 *   GET  api/?action=users                    -> lista os acessos do painel
 *   POST api/?action=set-password { user_id, new_password? }
 *   POST api/?action=toggle-active { user_id }
 *
 * As senhas iniciais sao criadas por api/seed_admin.php (veja README).
 */

declare(strict_types=1);

require __DIR__ . '/config.php';
require __DIR__ . '/forms.php';
require __DIR__ . '/auth.php';

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

/** Envia uma resposta JSON e encerra o script. */
function respond(int $status, array $payload): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function fail(int $status, string $message): never
{
    respond($status, ['error' => $message]);
}

/**
 * Registra o detalhe da falha no log do servidor e devolve ao cliente uma
 * mensagem generica. Sem isso, erros de PDO expõem usuario do banco, host e
 * nome do banco para qualquer visitante.
 */
function fail_safe(Throwable $e, int $status = 500): never
{
    error_log('[geekzada] ' . $e->getMessage());

    $sqlstate = $e instanceof PDOException ? (string) $e->getCode() : '';
    $is_db_problem = $sqlstate === '28000'
        || $sqlstate === 'HY000'
        || str_contains($e->getMessage(), 'SQLSTATE');

    fail($status, $is_db_problem
        ? 'Banco de dados indisponivel. Tente novamente em instantes.'
        : 'Erro interno. Tente novamente ou contate o organizador.');
}

/** Le o corpo JSON da requisicao (aceita tambem form-encoded). */
function read_input(): array
{
    $raw = file_get_contents('php://input') ?: '';
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';

    if ($raw !== '' && stripos($contentType, 'application/json') !== false) {
        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            fail(400, 'Corpo JSON invalido.');
        }
        return $decoded;
    }

    if ($raw !== '' && $raw[0] === '{') {
        $decoded = json_decode($raw, true);
        if (is_array($decoded)) {
            return $decoded;
        }
    }

    return $_POST;
}

/** Endereco IP de quem enviou a inscricao. */
function client_ip(): string
{
    return substr((string) ($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45);
}

// ---------------------------------------------------------------------
//  Acoes
// ---------------------------------------------------------------------

/** Verifica se o banco esta acessivel. Publico, por isso nao revela detalhes. */
function action_health(): never
{
    try {
        $pdo = db();
        $pdo->query('SELECT 1');
    } catch (Throwable $e) {
        error_log('[geekzada] health: ' . $e->getMessage());
        respond(503, [
            'ok'    => false,
            'error' => 'Banco de dados inacessivel.',
        ]);
    }

    respond(200, ['ok' => true]);
}

// ---------------------------------------------------------------------
//  Login / sessao
// ---------------------------------------------------------------------

/** Autentica e devolve o token da sessao. */
function action_login(array $input): never
{
    $pdo = db();

    $login = admin_login(
        $pdo,
        (string) ($input['username'] ?? ''),
        (string) ($input['password'] ?? '')
    );

    respond(200, [
        'ok'    => true,
        'token' => $login['token'],
        'user'  => $login['user'],
        'forms' => admin_scope_forms($login['user']),
    ]);
}

/** Encerra a sessao atual. */
function action_logout(): never
{
    admin_logout(db());
    respond(200, ['ok' => true]);
}

/** Dados de quem esta logado + as categorias que ele pode abrir. */
function action_me(): never
{
    $user = admin_require(db());

    respond(200, [
        'user'  => admin_public_user($user),
        'forms' => admin_scope_forms($user),
    ]);
}

/** Troca a propria senha. */
function action_change_password(array $input): never
{
    $pdo = db();
    $user = admin_require($pdo);

    admin_change_password(
        $pdo,
        $user,
        (string) ($input['current_password'] ?? ''),
        (string) ($input['new_password'] ?? '')
    );

    respond(200, ['ok' => true]);
}

/** Lista os acessos do painel. Exclusivo do superadmin. */
function action_users(): never
{
    $pdo  = db();
    $user = admin_require($pdo);

    if (!admin_is_super($user)) {
        admin_audit($pdo, $user, 'access_denied', 'users');
        fail(403, 'Apenas o superadmin pode ver os acessos do painel.');
    }

    $usuarios = admin_list_users($pdo);

    // Registrar toda vez que as senhas saem em texto puro: sao dados
    // sensiveis e convem saber quem consultou.
    admin_audit($pdo, $user, 'passwords_revealed', count($usuarios) . ' acesso(s)');

    respond(200, ['users' => $usuarios]);
}

/**
 * Define a senha de um acesso. Exclusivo do superadmin.
 *
 * Sem "new_password" no corpo, o servidor gera uma senha e a devolve
 * em "senha" para o superadmin repassar. A senha nunca e armazenada.
 */
function action_set_password(array $input): never
{
    $pdo  = db();
    $user = admin_require($pdo);

    $alvo = (int) ($input['user_id'] ?? 0);
    if ($alvo <= 0) {
        fail(400, 'Informe o usuario alvo (user_id).');
    }

    $nova = $input['new_password'] ?? null;
    if ($nova !== null && !is_string($nova)) {
        fail(400, 'Campo "new_password" invalido.');
    }

    $resultado = admin_set_password($pdo, $user, $alvo, $nova === null ? null : trim($nova));

    respond(200, [
        'ok'    => true,
        // null quando o superadmin digitou a senha: ele ja a conhece.
        'senha' => $resultado['senha'],
    ]);
}

/** Ativa ou desativa um acesso. Exclusivo do superadmin. */
function action_toggle_active(array $input): never
{
    $pdo  = db();
    $user = admin_require($pdo);

    $alvo = (int) ($input['user_id'] ?? 0);
    if ($alvo <= 0) {
        fail(400, 'Informe o usuario alvo (user_id).');
    }

    respond(200, ['ok' => true, 'is_active' => admin_toggle_active($pdo, $user, $alvo)]);
}

/** Total de inscricoes de cada formulario, em uma unica chamada. */
function action_counts(): never
{
    $user  = admin_require(db());
    $pdo   = db();
    $forms = admin_scope_forms($user);

    $counts = array_fill_keys(array_keys(form_definitions()), 0);

    // Admin de categoria so enxerga o proprio total; o superadmin, todos.
    if (count($forms) > 0) {
        $marcadores = implode(',', array_fill(0, count($forms), '?'));

        $resultado = $pdo->prepare(
            "SELECT `form_id`, COUNT(*) AS total
               FROM `form_submissions`
              WHERE `form_id` IN ($marcadores)
              GROUP BY `form_id`"
        );
        $resultado->execute($forms);

        foreach ($resultado->fetchAll() as $row) {
            $counts[$row['form_id']] = (int) $row['total'];
        }
    }

    respond(200, ['counts' => $counts, 'forms' => $forms]);
}

/** Lista as inscricoes de um formulario, da mais recente para a mais antiga. */
function action_list(array $input): never
{
    $user = admin_require(db());

    $form = resolve_form((string) ($input['form_id'] ?? ''));

    // Barra de categoria: um admin de kpop nao abre a listagem de arena.
    if (!admin_can_access($user, $form['key'])) {
        admin_audit(db(), $user, 'access_denied', 'list ' . $form['key']);
        fail(403, 'Seu acesso nao inclui a categoria "' . $form['key'] . '".');
    }

    $table = $form['table'];

    $select = ['id'];
    foreach (array_keys($form['columns']) as $column) {
        $select[] = '`' . column_name($column, $form['columns'][$column]) . '` AS `' . $column . '`';
    }
    $select[] = '`created_at`';

    $sql = 'SELECT ' . implode(', ', $select)
        . ' FROM `' . $table . '`'
        . ' ORDER BY `created_at` DESC, `id` DESC';

    $rows = db()->query($sql)->fetchAll();

    $data = [];
    foreach ($rows as $row) {
        // o SELECT ja renomeou as colunas *_json para o nome logico
        $data[] = cast_row($row, $form);
    }

    respond(200, ['form_id' => $form['key'], 'count' => count($data), 'data' => $data]);
}

/** Grava uma inscricao: mestra + detalhe, dentro de uma transacao. */
function action_submit(array $input): never
{
    $form = resolve_form((string) ($input['form_id'] ?? ''));
    $data = $input['data'] ?? [];

    if (!is_array($data)) {
        fail(400, 'Campo "data" invalido.');
    }

    $pdo = db();
    $pdo->beginTransaction();

    try {
        // 1) Tabela mestra: gera o ID que distingue os formularios.
        $stmt = $pdo->prepare(
            'INSERT INTO `form_submissions` (`form_id`, `ip_address`, `user_agent`, `data_json`)
             VALUES (:form_id, :ip, :ua, :payload)'
        );
        $stmt->execute([
            'form_id' => $form['key'],
            'ip'      => client_ip(),
            'ua'      => substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 255),
            'payload' => json_encode($data, JSON_UNESCAPED_UNICODE),
        ]);

        $id = (int) $pdo->lastInsertId();

        // 2) Tabela de detalhe do formulario, com o mesmo ID.
        $columns   = ['id'];
        $values    = [':id'];
        $bindNames = ['id' => $id];

        foreach ($form['columns'] as $logical => $spec) {
            if (!array_key_exists($logical, $data)) {
                continue;
            }
            $columns[]              = '`' . column_name($logical, $spec) . '`';
            $values[]               = ':' . $logical;
            $bindNames[$logical]    = cast_value($data[$logical], $spec);
        }

        $sql = 'INSERT INTO `' . $form['table'] . '` ('
            . implode(', ', $columns) . ') VALUES (' . implode(', ', $values) . ')';

        $pdo->prepare($sql)->execute($bindNames);

        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        fail_safe($e, 500);
    }

    respond(201, ['ok' => true, 'id' => $id, 'form_id' => $form['key']]);
}

/** Exclui uma inscricao. A FK ON DELETE CASCADE remove o detalhe junto. */
function action_delete(array $input): never
{
    $pdo  = db();
    $user = admin_require($pdo);

    $id = (int) ($input['id'] ?? 0);
    if ($id <= 0) {
        fail(400, 'ID invalido.');
    }

    $row = $pdo->prepare('SELECT `form_id` FROM `form_submissions` WHERE `id` = ?');
    $row->execute([$id]);
    $found = $row->fetch();

    if (!$found) {
        fail(404, 'Registro nao encontrado.');
    }

    // Impede que o admin de uma categoria apague inscricao de outra,
    // mesmo que ele descubra o ID por outro meio.
    if (!admin_can_access($user, $found['form_id'])) {
        admin_audit($pdo, $user, 'access_denied', 'delete id ' . $id);
        fail(403, 'Seu acesso nao inclui a categoria "' . $found['form_id'] . '".');
    }

    $pdo->prepare('DELETE FROM `form_submissions` WHERE `id` = ?')->execute([$id]);
    admin_audit($pdo, $user, 'delete', 'id ' . $id . ' (' . $found['form_id'] . ')');

    respond(200, ['ok' => true, 'id' => $id, 'form_id' => $found['form_id']]);
}

/** Esvazia um formulario inteiro. Exclusivo do superadmin. */
function action_delete_all(array $input): never
{
    $pdo  = db();
    $user = admin_require($pdo);

    if (!admin_is_super($user)) {
        admin_audit($pdo, $user, 'access_denied', 'delete-all');
        fail(403, 'Apenas o superadmin pode limpar uma tabela inteira.');
    }

    $form = resolve_form((string) ($input['form_id'] ?? ''));

    $stmt = $pdo->prepare('DELETE FROM `form_submissions` WHERE `form_id` = ?');
    $stmt->execute([$form['key']]);

    admin_audit($pdo, $user, 'delete_all', $form['key'] . ' (' . $stmt->rowCount() . ' registros)');

    respond(200, ['ok' => true, 'form_id' => $form['key'], 'deleted' => $stmt->rowCount()]);
}

// ---------------------------------------------------------------------
//  Roteamento
// ---------------------------------------------------------------------

try {
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $action = (string) ($_REQUEST['action'] ?? 'health');

    if ($method === 'POST') {
        $input = array_merge($_GET, read_input());
    } else {
        $input = $_GET;
    }

    switch ($action) {
        // publicos
        case 'health':
            action_health();
            break;

        case 'submit':
            action_submit($input);
            break;

        // sessao
        case 'login':
            action_login($input);
            break;

        case 'logout':
            action_logout();
            break;

        case 'me':
            action_me();
            break;

        case 'change-password':
            action_change_password($input);
            break;

        // painel
        case 'counts':
            action_counts();
            break;

        case 'list':
            action_list($input);
            break;

        case 'delete':
            action_delete($input);
            break;

        case 'delete-all':
            action_delete_all($input);
            break;

        // gestao de acessos (so superadmin)
        case 'users':
            action_users();
            break;

        case 'set-password':
            action_set_password($input);
            break;

        case 'toggle-active':
            action_toggle_active($input);
            break;

        default:
            fail(404, 'Acao desconhecida: ' . $action);
    }
} catch (InvalidArgumentException $e) {
    fail(400, $e->getMessage());
} catch (Throwable $e) {
    fail_safe($e, 500);
}
