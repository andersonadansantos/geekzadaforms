# Geekzada Forms — Inscrições 2026

Formulários de inscrição do Geekzada, migrados do Supabase para **MySQL**.
React + Vite no front, API REST em PHP no back, tudo no mesmo banco `geekzada`.

## Como está organizado no banco

Todos os formulários usam **um único banco**, e são separados pelo par
`(form_submissions.id, form_submissions.form_id)`:

| Tabela | Papel |
|---|---|
| `form_catalog` | Catálogo dos formulários existentes (chave, rótulo, tabela) |
| `form_submissions` | **Tabela mestra**: gera o ID, guarda `form_id`, data, IP e o payload bruto em `data_json` |
| `kpop_registrations` | Detalhe do K-Pop |
| `cosplayer_registrations` | Detalhe do Cosplayer Performance |
| `arena_registrations` | Detalhe do Arena Gamer |
| `press_registrations` | Detalhe da Imprensa |
| `estandista_registrations` | Detalhe dos Expositores |
| `usinageek_registrations` | Detalhe da Usina Geek |
| `v_all_submissions` | View unificada: todos os formulários em uma consulta |

Cada tabela de detalhe usa o **mesmo `id`** da tabela mestra (FK `ON DELETE CASCADE`),
então cada formulário tem suas próprias colunas tipadas — o que mantém o
export para Excel com os cabeçalhos corretos — sem perder a visão unificada.

As listas múltiplas do formulário de expositores (`main_products`, `food_options`,
`food_needs`, `interactive_experiences`) ficam em colunas `*_json` e voltam ao
front como arrays.

## Instalação

### 1. Banco de dados

```bash
C:\xampp\mysql\bin\mysql.exe -u root < api\schema.sql
```

O script cria o banco `geekzada` se não existir, todas as tabelas, a view e o
catálogo. É seguro rodar de novo (`CREATE TABLE IF NOT EXISTS` + `INSERT ... ON DUPLICATE KEY`).

Para ver tudo junto:

```sql
SELECT * FROM geekzada.v_all_submissions ORDER BY id DESC;
```

### 2. Conexão

As credenciais são resolvidas nesta ordem, da maior para a menor:

| Fonte | Onde | Quando usar |
|---|---|---|
| Variável de ambiente | `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS` | hospedagem que configure o ambiente |
| `api/.db.local.php` | gravado pelo instalador | conexão local que não é o padrão do XAMPP |
| Padrão | `api/config.php` | XAMPP: `127.0.0.1:3306`, `root`, senha vazia |

Apagar `api/.db.local.php` faz a API voltar para o padrão.

## Instalador local

**http://localhost/geekzadaforms/install**

Uma tela para deixar o banco em pé sem sair do navegador:

| Passo | O que faz |
|---|---|
| **Testar conexão** | abre o PDO com as credenciais digitadas e diz a versão do MySQL e quantas tabelas existem |
| **Instalar** | cria o banco, importa `api/schema.sql`, gera `api/.secret.key`, grava `api/.db.local.php` e cria os 7 acessos do painel |

Os dois botões estão no **mesmo formulário** e usam as mesmas credenciais —
não há dois formulários que possam mirar bancos diferentes. A senha do banco
nunca volta no HTML do formulário (o campo é zerado ao reenviar), e a senha
inicial do painel só é exibida na resposta do passo que a aplicou.

O diagnóstico do topo mostra a versão do PHP, as extensões exigidas, se o
`schema.sql` e a `.secret.key` existem, de onde vêm as credenciais
(`api/.db.local.php` ou os padrões de `config.php`) e quantas inscrições e
acessos há no banco em uso.

Rolar de novo é seguro: o `schema.sql` usa `CREATE TABLE IF NOT EXISTS` e o
seed mantém os acessos que já existem, a menos que a caixa *Redefinir as
senhas dos acessos que já existam* esteja marcada. Sem senha preenchida,
o instalador deixa os acessos como estão e avisa que nada foi trocado — ele
não redefine senha nenhuma por conta própria.

Ambos funcionam nas URLs `…/install` e `…/install/`. Isso exige o
`DirectorySlash Off` e o `install/.htaccess` na raiz do projeto: sem isso o
Apache responde `301` para `/install/` e o navegador converte o POST em GET,
o formulário chega ao PHP sem nenhum campo e a página abre normalmente sem
executar nada.

### Quem pode abrir

