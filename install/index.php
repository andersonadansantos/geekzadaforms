<?php
/**
 * Instalador local: http://localhost/geekzadaforms/install
 *
 * Uma tela para deixar o banco em pe sem sair do navegador:
 *
 *   1. diagnostico  - versoes, extensoes, o que ja existe em disco
 *   2. testar       - abre a conexao com as credenciais digitadas
 *   3. instalar     - cria o banco, importa api/schema.sql,
 *                     gera api/.secret.key e cria os 7 acessos do painel
 *
 * As credenciais que funcionarem sao gravadas em api/.db.local.php, que o
 * config.php le depois das variaveis de ambiente. Isso mantem config.php
 * intacto entre instalacoes e evita digitar usuario e senha no arquivo.
 *
 * POR QUE SO FUNCIONA NO LOCALHOST
 * Esta pagina cria usuarios com senha e escreve credenciais em disco.
 * Ela nao tem token nem login, entao a unica protecao e o endereco de
 * origem: se o request nao vier do loopback, ela se recusa a responder.
 * O pacote de deploy (tools/build-deploy.mjs) ja nao copia a pasta
 * install/, mas o .htaccess e o mesmo nos dois ambientes - e por isso que
 * a trava abaixo precisa existir.
 */

declare(strict_types=1);

require __DIR__ . '/../api/config.php';

// ---------------------------------------------------------------------
//  Trava: apenas requisições do proprio servidor
// ---------------------------------------------------------------------
$ip = (string) ($_SERVER['REMOTE_ADDR'] ?? '');

$local = in_array($ip, ['127.0.0.1', '::1', '::ffff:127.0.0.1'], true)
    || strncmp($ip, '127.', 4) === 0;

if (!$local) {
    http_response_code(403);
    header('Content-Type: text/plain; charset=utf-8');
    exit("O instalador so responde a requisicoes do localhost.\n");
}

// ---------------------------------------------------------------------
//  Apresentacao
// ---------------------------------------------------------------------
function esc(mixed $valor): string
{
    return htmlspecialchars((string) $valor, ENT_QUOTES, 'UTF-8');
}

/**
 * Renderiza a pagina inteira. O rodape de seguranca aparece em toda
 * resposta, entao nunca fica num estado em que o usuario precise adivinhar
 * o que deletar depois.
 */
function pagina(string $titulo, string $corpo): never
{
    header('Content-Type: text/html; charset=utf-8');
    header('X-Robots-Tag: noindex, nofollow');

    echo '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">'
       . '<meta name="viewport" content="width=device-width,initial-scale=1">'
       . '<title>' . esc($titulo) . '</title><style>'
       . 'body{font:15px/1.6 system-ui,sans-serif;background:#0b0f14;color:#e2e8f0;margin:0;padding:32px 16px}'
       . 'div{max-width:760px;margin:auto}'
       . 'h1{font-size:20px;margin:0 0 4px}h2{font-size:16px;margin:28px 0 8px}'
       . 'p{margin:8px 0}code{background:#1e293b;padding:2px 6px;border-radius:4px;color:#83E509}'
       . 'pre{background:#1e293b;padding:14px;border-radius:8px;overflow:auto;font-size:13px;white-space:pre-wrap}'
       . 'table{width:100%;border-collapse:collapse;margin:12px 0;font-size:14px}'
       . 'td,th{padding:7px 8px;border-bottom:1px solid #1e293b;text-align:left;vertical-align:top}'
       . 'th{color:#94a3b8;font-weight:500}td.val{color:#83E509;font-family:ui-monospace,monospace}'
       . '.erro{color:#f87171}.ok{color:#4ade80}.aviso{color:#fbbf24}'
       . 'form{background:#111827;border:1px solid #1e293b;border-radius:10px;padding:16px;margin:12px 0}'
       . 'label{display:block;margin:10px 0 4px;font-size:13px;color:#94a3b8}'
       . 'input{width:100%;box-sizing:border-box;background:#0b0f14;color:#e2e8f0;border:1px solid #334155;'
       . 'border-radius:6px;padding:8px 10px;font:inherit}'
       . 'input:focus{outline:0;border-color:#83E509}'
       . '.linha{display:flex;gap:12px;flex-wrap:wrap}.linha>div{flex:1;min-width:160px}'
       . 'button{margin-top:16px;background:#83E509;color:#0b0f14;border:0;border-radius:6px;'
       . 'padding:10px 18px;font:600 14px system-ui,sans-serif;cursor:pointer}'
       . 'button.sec{background:#1e293b;color:#e2e8f0;margin-left:8px}'
       . 'button:hover{filter:brightness(1.1)}'
       . 'footer{margin-top:32px;padding-top:16px;border-top:1px solid #1e293b;font-size:13px;color:#64748b}'
       . '</style></head><body><div>'
       . $corpo
       . '<footer>Esta pagina so abre para requisicoes do proprio servidor. Em producao ela se recusa.</footer>'
       . '</div></body></html>';

    exit;
}

