# Supabase — Colégio Jardim das Acácias

Login seguro com **Supabase Auth** (senha criptografada, JWT, sessão renovável). Dados em PostgreSQL com **Row Level Security (RLS)**.

## 1. Criar projeto Supabase

1. Acesse [supabase.com](https://supabase.com) → **New project**
2. Anote em **Settings → API**:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** → `SUPABASE_ANON_KEY`
   - **service_role** → `SUPABASE_SERVICE_ROLE_KEY` (secreta, nunca no frontend)

## 2. Criar tabelas

No **SQL Editor**, cole e execute o arquivo:

`supabase/schema.sql`

## 3. Variáveis na Vercel

Em [vercel.com](https://vercel.com) → seu projeto → **Settings → Environment Variables**:

| Nome | Valor |
|------|--------|
| `SUPABASE_URL` | URL do projeto |
| `SUPABASE_ANON_KEY` | chave anon |
| `SUPABASE_SERVICE_ROLE_KEY` | chave service_role |

Faça **Redeploy** após salvar.

## 4. Criar usuários de teste (local)

Na raiz do projeto:

```powershell
copy .env.example .env
# Edite .env com suas chaves

npm install
node scripts/setup-supabase.mjs
```

Isso cria:

| Perfil | Usuário | Senha |
|--------|---------|-------|
| Diretor | `diretor1` | `diretor123` |
| Professor | `professor2` | `profesor23` |
| Aluno | `alunos123` | `alunos123` |

No portal web, digite só o **usuário** (ex: `diretor1`) — o sistema completa `@acacias.edu.br` automaticamente.

Escola fictícia: **Colégio Jardim das Acácias**

## 5. Segurança (como site profissional)

- Senhas **não** ficam em XML — só no Supabase Auth (hash bcrypt)
- Login valida **perfil** (aba Diretor/Professor/Aluno)
- **RLS** impede aluno ver dados de outros
- Professor só altera alunos da **turma vinculada**
- Criar usuários: apenas diretor, via API com `service_role`

## 6. Desativar confirmação de e-mail (desenvolvimento)

**Authentication → Providers → Email** → desative *Confirm email* se quiser login imediato nos testes.