Só requisições do próprio servidor (`127.0.0.1` ou `::1`), mais um token de
sessão contra CSRF. A pasta `install/` não entra no pacote de deploy, mas o
`.htaccess` é o mesmo nos dois ambientes — por isso a trava de endereço está
no próprio PHP e não só na configuração do servidor.

### Onde ficam as credenciais

No `api/.db.local.php`, que está no `.gitignore` e é bloqueado pelo
`.htaccess` (o `FilesMatch "^\.""` nega qualquer arquivo que comece com
ponto). O `config.php` não muda de uma instalação para a outra.

### 3. Rodar

```bash
npm install
npm run build
```

Depois abra **http://localhost/geekzadaforms/install** e clique em
**Instalar** — ele cria o banco, importa o schema e os 7 acessos. Para
trabalhar com recarga automática durante o desenvolvimento:

```bash
npm run dev      # http://localhost:3000/geekzadaforms/
```

O `vite.config.ts` encaminha as chamadas `/api` para o PHP no Apache, então o
front em modo dev conversa com o mesmo banco.

### 4. Publicar

```bash
npm run build            # build para o XAMPP local (http://localhost/geekzadaforms/)
npm run build:hostinger  # build para a raiz de um dominio publicado
npm run deploy           # build:hostinger + monta a pasta deploy/ para enviar por FTP
```

O build vai para `dist/`. O `.htaccess` da raiz publica esse conteúdo, executa a
API em `api/index.php` e bloqueia `src/`, `node_modules/`, `*.sql`, `*.json` e os
arquivos de configuração.

**Não é preciso ajustar caminho para publicar.** O `.htaccess` não usa
`RewriteBase` justamente para o mesmo arquivo servir no XAMPP e na raiz de um
domínio. O que muda entre os dois builds é só a URL de referência dos assets e
da API, resolvida por `.env.xampp` e `.env.hostinger`.

## Publicar na Hostinger (sem SSH)

```bash
npm run deploy
```

Isso gera `deploy/`, que é o que sobe para `public_html/`:

```
deploy/
  .htaccess          mesmo arquivo que roda no XAMPP
  dist/              build do front (index.html + assets)
  api/               index.php, auth.php, forms.php, config.php,
                     install.php, schema.sql e .secret.key
  COMO-INSTALAR.txt  passo a passo
```

Passos:

1. **Banco** — no hPanel, criar um banco MySQL e um usuário com todos os
   privilégios. Anotar host, nome, usuário e senha (o host costuma ser
   `mysql123.hostinger.com.br`).
2. **Credenciais** — em `deploy/api/config.php`, trocar `DB_HOST`, `DB_NAME`,
   `DB_USER` e `DB_PASS`. O arquivo é servido com 403, então as credenciais
   não ficam públicas.
3. **Schema** — no phpMyAdmin, selecionar o banco e usar *Importar* com
   `deploy/api/schema.sql`.
4. **FTP** — enviar o **conteúdo** de `deploy/` para `public_html/`. Só isso:
   `src/`, `node_modules/` e os arquivos de build não sobem.
5. **Token** — criar `api/.install_token` com um texto secreto, ex.:
   `k7Rm2Qp9Lx4Tv8Nc` (uma linha).
6. **Criar os acessos** — sem SSH, `seed_admin.php` não roda. Use o
   `install.php`, que faz o mesmo trabalho por HTTP:

   ```bash
   curl -X POST https://SEUDOMINIO/api/install.php \
     -H "Content-Type: application/json" \
     -d '{"token":"k7Rm2Qp9Lx4Tv8Nc","senha":"senha inicial forte"}'
   ```

7. **Apagar o instalador** — remover `api/install.php` do servidor.
8. **HTTPS** — ativar o certificado grátis no hPanel e forçar HTTPS. A cópia
   das senhas usa a Área de Transferência, que o navegador só libera em HTTPS.

### Sobre o `install.php`

Ele existe porque hospedagem compartilhada quase nunca tem terminal, e os 7
acessos dependem de `password_hash()`, que não dá para escrever à mão no
phpMyAdmin. Mesmo trabalho do `seed_admin.php` (ambos chamam
`admin_seed_users()`), com três travas:

| Trava | Comportamento |
|---|---|
| Só POST | abrir a URL no navegador não instala nada (405) |
| Token obrigatório | sem o token certo, 403 |
| Uso único | se `admin_users` já tiver linhas, 409 e não faz mais nada |