/**
 * Token da sessao, para que uma pagina aberta em outra aba do navegador
 * nao consiga acionar o instalador. So o loopback passa pela trava do
 * endereco, mas uma pagina maliciosa na internet ainda consegue mandar
 * POST para 127.0.0.1 - e o token e o que fecha essa porta.
 */
function install_csrf(): string
{
    if (session_status() !== PHP_SESSION_ACTIVE) {
        session_start();
    }

    if (empty($_SESSION['install_csrf']) || !is_string($_SESSION['install_csrf'])) {
        $_SESSION['install_csrf'] = bin2hex(random_bytes(16));
    }

    return $_SESSION['install_csrf'];
}

/**
 * Uma linha de tabela de diagnostico. $valor e texto puro e sai escapado.
 * Para marcar o resultado em verde ou vermelho, use linha_html().
 */
function linha(string $rotulo, string $valor, bool $bom = true): string
{
    return '<tr><th>' . esc($rotulo) . '</th><td>'
         . ($valor === ''
            ? '<span class="erro">ausente</span>'
            : '<span class="' . ($bom ? 'val' : 'erro') . '">' . esc($valor) . '</span>')
         . '</td></tr>';
}

/** Linha de diagnostico cujo valor ja e HTML (ex.: um badge de status). */
function linha_html(string $rotulo, string $html): string
{
    return '<tr><th>' . esc($rotulo) . '</th><td>' . $html . '</td></tr>';
}

/**
 * Caminho da propria pagina, sem barra final.
 *
 * install/ e um diretorio de verdade, entao o Apache responde
 * 301 para /install/ antes de qualquer reescrita. Numa resposta 301 o
 * cliente converte o POST em GET e o corpo do formulario se perde - o
 * instalador recebia a pagina vazia, sem nenhuma acao executada.
 *
 * Por isso install/ nao pode ser acessado como diretorio: as regras do
 * .htaccess tratam /install e /install/ direto, sem 301 no meio, e o
 * action do formulario aponta para o arquivo, nunca para a pasta.
 *
 * Esta funcao devolve o prefixo do .htaccess (/install) para usar nos
 * links, e install_acao_url() devolve o arquivo para usar no POST.
 */
function install_base(): string
{
    $script = str_replace('\\', '/', (string) ($_SERVER['SCRIPT_NAME'] ?? '/install/index.php'));
    $dir    = rtrim(str_replace('\\', '/', dirname($script)), '/');

    return $dir === '' ? '' : $dir;
}

/**
 * Raiz da aplicacao (a pasta acima de install/). Os links do rodape usam
 * ela para chegar no site e na API sem depender de "../".
 */
function install_raiz(): string
{
    $base = install_base();

    // install/ pode estar em subpasta de qualquer profundidade, entao o
    // que importa e remover o sufixo, nao contar niveis.
    $sufixo = '/install';

    if (str_ends_with($base, $sufixo)) {
        return rtrim(substr($base, 0, -strlen($sufixo)), '/');
    }

    // Layout inesperado: sobe um nivel em vez de devolver link vazio.
    return rtrim(str_replace('\\', '/', dirname($base)), '/');
}

// ---------------------------------------------------------------------
//  Utilidades de SQL
// ---------------------------------------------------------------------

/**
 * Quebra um script .sql em comandos.
 *
 * Nao basta um explode(';'): o schema usa aspas duplas para o texto do
 * PREPARE e comentarios -- no comeco das linhas. Aqui as tres situacoes
 * sao respeitadas - citacao, citacao duplicada e escape com barra - para
 * que nenhum ponto e virgula dentro de texto vire um comando quebrado.
 *
 * @return list<string>
 */
