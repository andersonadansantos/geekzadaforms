<?php
/**
 * Cria (ou reseta) os usuarios do painel administrativo, pela linha de comando.
 *
 *   superadmin            -> ve todas as categorias e pode limpar tabelas
 *   admin_kpop            -> categoria kpop
 *   admin_cosplayer       -> categoria cosplayerperf
 *   admin_arena           -> categoria arena
 *   admin_imprensa        -> categoria imprensa
 *   admin_estandista      -> categoria estandista
 *   admin_usinageek       -> categoria usinageek
 *
 * Uso (via PHP CLI):
 *   php api/seed_admin.php                 cria os usuarios se ainda nao existirem
 *   php api/seed_admin.php --reset         redefine a senha de todos
 *   php api/seed_admin.php --senha=xxxx    usa outra senha inicial
 *
 * Em hospedagem compartilhada, sem SSH, use api/install.php pelo navegador.
 * A logica dos dois e a mesma: vive em admin_seed_users(), no auth.php.
 */

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("Este script so pode ser executado pela linha de comando.\n");
}

require __DIR__ . '/config.php';
require __DIR__ . '/auth.php';
require __DIR__ . '/forms.php';

$argvOptions = getopt('', ['reset', 'senha:']);
$reset      = array_key_exists('reset', $argvOptions);
$senha      = $argvOptions['senha'] ?? 'geekzada2026';

if (strlen($senha) < 6) {
    exit("A senha precisa ter ao menos 6 caracteres.\n");
}

$pdo = db();

// admin_users tem FK para form_catalog, entao o catalogo precisa existir.
// Ele e criado por api/schema.sql e nao e alterado aqui de proposito: os
// rotulos ("K-Pop") e o sort_order (ordem das abas) vem de la.
$faltando = admin_categorias_ausentes($pdo);

if ($faltando) {
    exit("Categorias ausentes em form_catalog: " . implode(', ', $faltando)
        . "\nRode antes:  mysql -u root geekzada < api/schema.sql\n");
}

echo "Usuarios do painel\n";
echo str_repeat('-', 74) . "\n";
printf("%-18s %-14s %-16s %s\n", 'USUARIO', 'SENHA', 'PAPEL', 'CATEGORIA');
echo str_repeat('-', 74) . "\n";

$categorias = [];
foreach (admin_categorias_com_admin() as $c) {
    $categorias[$c['username']] = $c['form'];
}

foreach (admin_seed_users($pdo, $senha, $reset) as $r) {
    printf(
        "%-18s %-14s %-16s %s\n",
        $r['username'],
        $r['senha'] ?? '(inalterada)',
        $r['username'] === 'superadmin' ? 'superadmin' : 'admin',
        $categorias[$r['username']] ?? 'todas'
    );
    echo "  -> $r[acao]\n";
}

echo str_repeat('-', 74) . "\n";
echo "Login: http://localhost/geekzadaforms/#admin\n";
echo "O login e o hash nao dependem da chave de .secret.key; ela so permite\n";
echo "exibir as senhas na aba Acessos.\n";
