/**
 * Cria usuários de teste no Supabase Auth + perfis.
 * Logins: diretor1, profesor2, alunos123
 *
 * Se der "fetch failed" no Windows, use:
 *   npm run setup
 * ou:
 *   .\scripts\setup-supabase.ps1
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

async function configurarSslWindows() {
  if (process.env.SUPABASE_INSECURE_SSL === "1") {
    const { Agent, setGlobalDispatcher } = await import("undici");
    setGlobalDispatcher(new Agent({ connect: { rejectUnauthorized: false } }));
    console.warn("⚠ SSL verification disabled (SUPABASE_INSECURE_SSL=1)");
  }
}

await configurarSslWindows();

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const DOMINIO = "acacias.edu.br";
const ESCOLA_NOME = "Colégio Jardim das Acácias";
const ESCOLA_SLUG = "jardim-das-acacias";

function loadEnv() {
  const path = resolve(root, ".env");
  if (!existsSync(path)) {
    console.error("Arquivo .env não encontrado. Copie .env.example para .env");
    process.exit(1);
  }
  let text = readFileSync(path, "utf8");
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  const env = {};
  for (const line of text.split("\n")) {
    const clean = line.replace(/\r$/, "").trim();
    if (!clean || clean.startsWith("#")) continue;
    const eq = clean.indexOf("=");
    if (eq === -1) continue;
    env[clean.slice(0, eq).trim()] = clean.slice(eq + 1).trim();
  }
  return env;
}

const env = loadEnv();
const url = env.SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env (sem espaços após =)");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

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

function falhar(msg, err) {
  console.error("\n✗", msg);
  if (err) console.error("  Detalhe:", err.message || err);
  if (err?.code) console.error("  Código:", err.code);
  process.exit(1);
}

async function obterOuCriarEscola() {
  const { data: existente, error: buscaErr } = await admin
    .from("escolas")
    .select("id, nome, slug")
    .eq("slug", ESCOLA_SLUG)
    .maybeSingle();

  if (buscaErr) {
    if (buscaErr.message?.includes("Could not find the table")) {
      falhar("Tabela 'escolas' não existe. Execute supabase/schema.sql no SQL Editor do Supabase.", buscaErr);
    }
    falhar("Erro ao buscar escola", buscaErr);
  }

  if (existente) return existente;

  console.log("Escola não encontrada — criando automaticamente...");

  const { data: criada, error: insertErr } = await admin
    .from("escolas")
    .insert({ nome: ESCOLA_NOME, slug: ESCOLA_SLUG })
    .select("id, nome, slug")
    .single();

  if (insertErr) falhar("Não foi possível criar a escola. Confira se schema.sql foi executado.", insertErr);

  return criada;
}

async function obterOuCriarTurma(escolaId) {
  const { data: existente } = await admin
    .from("turmas")
    .select("id")
    .eq("escola_id", escolaId)
    .eq("nome", "3º Ano A")
    .maybeSingle();

  if (existente) return existente.id;

  const { data: criada, error } = await admin
    .from("turmas")
    .insert({ escola_id: escolaId, nome: "3º Ano A" })
    .select("id")
    .single();

  if (error) falhar("Erro ao criar turma", error);
  return criada.id;
}

async function main() {
  console.log("Conectando ao Supabase:", url);

  const escola = await obterOuCriarEscola();
  console.log("Escola OK:", escola.nome);

  const turmaId = await obterOuCriarTurma(escola.id);
  console.log("Turma OK: 3º Ano A");

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
      const jaExiste =
        createErr.message?.includes("already") ||
        createErr.message?.includes("registered") ||
        createErr.status === 422;

      if (jaExiste) {
        const { data: list, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
        if (listErr) throw listErr;
        const found = list?.users?.find((x) => x.email?.toLowerCase() === email);
        if (!found) throw createErr;
        userId = found.id;
        await admin.auth.admin.updateUserById(userId, { password: u.password });
        console.log(`Atualizado: ${u.login}`);
      } else {
        throw createErr;
      }
    } else {
      console.log(`Criado: ${u.login}`);
    }

    const { error: perfilErr } = await admin.from("perfis").upsert({
      id: userId,
      escola_id: escola.id,
      nome: u.nome,
      cpf: u.cpf,
      role: u.role,
      disciplina: u.disciplina ?? null,
    });
    if (perfilErr) falhar(`Erro ao salvar perfil de ${u.login}`, perfilErr);

    if (u.role === "professor" && !professorVinculado) {
      professorVinculado = userId;
      await admin.from("turmas").update({ professor_id: userId }).eq("id", turmaId);
    }

    if (u.role === "aluno") {
      const { error: regErr } = await admin.from("registros_alunos").upsert({
        perfil_id: userId,
        turma_id: turmaId,
        nota: u.nota ?? 0,
        faltas: u.faltas ?? 0,
      });
      if (regErr) falhar(`Erro ao registrar aluno ${u.login}`, regErr);
    }
  }

  console.log("\n✓ Setup concluído — Colégio Jardim das Acácias");
  console.log("  Diretor   → diretor1   / diretor123");
  console.log("  Professor → profesor2  / profesor23");
  console.log("  Aluno     → alunos123  / alunos123");
}

main().catch((e) => {
  console.error("\n✗ Erro:", e.message || e);
  process.exit(1);
});
