
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
    login: "professor2",
    password: "profesor23",
    nome: "Danton Rodrigues Diniz",
    cpf: "22222222222",
    role: "professor",
    disciplina: "Matemática, Física",
    aliases: ["profesor2"],
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

async function limparProfessoresDuplicados() {
  const { data: list, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (listErr) return;

  const canonico = list?.users?.find((u) => u.email?.toLowerCase() === `professor2@${DOMINIO}`);
  const legado = list?.users?.find((u) => u.email?.toLowerCase() === `profesor2@${DOMINIO}`);

  if (!canonico || !legado || canonico.id === legado.id) return;

  await admin.from("turmas").update({ professor_id: canonico.id }).eq("professor_id", legado.id);
  await admin.from("perfis").delete().eq("id", legado.id);
  await admin.auth.admin.deleteUser(legado.id);
  console.log("Conta duplicada removida: profesor2 (use professor2)");
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
    const emailsBusca = [email, ...(u.aliases || []).map((a) => `${a}@${DOMINIO}`)];

    const { data: list, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
    if (listErr) throw listErr;

    const existente = emailsBusca
      .map((e) => list?.users?.find((x) => x.email?.toLowerCase() === e))
      .find(Boolean);

    let userId;

    if (existente) {
      userId = existente.id;
      const updates = { password: u.password };
      if (existente.email?.toLowerCase() !== email) updates.email = email;
      await admin.auth.admin.updateUserById(userId, updates);
      console.log(existente.email?.toLowerCase() !== email ? `Migrado: ${existente.email} → ${u.login}` : `Atualizado: ${u.login}`);
    } else {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password: u.password,
        email_confirm: true,
      });
      if (createErr) throw createErr;
      userId = created.user.id;
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
      const { error: regErr } = await admin.from("registros_alunos").upsert(
        {
          perfil_id: userId,
          turma_id: turmaId,
          nota: u.nota ?? 0,
          faltas: u.faltas ?? 0,
        },
        { onConflict: "perfil_id" }
      );
      if (regErr) falhar(`Erro ao registrar aluno ${u.login}`, regErr);
    }
  }

  await limparProfessoresDuplicados();

  console.log("\n✓ Setup concluído — Colégio Jardim das Acácias");
  console.log("  Diretor   → diretor1   / diretor123");
  console.log("  Professor → professor2 / profesor23");
  console.log("  Aluno     → alunos123  / alunos123");
}

main().catch((e) => {
  console.error("\n✗ Erro:", e.message || e);
  process.exit(1);
});
