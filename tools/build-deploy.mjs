import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
// O build de producao sai em dist-hostinger/ (ver vite.config.ts) para nao
// sobrescrever a dist/ que o XAMPP local usa.
const dist = join(root, 'dist-hostinger');
const out = join(root, 'deploy');

if (!existsSync(join(dist, 'index.html'))) {
  console.error('Falta ' + dist + '/index.html. Rode antes: npm run build:hostinger');
  process.exit(1);
}

if (existsSync(out)) {
  rmSync(out, { recursive: true, force: true });
}
mkdirSync(out);

// Layout identico ao do projeto: index.html e assets dentro de dist/, com o
// .htaccess fazendo o DirectoryIndex. O mesmo arquivo .htaccess serve o
// XAMPP local e a producao, porque as substituicoes sao relativas.
cpSync(dist, join(out, 'dist'), { recursive: true });

const apiSrc = join(root, 'api');
const apiDest = join(out, 'api');
mkdirSync(apiDest);

for (const f of [
  'index.php',
  'auth.php',
  'forms.php',
  'config.php',
  'install.php',
  'schema.sql',
  'seed_admin.php',
  'gen_secret.php',
  '.secret.key',
]) {
  const src = join(apiSrc, f);
  if (existsSync(src)) {
    cpSync(src, join(apiDest, f));
  }
}

// Copiado verbatim: e' o mesmo .htaccess que roda no XAMPP.
cpSync(join(root, '.htaccess'), join(out, '.htaccess'));


//Guia de instalacao dentro do pacote: o usuario nao precisa lembrar nada.
const guia = `COMO INSTALAR NA HOSTINGER (sem SSH)
=============================================

1. BANCO DE DADOS
   No hPanel > Bancos de Dados MySQL, crie um banco e um usuario com
   todos os privilegios. Anote host, usuario, senha e nome do banco.

2. EDITAR AS CREDENCIAIS
   Abra api/config.php e troque os valores fixos no topo do arquivo:
       DB_HOST, DB_NAME, DB_USER, DB_PASS
   (host costuma ser algo como mysql123.hostinger.com.br)

3. IMPORTAR O BANCO
   No phpMyAdmin, selecione o banco criado e use Importar > api/schema.sql.
   Isso cria todas as tabelas e o catalogo de categorias.

4. ENVIAR OS ARQUIVOS
   Envie o CONTEUDO desta pasta para public_html/ (FTP).
   Atencao: .htaccess e api/.secret.key comecam com ponto e muitos
   clientes de FTP pulam dotfiles. Ligue "mostrar arquivos ocultos" ou
   envie esses dois arquivos por outro meio. Confira se arrived.

5. DEFINIR O TOKEN DE INSTALACAO
   Crie um arquivo api/.install_token com um texto secreto qualquer,
   por exemplo:   k7Rm2Qp9Lx4Tv8Nc
   (uma linha, sem espaco nas pontas)

6. CRIAR OS 7 ACESSOS
   Abra no navegador e faca um POST para:
       https://SEUDOMINIO/api/install.php
   com o corpo JSON:
       {"token":"k7Rm2Qp9Lx4Tv8Nc","senha":"senha inicial forte"}

   Se preferir, use o terminal online do hPanel ou qualquer cliente HTTP.
   Sem isso, os acessos nao existem: o login volta 401.

7. APAGAR O INSTALADOR
   Apague api/install.php do servidor. Ele ja cumpriu seu papel.
   (Ele se bloqueia sozinho depois do primeiro uso, mas apagar e o
   mais seguro. Se preferir manter o arquivo, acrescente install.php
   ao <FilesMatch> do .htaccess, junto de config.php e auth.php.)

8. HTTPS
   Ative o certificado SSL gratuit no hPanel e force HTTPS. A copia das
   senhas usa a Area de Transferencia, que o navegador so libera em HTTPS.

OBSERVACAO
   Os 7 acessos nascem com must_change_password ligado. Entre no painel
   e troque a senha inicial em Acessos -> Senha.
   O catalogo de categorias (K-Pop, Arena Gamer, ...) vem do schema.sql;
   para mudar rotulos ou a ordem das abas, edite form_catalog no
   phpMyAdmin e nao a tabela no codigo.
`;

writeFileSync(join(out, 'COMO-INSTALAR.txt'), guia);

console.log('deploy/ pronto para enviar por FTP');
