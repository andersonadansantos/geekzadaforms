<?php
/**
 * Instalacao dos acessos do painel pela web, para hospedagem sem SSH.
 *
 * O seed_admin.php recusa rodar pelo navegador porque quem consegue rodar
 * aquele script escolhe a senha de todo mundo. Em hospedagem compartilhada
 * (Hostinger, Locaweb, Hostgator) quase sempre nao ha terminal, entao este
 * arquivo faz o mesmo trabalho via HTTP com tres travas:
 *
 *   1. So aceita POST. Abrir a URL no navegador nao faz nada.
 *   2. Exige um token que o operador define antes de subir o arquivo.
 *      Sem o token certo, responde 403.
 *   3. E de uso unico: se admin_users ja tiver linhas, recusa. Depois da
 *      primeira instalacao o arquivo nao faz mais nada.
 *
 * Antes de rodar: importe api/schema.sql no phpMyAdmin (cria as tabelas e o
 * catalogo de categorias) e suba api/.secret.key.
 *
 * Para reinstalar do zero, apague as linhas de admin_users no phpMyAdmin e
 * chame o arquivo de novo.
 */

declare(strict_types=1);

require __DIR__ . '/config.php';
require __DIR__ . '/auth.php';
require __DIR__ . '/forms.php';

// ---------------------------------------------------------------------
//  Token da instalacao
//
//  Troque este valor por uma sequencia aleatoria e longa ANTES de subir o
//  arquivo. Depois de instalar, apague install.php do servidor: e o mais
//  simples, e nao ha nada que ele precise fazer.
//
//  Para nao editar o arquivo, defina a variavel de ambiente INSTALL_TOKEN
//  (nem toda hospedagem permite) ou coloque o token em api/.install_token
//  (arquivo de uma linha, bloqueado pelo .htaccess).
// ---------------------------------------------------------------------
const INSTALL_TOKEN_PADRAO = 'TROQUE-ESTE-TOKEN-POR-UM-SEGREDO-LONGO';

function install_token_esperado(): string
{
    $env = getenv('INSTALL_TOKEN');
    if (is_string($env) && $env !== '') {
        return $env;
    }

    $arquivo = __DIR__ . '/.install_token';
    if (is_file($arquivo)) {
        $conteudo = trim((string) file_get_contents($arquivo));
        if ($conteudo !== '') {
            return $conteudo;
        }
    }

    return INSTALL_TOKEN_PADRAO;
}

function install_responder(int $status, array $html): never
{
    http_response_code($status);
    header('Content-Type: text/html; charset=utf-8');
    header('X-Robots-Tag: noindex, nofollow');
    echo "<!doctype html><html lang=pt-BR><meta charset=utf-8>"
       . '<meta name=viewport content="width=device-width,initial-scale=1">'
       . '<title>Instalacao GeekZada</title>'
       . '<style>body{font:15px/1.6 system-ui,sans-serif;background:#0b0f14;color:#e2e8f0;'
       . 'margin:0;padding:40px 20px}div{max-width:640px;margin:auto}h1{font-size:20px}'
       . 'code{background:#1e293b;padding:2px 6px;border-radius:4px;color:#83E509}'
       . 'pre{background:#1e293b;padding:16px;border-radius:8px;overflow:auto}'
       . 'table{width:100%;border-collapse:collapse;margin:16px 0}'
       . 'td,th{padding:8px;border-bottom:1px solid #1e293b;text-align:left}'
       . '.erro{color:#f87171}.ok{color:#4ade80}</style><body><div>';
    foreach ($html as $linha) {
        echo $linha;
    }
    echo '</div></body></html>';
    exit;
}

// ---------------------------------------------------------------------
//  Trava 1: apenas POST
// ---------------------------------------------------------------------
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    install_responder(405, [
        '<h1>Instalacao GeekZada</h1>',
        '<p class="erro">Este endereco so responde a POST.</p>',
        '<p>Ele cria os 7 acessos do painel. Pela linha de comando o caminho '
        . 'e <code>php api/seed_admin.php</code>.</p>',
    ]);
}

$entrada = [];
$corpo = file_get_contents('php://input') ?: '';

// Editores no Windows gravam BOM antes do JSON, e json_decode recusa o
// arquivo inteiro por causa disso. Tirar a marca antes de tentar ler.
if (strncmp($corpo, "\xEF\xBB\xBF", 3) === 0) {
    $corpo = substr($corpo, 3);
}

if (stripos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== false && $corpo !== '') {
    $decoded = json_decode($corpo, true);
    if (is_array($decoded)) {
        $entrada = $decoded;
    }
} else {
    $entrada = $_POST;
}