function install_dividir_sql(string $sql): array
{
    // O Bloco de Notas do Windows grava um BOM antes do texto. O MariaDB
    // aceita BOM no meio de um comando, entao ele passaria para o servidor
    // junto da primeira palavra.
    if (strncmp($sql, "\xEF\xBB\xBF", 3) === 0) {
        $sql = substr($sql, 3);
    }

    $comandos = [];
    $atual    = '';
    $citacao  = null;
    $comentario = false;

    $n = strlen($sql);
    $i = 0;

    while ($i < $n) {
        $c = $sql[$i];

        if ($comentario) {
            if ($c === "\n") {
                $comentario = false;
                $atual .= $c;
            }
            $i++;
            continue;
        }

        if ($citacao !== null) {
            $atual .= $c;

            if ($c === '\\' && $citacao !== '`' && $i + 1 < $n) {
                $atual .= $sql[$i + 1];
                $i += 2;
                continue;
            }

            if ($c === $citacao) {
                // '' dentro de uma citacao e literal, nao fim de string.
                if ($i + 1 < $n && $sql[$i + 1] === $citacao) {
                    $atual .= $sql[$i + 1];
                    $i += 2;
                    continue;
                }
                $citacao = null;
            }

            $i++;
            continue;
        }

        if ($c === '-' && $i + 1 < $n && $sql[$i + 1] === '-') {
            $comentario = true;
            $i += 2;
            continue;
        }

        if ($c === '#') {
            $comentario = true;
            $i++;
            continue;
        }

        if ($c === '/' && $i + 1 < $n && $sql[$i + 1] === '*') {
            $fim = strpos($sql, '*/', $i + 2);
            $i = $fim === false ? $n : $fim + 2;
            continue;
        }

        if ($c === "'" || $c === '"' || $c === '`') {
            $citacao = $c;
            $atual .= $c;
            $i++;
            continue;
        }

        if ($c === ';') {
            if (trim($atual) !== '') {
                $comandos[] = trim($atual);
            }
            $atual = '';
            $i++;
            continue;
        }

        $atual .= $c;
        $i++;
    }

    if (trim($atual) !== '') {
        $comandos[] = trim($atual);
    }

    return $comandos;
}

/**
 * Cria a conexao com as credenciais digitadas. Sem $banco, entra sem
 * selecionar schema - e assim que se descobre se o banco existe.
 */
/** Nomes das tabelas do banco conectado. */
function install_tabelas(PDO $pdo): array
{
    return $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
}

/**
 * PDO de diagnostico.
 *
 * $tempoLimite evita que host errado (um IP de producao-digitado-errado,
 * por exemplo) trave a tela por dezenas de segundos. Sem isso o MySQL
 * espera o timeout do sistema e a pagina parece travada.
 */
function install_conectar(array $c, string $banco = '', int $tempoLimite = 5): PDO
{
    $dsn = sprintf(
        'mysql:host=%s;port=%s;charset=utf8mb4%s',
        $c['host'],
        $c['port'],
        $banco === '' ? '' : ';dbname=' . $banco
    );

    return new PDO($dsn, $c['user'], $c['pass'], [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
        PDO::ATTR_TIMEOUT            => $tempoLimite,
    ]);
}

/** Os campos do formulario, ja preenchidos. */
function install_campos(): array
{
    $env = [];

    foreach (['host', 'port', 'db', 'user', 'pass'] as $campo) {
        $chave = 'DB_' . strtoupper($campo);
        $valor = getenv($chave);

        if (!is_string($valor) || $valor === '') {
            $local = db_config_local();
            $valor = $local[$chave] ?? null;
        }

        $env[$campo] = (string) ($valor ?? '');
    }

    $padroes = ['host' => '127.0.0.1', 'port' => '3306', 'db' => 'geekzada', 'user' => 'root', 'pass' => ''];

    // So os defaults de rede e de nome. A senha em branco e o estado
    // correto de "o usuario ainda nao digitou", nao um valor a preencher.
    foreach (['host', 'port', 'db', 'user'] as $campo) {
        if ($env[$campo] === '') {
            $env[$campo] = $padroes[$campo];
        }
    }

    foreach ($_POST as $campo => $valor) {
        if (isset($padroes[$campo]) && is_string($valor)) {
            $env[$campo] = $valor;
        }
    }

    return $env;
}

