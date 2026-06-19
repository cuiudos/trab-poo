# Sistema de Gerenciamento Escolar — Colégio Jardim das Acácias

Projeto acadêmico de POO com gestão de turmas, notas, frequência e login por perfil (Diretor, Professor, Aluno).

## Portal em produção (Vercel)

**URL:** https://trab-poo.vercel.app/

Autenticação com [Supabase](https://supabase.com) (PostgreSQL + Auth, senhas criptografadas). Configuração completa em [SUPABASE.md](./SUPABASE.md).

| Perfil | Usuário | Senha |
|--------|---------|-------|
| Diretor | `diretor1` | `diretor123` |
| Professor | `professor2` | `profesor23` |
| Aluno | `alunos123` | `alunos123` |

No login, digite só o **usuário** (ex.: `diretor1`) — o sistema completa `@acacias.edu.br` automaticamente.

## Estrutura do repositório

| Pasta | Descrição |
|-------|-----------|
| `public/` + `api/` | Frontend e APIs serverless deployados na **Vercel** |
| `supabase/` | Schema SQL e migrações do banco PostgreSQL |
| `Sistema_Gerenciamento_Escolar/` | Aplicação **console** (.NET) — dados em `usuarios.xml` |
| `Sistema_Gerenciamento_Escolar.Web/` | Versão web **local** (ASP.NET Core + XML), sem Supabase |
| `data/` | Cópia de referência de `usuarios.xml` e `dados_escola.json` |

## Funcionalidades

- **Diretor:** cadastro e edição de usuários (CPF, matrícula, responsável), turmas e vínculo professor–turma
- **Professor:** livro de notas por atividade, frequência e faltas por disciplina
- **Aluno:** boletim com notas, percentual de faltas e situação por disciplina

O portal web é **responsivo** e funciona em celular e desktop.

## Rodar o console (.NET)

```powershell
cd Sistema_Gerenciamento_Escolar
dotnet run
```

Os dados são gravados em `Sistema_Gerenciamento_Escolar/usuarios.xml` (não em `data/`).

## Rodar a web local (ASP.NET)

```powershell
cd Sistema_Gerenciamento_Escolar.Web
dotnet run
```

Abra: http://localhost:5180 — usa `Data/usuarios.xml` localmente, sem Supabase.

## Configurar Supabase (primeira vez)

Na raiz do projeto:

```powershell
copy .env.example .env
# Edite .env com SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY

npm install
npm run setup
```

Depois execute os scripts SQL em `supabase/` no painel do Supabase (ordem em [SUPABASE.md](./SUPABASE.md)).

Para testar a stack Vercel localmente (frontend + APIs):

```powershell
npx vercel dev
```

## Deploy na Vercel

Push na branch `main` do repositório conectado dispara o deploy automaticamente. Variáveis de ambiente necessárias: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

## Membros

Álvaro Gonçalves de Carvalho, Danton Rodrigues Diniz, Eduardo Nobre de Oliveira Lino, Gustavo Almeida Reis, Matheus Augusto Alves Goveia Damião e Pedro Henrique Alves Emerick.
