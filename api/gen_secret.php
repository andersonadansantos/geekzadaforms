<?php
/**
 * Gera a chave de criptografia das senhas do painel.
 *
 *   php api/gen_secret.php
 *
 * A chave e escrita em api/.secret.key, arquivo bloqueado pelo .htaccess.
 * Rode uma vez so. Se perder a chave, as senhas ja cifradas ficam
 * ilegiveis e todos os acessos precisam de senha nova.
 */

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("Este script so pode ser executado pela linha de comando.\n");
}

$arquivo = __DIR__ . '/.secret.key';

if (is_file($arquivo)) {
    $atual = trim((string) file_get_contents($arquivo));
    if (strlen($atual) >= 32) {
        echo "A chave ja existe em api/.secret.key (".strlen($atual)." caracteres).\n";
        echo "Apague o arquivo antes de gerar outra, se realmente quiser trocar.\n";
        echo "Trocar a chave torna as senhas cifradas atuais ilegiveis.\n";
        exit(0);
    }
}

$chave = base64_encode(random_bytes(32));

if (file_put_contents($arquivo, $chave . "\n") === false) {
    exit("Nao foi possivel escrever api/.secret.key. Verifique as permissoes.\n");
}

echo "Chave gerada em api/.secret.key\n";
echo "Tamanho: " . strlen($chave) . " caracteres\n";
echo "Confirme que o Apache bloqueia esse arquivo:\n";
echo "  http://localhost/geekzadaforms/api/.secret.key  -> deve dar 403\n";
