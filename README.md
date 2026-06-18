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

| Perfil | Usuário | Senha |
|--------|---------|-------|
| Diretor | `diretor1` | `diretor123` |
| Professor | `professor2` | `profesor23` |
| Aluno | `alunos123` | `alunos123` |

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

## Código Publicado no Vercel



`https://trab-poo.vercel.app/`

## Membros

Álvaro Gonçalves de Carvalho, Danton Rodrigues Diniz, Eduardo Nobre de Oliveira Lino, Gustavo Almeida Reis, Matheus Augusto Alves Goveia Damião e Pedro Henrique Alves Emerick.