// ---------------------------------------------------------------------
//  Passos
// ---------------------------------------------------------------------
$acao = (string) ($_POST['acao'] ?? '');

$log        = [];
$erroFatal  = null;
$gravou     = false;
$senhaAdmin = '';

if ($acao === 'testar' || $acao === 'instalar') {
    // Token invalido: e outra aba com sessao velha, ou um POST de fora.
    $csrfEnviado = (string) ($_POST['csrf'] ?? '');

    if (!hash_equals(install_csrf(), $csrfEnviado)) {
        $erroFatal = 'Token da sessao invalido. Recarregue a pagina e tente de novo.';
    }

    $c = install_campos();

    $c['db'] = trim($c['db']);

    // O nome do banco vai para dentro de um CREATE DATABASE, entao so
    // letras, numeros e underscore chegam ate la.
    if ($erroFatal === null && preg_match('/^[A-Za-z0-9_]+$/', $c['db']) !== 1) {
        $erroFatal = 'Nome de banco invalido: use apenas letras, numeros e underscore.';
        $c['db'] = '';
    }

    if ($erroFatal === null && ($c['host'] === '' || $c['user'] === '' || $c['db'] === '')) {
        $erroFatal = 'Preencha host, usuario e nome do banco.';
    }

    if ($erroFatal === null) {
        try {
            $pdo = install_conectar($c);
            $versao = (string) $pdo->query('SELECT VERSION()')->fetchColumn();

            $log[] = ['ok', 'Conectado. MySQL/MariaDB ' . $versao];

            // O banco pode existir e ainda assim o usuario nao ter
            // privilegio nele - que e o que acontece quando o acesso e
            // negado so depois do SELECT. Este SELECT e o teste honesto.
            try {
                $pdo->query('USE `' . $c['db'] . '`');
                $tabelas = $pdo->query(
                    'SELECT `TABLE_NAME` FROM information_schema.TABLES
                      WHERE `TABLE_SCHEMA` = ' . $pdo->quote($c['db'])
                )->fetchAll(PDO::FETCH_COLUMN);

                $log[] = ['ok', 'Banco "' . $c['db'] . '" acessivel. '
                    . count($tabelas) . ' tabela(s) encontrada(s).'];
            } catch (Throwable $e) {
                $log[] = ['aviso', 'Consegui conectar, mas o banco "' . $c['db'] . '" '
                    . 'ainda nao existe ou o usuario nao tem privilegio nele. '
                    . 'Se ele ainda nao existe, o passo Instalar cria.'];
            }

            if ($acao === 'instalar') {
                // 1) Cria o banco se faltar.
                $pdo->exec(
                    'CREATE DATABASE IF NOT EXISTS `' . $c['db'] . '`'
                    . ' DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
                );
                $log[] = ['ok', 'Banco "' . $c['db'] . '" pronto.'];

                // 2) Importa o schema, comando por comando.
                $arquivoSchema = __DIR__ . '/../api/schema.sql';

                if (!is_file($arquivoSchema)) {
                    throw new RuntimeException('api/schema.sql nao encontrado.');
                }

                $pdo->exec('USE `' . $c['db'] . '`');

                // O schema vem com CREATE DATABASE/USE fixos no nome padrao.
                // Ja criamos e selecionamos o banco acima, entao esses dois
                // comandos sao descartados - e o filtro tambem tira o BOM
                // que o Bloco de Notas do Windows coloca no inicio do arquivo,
                // que o MariaDB leria como parte da primeira palavra.
                $executados = 0;
                foreach (install_dividir_sql((string) file_get_contents($arquivoSchema)) as $comando) {
                    if (preg_match('/^\s*(CREATE\s+DATABASE|USE\s)/i', $comando) === 1) {
                        continue;
                    }
                    $pdo->exec($comando);
                    $executados++;
                }

                $log[] = ['ok', 'Schema aplicado: ' . $executados . ' comando(s).'];

                // 3) Chave de cifragem das senhas do painel.
                $chave = install_garantir_chave();
                $log[] = [$chave ? 'ok' : 'aviso', $chave
                    ? 'api/.secret.key pronto (chave de ' . $chave . ' bytes).'
                    : 'Nao consegui escrever api/.secret.key. O login funciona, mas a '
                      . 'aba Acessos nao mostra as senhas. Confira a permissao de escrita.'];

                // 4) Grava as credenciais que acabaram de funcionar.
                $gravou = install_gravar_config($c);

                if (!$gravou) {
                    $log[] = ['aviso', 'Nao consegui escrever api/.db.local.php. '
                        . 'O banco esta pronto, mas a API ainda usa as credenciais de '
                        . 'config.php. Copie os valores para la a mao.'];
                }

                // 5) Cria os 7 acessos do painel.
                $senha = (string) ($_POST['senha'] ?? '');
                $reset = ($_POST['reset'] ?? '') === '1';

                if (strlen($senha) < 8) {
                    // Sem senha nao ha o que criar. Dizer o que fazer em
                    // vez de so avisar que faltou: quem instalou do zero
                    // precisa saber que ainda nao ha nenhum acesso.
                    $temAcesso = false;

                    try {
                        $temAcesso = (int) $pdo->query('SELECT COUNT(*) FROM `admin_users`')
                            ->fetchColumn() > 0;
                    } catch (Throwable $e) {
                        $temAcesso = false;
                    }

                    $log[] = ['aviso', $temAcesso
                        ? 'Faltou a senha inicial do painel (minimo 8 caracteres), entao os '
                            . 'acessos que ja existiam foram mantidos como estavam. Marque '
                            . '"Redefinir as senhas" e digite a senha para trocar todos.'
                        : 'Faltou a senha inicial do painel (minimo 8 caracteres), entao os 7 '
                            . 'acessos NAO foram criados. Preencha a senha e aperte Instalar de '
                            . 'novo - o banco e o schema ja estao prontos.'];
                } else {
                    require __DIR__ . '/../api/auth.php';
                    require __DIR__ . '/../api/forms.php';

                    $senhaAdmin = $senha;
                    $criados = admin_seed_users($pdo, $senha, $reset);

                    // 'senha' vem null quando o acesso ja existia e o
                    // reset nao foi pedido: nada foi trocado, entao
                    // anunciar a senha aqui seria mentira.
                    $novos = array_values(array_filter(
                        $criados,
                        static fn($r) => $r['senha'] !== null
                    ));

                    $mantidos = count($criados) - count($novos);

                    if ($novos === []) {
                        $log[] = ['aviso', 'Nenhuma senha foi trocada: os ' . $mantidos
                            . ' acesso(s) ja existiam. Marque "Redefinir as senhas dos acessos '
                            . 'que ja existam" para trocar.'];
                    } else {
                        $log[] = ['ok', count($novos) . ' de ' . count($criados)
                            . ' acesso(s) do painel receberam senha.'
                            . ($mantidos > 0 ? ' Os outros ' . $mantidos . ' foram mantidos.' : '')];
                    }

                    foreach ($criados as $criado) {
                        $log[] = [$criado['senha'] === null ? 'aviso' : 'ok',
                            '  ' . $criado['username'] . ' - ' . $criado['acao']];
                    }
                }
            }
        } catch (Throwable $e) {
            $erroFatal = $e->getMessage();
        }
    }
}

