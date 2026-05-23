/**
 * Script único para criar usuários de teste no Supabase Auth + perfis.
 *
 * Uso:
 *   1. Crie projeto em https://supabase.com
 *   2. Execute supabase/schema.sql no SQL Editor
 *   3. Copie .env.example para .env e preencha SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY
 *   4. node scripts/setup-supabase.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnv() {
  const path = resolve(root, ".env");
  if (!existsSync(path)) {
    console.error("Arquivo .env não encontrado. Copie .env.example para .env");
    process.exit(1);
  }
  const lines = readFileSync(path, "utf8").split("\n");
  const env = {};
  for (const line of lines) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim();
  }
  return env;
}

const env = loadEnv();
const url = env.SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ESCOLA_SLUG = "jardim-das-acacias";
const SENHA_PADRAO = "Acacias@2025";

const usuarios = [
  {
    email: "diretor@acacias.edu.br",
    nome: "Álvaro Gonçalves de Carvalho",
    cpf: "11111111111",
    role: "diretor",
  },
  {
    email: "danton@acacias.edu.br",
    nome: "Danton Rodrigues Diniz",
    cpf: "22222222222",
    role: "professor",
    disciplina: "Matemática",
  },
  {
    email: "gustavo@acacias.edu.br",
    nome: "Gustavo Almeida Reis",
    cpf: "33333333333",
    role: "professor",
    disciplina: "Português",
  },
  {
    email: "eduardo@acacias.edu.br",
    nome: "Eduardo Nobre de Oliveira Lino",
    cpf: "44444444444",
    role: "aluno",
    turma: "3º Ano A",
  },
  {
    email: "matheus@acacias.edu.br",
    nome: "Matheus Augusto Alves Goveia Damião",
    cpf: "55555555555",
    role: "aluno",
    turma: "3º Ano A",
  },
  {
    email: "pedro@acacias.edu.br",
    nome: "Pedro Henrique Alves Emerick",
    cpf: "66666666666",
    role: "aluno",
    turma: "3º Ano A",
  },
];

async function main() {
  const { data: escola, error: escErr } = await admin
    .from("escolas")
    .select("id")
    .eq("slug", ESCOLA_SLUG)
    .single();

  if (escErr || !escola) {
    console.error("Escola não encontrada. Execute schema.sql primeiro.");
    process.exit(1);
  }

  let turmaId = null;
  const { data: turmaExistente } = await admin
    .from("turmas")
    .select("id")
    .eq("escola_id", escola.id)
    .eq("nome", "3º Ano A")
    .maybeSingle();

  if (turmaExistente) turmaId = turmaExistente.id;
  else {
    const { data: novaTurma, error: turmaErr } = await admin
      .from("turmas")
      .insert({ escola_id: escola.id, nome: "3º Ano A" })
      .select("id")
      .single();
    if (turmaErr) throw turmaErr;
    turmaId = novaTurma.id;
  }

  let professorVinculado = null;

  for (const u of usuarios) {
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: u.email,
      password: SENHA_PADRAO,
      email_confirm: true,
    });

    let userId = created?.user?.id;

    if (createErr) {
      if (createErr.message?.includes("already") || createErr.status === 422) {
        const { data: list } = await admin.auth.admin.listUsers();
        const found = list?.users?.find((x) => x.email === u.email);
        if (!found) throw createErr;
        userId = found.id;
        console.log(`Usuário já existe: ${u.email}`);
      } else throw createErr;
    } else {
      console.log(`Criado: ${u.email}`);
    }

    await admin.from("perfis").upsert({
      id: userId,
      escola_id: escola.id,
      nome: u.nome,
      cpf: u.cpf,
      role: u.role,
      disciplina: u.disciplina ?? null,
    });

    if (u.role === "professor" && !professorVinculado) {
      professorVinculado = userId;
      await admin.from("turmas").update({ professor_id: userId }).eq("id", turmaId);
    }

    if (u.role === "aluno") {
      await admin.from("registros_alunos").upsert({
        perfil_id: userId,
        turma_id: turmaId,
        nota: u.email.includes("pedro") ? 10 : 0,
        faltas: u.email.includes("pedro") ? 1 : 0,
      });
    }
  }

  console.log("\n✓ Setup concluído — Colégio Jardim das Acácias");
  console.log(`  Senha padrão de todos: ${SENHA_PADRAO}`);
  console.log("  Emails: diretor@acacias.edu.br, danton@acacias.edu.br, pedro@acacias.edu.br, ...");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
