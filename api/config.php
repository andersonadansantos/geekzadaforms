<?php
/**
 * Configuracao de conexao com o banco MySQL "geekzada".
 *
 * Precedencia, do maior para o menor:
 *   1. variavel de ambiente  (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS)
 *   2. api/.db.local.php     (gravado pelo instalador em /install)
 *   3. padrao do XAMPP       (127.0.0.1:3306, root, senha vazia)
 *
 * O passo 2 existe para o instalador: ele testa as credenciais numa tela,
 * cria o banco e so entao grava o que funcionou. Esse arquivo esta no
 * .gitignore e o .htaccess bloqueia qualquer arquivo que comece com
 * ponto, entao ele nunca vai para o git nem para o servidor.
 */

declare(strict_types=1);

/**
 * Le api/.db.local.php, se existir. O arquivo devolve um array com as
 * mesmas chaves das variaveis de ambiente; o que faltar fica de fora.
 *
 * @return array<string, string>
 */
function db_config_local(): array
{
    static $cache = null;

    if ($cache !== null) {
        return $cache;
    }

    $cache = [];
    $arquivo = __DIR__ . '/.db.local.php';

    if (is_file($arquivo)) {
        $dados = require $arquivo;
        if (is_array($dados)) {
            foreach ($dados as $chave => $valor) {
                if (is_string($valor) && is_string($chave)) {
                    $cache[$chave] = $valor;
                }
            }
        }
    }

    return $cache;
}

/**
 * Uma credencial das tres fontes, na ordem de precedencia.
 */
function db_config(string $chave, string $padrao): string
{
    $env = getenv($chave);
    if (is_string($env) && $env !== '') {
        return $env;
    }

    $local = db_config_local();

    return array_key_exists($chave, $local) ? $local[$chave] : $padrao;
}

define('DB_HOST', db_config('DB_HOST', '127.0.0.1'));
define('DB_PORT', db_config('DB_PORT', '3306'));
define('DB_NAME', db_config('DB_NAME', 'geekzada'));
define('DB_USER', db_config('DB_USER', 'root'));
define('DB_PASS', db_config('DB_PASS', ''));
define('DB_CHARSET', 'utf8mb4');

/**
 * Chave usada para cifrar as senhas do painel que o superadmin precisa
 * conseguir consultar (AES-256-GCM).
 *
 * IMPORTANTE: este arquivo e bloqueado no navegador pelo .htaccess
 * ("Require all denied"). Se a chave vazar, todas as senhas do painel
 * viram texto puro, entao nunca a coloque no front, no git ou em URL.
 *
 * Gere uma chave com:
 *   php api/gen_secret.php
 */
if (!defined('ADMIN_SECRET_KEY')) {
    $chave = getenv('ADMIN_SECRET_KEY') ?: '';
    if ($chave === '') {
        // caminho padrao do XAMPP; ajuste se a API rodar em outro lugar
        $arquivo = dirname(__DIR__) . '/api/.secret.key';
        $chave = is_file($arquivo) ? trim((string) file_get_contents($arquivo)) : '';
    }

    define('ADMIN_SECRET_KEY', $chave);
}

/**
 * A chave e obrigatoria para cifrar senhas. Se faltar, o login funciona
 * (o bcrypt sozinho ja valida) mas a aba "Acessos" nao consegue exibir
 * as senhas.
 */
function admin_secret_ready(): bool
{
    return strlen((string) ADMIN_SECRET_KEY) >= 32;
}

/**
 * Abre uma conexao PDO com o banco geekzada.
 */
function db(): PDO
{
    static $pdo = null;

    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $dsn = sprintf(
        'mysql:host=%s;port=%s;dbname=%s;charset=%s',
        DB_HOST,
        DB_PORT,
        DB_NAME,
        DB_CHARSET
    );

    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);

    return $pdo;
}