// ---------------------------------------------------------------------
//  Trava 2: token
// ---------------------------------------------------------------------
$tokenRecebido = (string) ($entrada['token'] ?? $_SERVER['HTTP_X_INSTALL_TOKEN'] ?? '');
$esperado = install_token_esperado();

if ($esperado === INSTALL_TOKEN_PADRAO) {
    install_responder(500, [
        '<h1>Instalacao GeekZada</h1>',
        '<p class="erro">Token de instalacao ainda nao definido.</p>',
        '<p>Abra <code>api/install.php</code> e troque '
        . '<code>INSTALL_TOKEN_PADRAO</code> por um segredo longo, ou crie '
        . '<code>api/.install_token</code> com o token dentro.</p>',
    ]);
}

if (!hash_equals($esperado, $tokenRecebido)) {
    install_responder(403, [
        '<h1>Instalacao GeekZada</h1>',
        '<p class="erro">Token invalido.</p>',
    ]);
}

// ---------------------------------------------------------------------
//  Pre-condicoes
// ---------------------------------------------------------------------
if (!admin_secret_ready()) {
    install_responder(500, [
        '<h1>Instalacao GeekZada</h1>',
        '<p class="erro">Falta a chave <code>api/.secret.key</code>.</p>',
        '<p>Sem ela o login funciona, mas a aba Acessos nao consegue exibir as '
        . 'senhas. Gere uma chave de 32 bytes e suba o arquivo junto.</p>',
    ]);
}

try {
    $pdo = db();
} catch (Throwable $e) {
    install_responder(500, [
        '<h1>Instalacao GeekZada</h1>',
        '<p class="erro">Nao consegui conectar no banco.</p>',
        '<p>Confira as credenciais em <code>api/config.php</code>.</p>',
        '<p><small>' . htmlspecialchars($e->getMessage(), ENT_QUOTES, 'UTF-8') . '</small></p>',
    ]);
}

try {
    $total = (int) $pdo->query('SELECT COUNT(*) FROM `admin_users`')->fetchColumn();
} catch (Throwable $e) {
    install_responder(500, [
        '<h1>Instalacao GeekZada</h1>',
        '<p class="erro">As tabelas ainda nao existem.</p>',
        '<p>Importe <code>api/schema.sql</code> no phpMyAdmin e chame este '
        . 'endereco de novo.</p>',
        '<p><small>' . htmlspecialchars($e->getMessage(), ENT_QUOTES, 'UTF-8') . '</small></p>',
    ]);
}

// ---------------------------------------------------------------------
//  Trava 3: uso unico
// ---------------------------------------------------------------------
if ($total > 0) {
    install_responder(409, [
        '<h1>Instalacao GeekZada</h1>',
        '<p class="ok">Ja instalado: ' . $total . ' acesso(s) no banco.</p>',
        '<p>Este endereco e de uso unico e ja cumpriu seu papel. '
        . '<strong>Apague <code>api/install.php</code> do servidor.</strong></p>',
    ]);
}

$senha = (string) ($entrada['senha'] ?? '');
if (strlen($senha) < 8) {
    install_responder(400, [
        '<h1>Instalacao GeekZada</h1>',
        '<p class="erro">Informe <code>senha</code> com ao menos 8 caracteres.</p>',
    ]);
}

$faltando = admin_categorias_ausentes($pdo);
if ($faltando) {
    install_responder(500, [
        '<h1>Instalacao GeekZada</h1>',
        '<p class="erro">Catalogo de categorias incompleto: '
        . htmlspecialchars(implode(', ', $faltando), ENT_QUOTES, 'UTF-8') . '</p>',
        '<p>Isso indica que <code>api/schema.sql</code> foi importado pela '
        . 'metade. Importe de novo e chame este endereco outra vez.</p>',
    ]);
}

// ---------------------------------------------------------------------
//  Instala
// ---------------------------------------------------------------------
$resultado = admin_seed_users($pdo, $senha, true);

$linhas = '';
foreach ($resultado as $r) {
    $linhas .= '<tr><td><code>' . htmlspecialchars($r['username'], ENT_QUOTES, 'UTF-8') . '</code></td>'
             . '<td>' . htmlspecialchars($r['acao'], ENT_QUOTES, 'UTF-8') . '</td></tr>';
}

install_responder(200, [
    '<h1>Instalacao concluida</h1>',
    '<p class="ok">' . count($resultado) . ' acessos criados.</p>',
    '<table><tr><th>Usuario</th><th>Situacao</th></tr>' . $linhas . '</table>',
    '<p>Troque a senha inicial em Acessos &rarr; Senha assim que entrar.</p>',
    '<p><strong>Apague <code>api/install.php</code> do servidor agora.</strong></p>',
]);