Exige também que `api/.secret.key` esteja no servidor, senão recusa — sem a
chave as senhas ficariam sem a cópia cifrada que a aba Acessos exibe.

## API

Base: `api/index.php`

| Ação | Método | Parâmetros | Retorno |
|---|---|---|---|
| `health` | GET | — | `{ ok, database, tables, forms }` |
| `counts` | GET | — | `{ counts: { form_id: total } }` |
| `list` | GET | `form_id` | `{ form_id, count, data[] }` |
| `submit` | POST | `{ form_id, data }` | `{ ok, id, form_id }` |
| `delete` | POST | `{ id }` | `{ ok, id, form_id }` |
| `delete-all` | POST | `{ form_id }` | `{ ok, form_id, deleted }` |

`form_id` aceita `kpop`, `cosplayerperf` (também `cosplayer`), `arena`,
`imprensa`, `estandista`, `usinageek`.

Exemplo:

```bash
curl -X POST "http://localhost/geekzadaforms/api/index.php?action=submit" \
  -H "Content-Type: application/json" \
  -d '{"form_id":"arena","data":{"name":"Carlos","email":"c@e.com","whatsapp":"11999999999","city":"Campinas"}}'
```

Os nomes de tabela e coluna nunca vêm do input do usuário: `api/forms.php`
é a única fonte de verdade e monta o SQL com prepared statements.

## Painel administrativo

`http://localhost/geekzadaforms/#admin` (link "Admin" no rodapé de todas as páginas)

### Contas

São **7 acessos**: um `superadmin` e um `admin` para cada uma das 6 categorias.
Todos entram pela mesma tela de login. A senha inicial de todos é a mesma.

| Usuário | Papel | Categoria | Senha inicial |
|---|---|---|---|
| `superadmin` | superadmin | todas | `geekzada2026` |
| `admin_kpop` | admin | K-Pop | `geekzada2026` |
| `admin_cosplayer` | admin | Cosplayer | `geekzada2026` |
| `admin_arena` | admin | Arena Gamer | `geekzada2026` |
| `admin_imprensa` | admin | Imprensa | `geekzada2026` |
| `admin_estandista` | admin | Expositores | `geekzada2026` |
| `admin_usinageek` | admin | Usina Geek | `geekzada2026` |

**Troque essas senhas antes de publicar.** O endpoint existe e valida a senha
atual, encerrando as outras sessões do usuário:

```
POST api/index.php?action=change-password
Authorization: Bearer <token>
{ "current_password": "...", "new_password": "..." }
```

Para redefinir todas de uma vez pela linha de comando:

```bash
C:\xampp\php\php.exe api\seed_admin.php --reset
C:\xampp\php\php.exe api\seed_admin.php --reset --senha=outra-senha
```

O script é idempotente: sem `--reset` ele só recria o que estiver faltando.
Ele recusa rodar pelo navegador (só pela linha de comando) e o `.htaccess`
bloqueia o download de `auth.php`, `seed_admin.php` e `config.php`.

### O que cada papel pode fazer

| | superadmin | admin de categoria |
|---|---|---|
| Ver inscrições | todas | só a da categoria dele |
| Contadores | todos | só o da categoria dele |
| Exportar Excel | sim | sim |
| Apagar um registro | sim | só da categoria dele |
| **Limpar Tabela** (apaga tudo) | sim | **não** |
| Trocar a própria senha | sim | sim |

O botão "Limpar Tabela" nem aparece para o admin de categoria.

### Aba "Acessos" (só superadmin)

No topo do painel há duas abas: **Inscrições** e **Acessos**. A segunda é
visível apenas para o superadmin e lista os 7 acessos com usuário, **senha**,
nome, papel, categoria, último acesso, sessões abertas e status
(ativo/inativo).

A senha aparece mascarada (`••••••••`). Por linha há dois ícones:

- **olho** — mostra ou esconde a senha daquela linha;
- **cópia** — manda `usuario: senha` para a área de transferência, para colar
  direto num chat ou e-mail.

No topo há ainda **Copiar todos**, que leva todos os usuários e senhas de uma
vez, separados por tabulação.

> **Atenção:** isso exige guardar uma cópia da senha de forma reversível.
> Veja "Como a senha é guardada" abaixo. Toda vez que a aba é aberta, o acesso
> é registrado em `admin_audit_log` como `passwords_revealed`.