// ---------------------------------------------------------------------
//  Gravar config e chave (usados pelo passo instalar)
// ---------------------------------------------------------------------

/**
 * Escreve api/.db.local.php com as credenciais que funcionaram.
 * Retorna false se o arquivo nao pode ser criado.
 */
function install_gravar_config(array $c): bool
{
    $arquivo = __DIR__ . '/../api/.db.local.php';

    $php = "<?php\n"
         . "/**\n"
         . " * Credenciais gravadas pelo instalador (http://localhost/geekzadaforms/install).\n"
         . " * Este arquivo tem precedencia sobre os padroes de config.php e fica\n"
         . " * abaixo das variaveis de ambiente. Apagar o arquivo faz a API voltar\n"
         . " * para o padrao do XAMPP.\n"
         . " *\n"
         . " * Esta no .gitignore e o .htaccess bloqueia qualquer arquivo que comece\n"
         . " * com ponto, entao ele nunca vai para o git nem para o servidor.\n"
         . " */\n\n"
         . "declare(strict_types=1);\n\n"
         . 'return ' . var_export([
             'DB_HOST' => $c['host'],
             'DB_PORT' => $c['port'],
             'DB_NAME' => $c['db'],
             'DB_USER' => $c['user'],
             'DB_PASS' => $c['pass'],
         ], true) . ";\n";

    return file_put_contents($arquivo, $php, LOCK_EX) !== false;
}

