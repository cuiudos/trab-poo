/**
 * Cria usuários de teste no Supabase Auth + perfis.
 * Logins: diretor1, profesor2, alunos123
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const DOMINIO = "acacias.edu.br";

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

const usuarios = [
  {
    login: "diretor1",
    password: "diretor123",
    nome: "Álvaro Gonçalves de Carvalho",
    cpf: "11111111111",
    role: "diretor",
  },
  {
    login: "profesor2",
    password: "profesor23",
    nome: "Danton Rodrigues Diniz",
    cpf: "22222222222",
    role: "professor",
    disciplina: "Matemática",
  },
  {
    login: "alunos123",
    password: "alunos123",
    nome: "Pedro Henrique Alves Emerick",
    cpf: "66666666666",
    role: "aluno",
    turma: "3º Ano A",
    nota: 10,
    faltas: 1,
  },
];

async function main() {
  const { data: escola, error: escErr } = await admin
    .from("escolas")
    .select("id")
    .eq("slug", ESCOLA_SLUG)
    .single();

  if (escErr || !escola) {
    console.error("Escola não encontrada. Execute supabase/schema.sql primeiro.");
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
    const email = `${u.login}@${DOMINIO}`;

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: u.password,
      email_confirm: true,
    });

    let userId = created?.user?.id;

    if (createErr) {
      if (createErr.message?.includes("already") || createErr.status === 422) {
        const { data: list } = await admin.auth.admin.listUsers();
        const found = list?.users?.find((x) => x.email === email);
        if (!found) throw createErr;
        userId = found.id;
        await admin.auth.admin.updateUserById(userId, { password: u.password });
        console.log(`Atualizado: ${u.login} (${email})`);
      } else throw createErr;
    } else {
      console.log(`Criado: ${u.login} (${email})`);
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
        nota: u.nota ?? 0,
        faltas: u.faltas ?? 0,
      });
    }
  }

  console.log("\n✓ Colégio Jardim das Acácias — logins prontos:");
  console.log("  Diretor   → diretor1   / diretor123");
  console.log("  Professor → profesor2  / profesor23");
  console.log("  Aluno     → alunos123  / alunos123");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