Por linha há ainda o botão **Senha**, que abre a troca. Deixe o campo vazio e o servidor **gera uma senha
  forte de 12 caracteres** (sem `0/O`, `1/l/I`, para não causar erro de
  digitação), que aparece na tela **uma única vez**, com botão de copiar. Ou
  digite uma senha sua. Nos dois casos as sessões abertas daquele usuário são
  encerradas.
- **Ativar / desativar** — bloqueia ou libera o acesso. Desativado, o login
  volta 403. O superadmin não pode desativar a si mesmo.

### Como a senha é guardada

A senha é guardada **duas vezes**, e é importante saber disso:

| Coluna | Formato | Para que serve |
|---|---|---|
| `password_hash` | bcrypt (`$2y$10$...`) | é o que valida o login |
| `password_crypt` | AES-256-GCM, em base64 | permite ao superadmin exibir a senha |

O texto puro nunca é gravado no banco. A cópia cifrada depende de uma chave de
32 bytes guardada em `api/.secret.key`, gerada assim:

```bash
C:\xampp\php\php.exe api\gen_secret.php
```

Para usar outra chave (ou a mesma em outro servidor), defina a variável de
ambiente `ADMIN_SECRET_KEY` com o conteúdo em base64.

O que isso significa na prática:

- **Quem tiver só o banco não consegue ler as senhas** sem a chave — o
  `password_crypt` é ilegível sem ela.
- **Quem tiver o arquivo `.secret.key` consegue decifrar todas as senhas.**
  Trate esse arquivo como uma senha: não versione, não mande por e-mail e
  guarde um backup em local seguro. Está no `.gitignore` e o `.htaccess`
  bloqueia o download por HTTP (inclusive `gen_secret.php`).
- **Perder a chave não quebra o login** — o bcrypt continua valendo — mas as
  senhas param de aparecer na aba "Acessos" até cada acesso ter a senha
  redefinida (`api/seed_admin.php --reset`).
- Alternar entre chave e texto puro é a diferença entre "ninguém vê" e
  "quem invade o servidor vê todas". Se um dia a aba "Acessos" não precisar mais
  mostrar senhas, apague a coluna `password_crypt` e o `senha` da resposta da
  API: o login segue idêntico.

Outras medidas:

- No login o servidor gera um token aleatório de 256 bits e devolve no
  cabeçalho `Authorization: Bearer <token>`.
- No banco fica **apenas o SHA-256 do token** (`admin_sessions.token_hash`),
  então um dump da tabela não permite forjar uma sessão.
- A sessão vale 8 horas; depois disso o servidor devolve 401 e o app volta
  para a tela de login.
- 8 senhas erradas para o mesmo usuário travam a conta por 15 minutos.
- Tudo que é lido ou excluído passa por `admin_audit_log`.

### Importante sobre hospedagem

O `.htaccess` repassa o cabeçalho `Authorization` para o PHP com
`SetEnvIf Authorization`. **Se publicar em um servidor que não usa esse
`.htaccess` (Apache com `AllowOverride None`), o token não chega ao PHP e
todo acesso ao painel retorna 401.** Nesse caso, defina `CGIPassAuth On` no
`php.ini` ou adicione o `SetEnvIf` no `httpd.conf` do servidor.

Os **formulários públicos continuam sem login** (`action=submit`) — quem se
inscreve não precisa de conta, e nenhuma alteração de CPF/RG foi feita
nesse ponto.

## Estrutura do projeto

```
install/
  index.php      instalador local: diagnóstico, conexão, schema e acessos
  .htaccess      DirectoryIndex para o instalador funcionar sem barra final
api/
  index.php      roteador da API (submit + login/logout/me + painel)
  auth.php       login, sessão por token, papéis e escopo por categoria
  seed_admin.php cria os 7 acessos do painel (linha de comando)
  gen_secret.php gera a chave AES de 32 bytes (linha de comando)
  .secret.key    chave mestra das senhas — não versionar, não compartilhar
  .db.local.php  credenciais gravadas pelo instalador — não versionar
  config.php     conexão PDO com o banco geekzada
  forms.php      colunas tipadas de cada formulário + conversão de valores
  schema.sql     banco, tabelas, view, catálogo, usuários, sessões e auditoria
src/
  apiClient.ts   cliente HTTP + sessão do painel (token no sessionStorage)
  pages/         LandingPage, AdminLogin, AdminDashboard
.htaccess        publica dist/, bloqueia arquivos internos e repassa Authorization
```