/**
 * Gera api/.secret.key se ela ainda nao existir. Nao sobrescreve: trocar
 * a chave deixaria ilegiveis as senhas ja cifradas.
 *
 * @return int|null tamanho da chave, ou null se nao deu para escrever
 */
function install_garantir_chave(): ?int
{
    $arquivo = __DIR__ . '/../api/.secret.key';

    if (is_file($arquivo)) {
        $atual = trim((string) file_get_contents($arquivo));
        if (strlen($atual) >= 32) {
            return strlen($atual);
        }
    }

    $chave = base64_encode(random_bytes(32));

    if (file_put_contents($arquivo, $chave . "\n", LOCK_EX) === false) {
        return null;
    }

    return strlen($chave);
}

// ---------------------------------------------------------------------
//  Diagnostico
// ---------------------------------------------------------------------
$diag = '<table>';

$diag .= linha('Versao do PHP', PHP_VERSION, version_compare(PHP_VERSION, '7.4', '>='));

$extensoes = ['pdo_mysql', 'openssl', 'mbstring', 'json'];
$faltando  = array_values(array_filter($extensoes, static fn($e) => !extension_loaded($e)));
$diag .= linha('Extensoes exigidas', $faltando === [] ? 'todas presentes' : 'faltando: ' . implode(', ', $faltando), $faltando === []);

$diag .= linha('Raiz do projeto', dirname(__DIR__));
$diag .= linha('api/schema.sql', is_file(__DIR__ . '/../api/schema.sql') ? 'presente' : '', is_file(__DIR__ . '/../api/schema.sql'));

$temChave = is_file(__DIR__ . '/../api/.secret.key')
    && strlen(trim((string) file_get_contents(__DIR__ . '/../api/.secret.key'))) >= 32;
$diag .= linha('api/.secret.key', $temChave ? 'presente e valida' : '', $temChave);

// .db.local.php e opcional: sem ele a API usa o padrao do XAMPP, e isso
// funciona. Por isso a linha nao e tratada como falta - ela so diz de
// onde estao vindo as credenciais.
$salvo = db_config_local();

if (is_file(__DIR__ . '/../api/.db.local.php')) {
    $diag .= linha_html('api/.db.local.php',
        '<span class="ok">gravado</span> &rarr; <code>'
        . esc((string) ($salvo['DB_NAME'] ?? '?')) . '</code>');
} else {
    $diag .= linha_html('api/.db.local.php',
        '<span class="aviso">nao gravado</span> &mdash; a API usa os valores fixos '
        . 'de <code>api/config.php</code>. Instalar cria este arquivo.');
}

$c = install_campos();

// Apos o passo instalar, $c e o banco que acabou de ser criado. Antes
// disso, e o que a API esta usando de verdade.
$diag .= linha('Banco em uso', $c['db'] . ' em ' . $c['host'] . ':' . $c['port']);

$contagens = '';

try {
    $pdo = install_conectar($c, $c['db']);
    $saude = '<span class="ok">conectado</span>';

    $tabelas = install_tabelas($pdo);
    $contagens = count($tabelas) . ' tabela(s).';

    if (in_array('form_submissions', $tabelas, true)) {
        $contagens .= ' ' . (int) $pdo->query('SELECT COUNT(*) FROM `form_submissions`')
            ->fetchColumn() . ' inscricao(oes).';
    }

    if (in_array('admin_users', $tabelas, true)) {
        $contagens .= ' ' . (int) $pdo->query('SELECT COUNT(*) FROM `admin_users`')
            ->fetchColumn() . ' acesso(s) em admin_users.';
    }
} catch (Throwable $e) {
    $saude = '<span class="erro">falhou: ' . esc($e->getMessage()) . '</span>';
}

$diag .= linha_html('Conexao com esse banco', $saude);

$diag .= '</table>';

if ($contagens !== '') {
    $diag .= '<p class="ok">' . esc($contagens) . '</p>';
}

// ---------------------------------------------------------------------
//  Montagem
// ---------------------------------------------------------------------
$base     = install_base();
$raiz     = install_raiz();
$acao_url = $base . '/index.php';

