# Sistema de Gerenciamento Escolar — Colégio Jardim das Acácias

Projeto POO — turmas, login por perfil (Diretor, Professor, Aluno).

**Produção (Vercel):** login seguro com [Supabase](https://supabase.com) — veja [SUPABASE.md](./SUPABASE.md).

**Console (.NET):** ainda usa `usuarios.xml` localmente.

## Estrutura

| Pasta | Descrição |
|-------|-----------|
| `Sistema_Gerenciamento_Escolar/` | Aplicação console (.NET) |
| `Sistema_Gerenciamento_Escolar.Web/` | Versão web local (ASP.NET Core) |
| `public/` + `api/` | Versão para **Vercel** (navegador + API Node.js) |
| `data/` | `usuarios.xml` e dados iniciais da escola |

## Login web (Supabase)

| Perfil | E-mail | Senha (após setup) |
|--------|--------|---------------------|
| Diretor | `diretor@acacias.edu.br` | `Acacias@2025` |
| Professor | `danton@acacias.edu.br` | `Acacias@2025` |
| Aluno | `pedro@acacias.edu.br` | `Acacias@2025` |

## Login console (XML local)

| Perfil | Usuário | Senha |
|--------|---------|-------|
| Diretor | `diretor` | `1234` |
| Professor | `danton` | `1234` |
| Aluno | `pedro` | `1234` |

## Rodar no PC (console)

```powershell
cd Sistema_Gerenciamento_Escolar
dotnet run
```

## Rodar no navegador (local)

```powershell
cd Sistema_Gerenciamento_Escolar.Web
dotnet run
```

Abra: http://localhost:5180

## Publicar na Vercel

1. Suba o código no GitHub: [github.com/cuiudos/trab-poo](https://github.com/cuiudos/trab-poo)
2. Acesse [vercel.com](https://vercel.com) → **Add New Project**
3. Importe o repositório `cuiudos/trab-poo`
4. Deixe **Root Directory** em branco (raiz do repositório)
5. Framework: **Other** (detecta `api/` e `public/` automaticamente)
6. Clique em **Deploy**

A URL ficará no formato: `https://trab-poo.vercel.app`

## Membros

Álvaro Gonçalves de Carvalho, Danton Rodrigues Diniz, Eduardo Nobre de Oliveira Lino, Gustavo Almeida Reis, Matheus Augusto Alves Goveia Damião e Pedro Henrique Alves Emerick.