$corpo = '<h1>Instalador GeekZada Forms</h1>'
       . '<p>Prepara o banco e os acessos do painel. Tudo acontece em '
       . '<code>api/</code>; este arquivo nao faz parte do site publicado.</p>';

if ($erroFatal !== null) {
    $corpo .= '<h2 class="erro">Nao deu para continuar</h2><pre class="erro">'
           . esc($erroFatal) . '</pre>';
} elseif ($log !== []) {
    $titulos = ['testar' => 'Teste de conexao', 'instalar' => 'Instalacao'];
    $corpo .= '<h2>' . esc($titulos[$acao]) . '</h2><pre>';

    $ordem = ['erro' => 0, 'aviso' => 1, 'ok' => 2];
            usort($log, static fn($a, $b) => ($ordem[$a[0]] ?? 9) <=> ($ordem[$b[0]] ?? 9));

            foreach ($log as [$nivel, $texto]) {
        $marcador = $nivel === 'ok' ? 'OK   ' : ($nivel === 'aviso' ? 'AVISO' : 'ERRO ');
        $corpo .= '<span class="' . $nivel . '">' . $marcador . '</span> ' . esc($texto) . "\n";
    }

    $corpo .= '</pre>';
}

if ($gravou) {
    $corpo .= '<p class="ok">Credenciais salvas em <code>api/.db.local.php</code>. '
            . 'A API ja passa a usar esse banco, sem precisar reiniciar o Apache.</p>';
}

if ($senhaAdmin !== '') {
    $corpo .= '<p>Senha inicial: <code>' . esc($senhaAdmin) . '</code> '
            . '(vale para os acessos que acabaram de ser criados ou redefinidos). '
            . 'Troque em Acessos &rarr; Senha assim que entrar no painel.</p>';
}

$corpo .= '<h2>Diagnostico</h2>' . $diag;

$corpo .= '<h2>Instalar</h2>'
        . '<p>Um unico formulario: <strong>Testar conexao</strong> so le o banco, '
        . '<strong>Instalar</strong> cria o banco, importa o schema, gera a chave e '
        . 'os 7 acessos. Tudo usa as credenciais abaixo, entao nao ha como um botao '
        . 'mirar um banco e o outro outro.</p>'
        . '<form method="post" action="' . esc($acao_url) . '">'
        . '<input type="hidden" name="csrf" value="' . esc(install_csrf()) . '">'
        . '<div class="linha">'
        . '<div><label for="host">Host</label>'
        . '<input id="host" name="host" value="' . esc($c['host']) . '" required></div>'
        . '<div><label for="port">Porta</label>'
        . '<input id="port" name="port" value="' . esc($c['port']) . '" required></div>'
        . '</div>'
        . '<div class="linha">'
        . '<div><label for="db">Banco</label>'
        . '<input id="db" name="db" value="' . esc($c['db']) . '" required></div>'
        . '<div><label for="user">Usuario</label>'
        . '<input id="user" name="user" value="' . esc($c['user']) . '" required></div>'
        . '<div><label for="pass">Senha do banco</label>'
        . '<input id="pass" name="pass" type="password" autocomplete="off" value=""></div>'
        . '</div>'
        . '<label for="senha">Senha inicial do painel (minimo 8, opcional)</label>'
        . '<input id="senha" name="senha" type="password" autocomplete="new-password" value="">'
        . '<p class="aviso" style="font-size:13px">Vale para os 7 acessos (superadmin '
        . '+ um por categoria). Deixe vazio para pular: o banco e o schema sao criados '
        . 'igualmente, e os acessos podem ser feitos depois por '
        . '<code>api/seed_admin.php</code>.</p>'
        . '<p><label style="display:flex;align-items:center;gap:8px;margin:0">'
        . '<input type="checkbox" name="reset" value="1" style="width:auto"> '
        . 'Redefinir as senhas dos acessos que ja existam</label></p>'
        . '<p><button name="acao" value="testar">Testar conexao</button>'
        . '<button class="sec" name="acao" value="instalar">Instalar</button></p>'
        . '</form>'
        . '<p><a href="' . esc($raiz) . '/">Abrir o site</a> &middot; '
        . '<a href="' . esc($raiz) . '/api/index.php?action=health">'
        . 'API health</a> &middot; login em <code>#admin</code></p>';

pagina('Instalador GeekZada Forms', $corpo);