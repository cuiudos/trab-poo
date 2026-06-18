const { parseBody } = require("../_lib/body");
const { createClient } = require("@supabase/supabase-js");
const { listaDisciplinas } = require("../_lib/disciplinas");

async function autenticarProfessor(req) {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");

  if (!url || !anonKey || !serviceKey) {
    return { erro: { status: 500, mensagem: "Supabase não configurado no servidor." } };
  }
  if (!token) return { erro: { status: 401, mensagem: "Sessão inválida." } };

  const userClient = createClient(url, anonKey);
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: userData, error: userErr } = await userClient.auth.getUser(token);
  if (userErr || !userData?.user) {
    return { erro: { status: 401, mensagem: "Sessão expirada." } };
  }

  const userId = userData.user.id;
  const { data: perfil, error: perfilErr } = await admin
    .from("perfis")
    .select("role, disciplina")
    .eq("id", userId)
    .single();

  if (perfilErr || perfil?.role !== "professor") {
    return { erro: { status: 403, mensagem: "Apenas professores podem usar esta função." } };
  }

  return { admin, userId, perfil };
}

function validarDisciplina(perfil, disciplina) {
  const minhas = listaDisciplinas(perfil.disciplina);
  const discNorm = disciplina.trim();
  const discCanon = minhas.find((d) => d.toLowerCase() === discNorm.toLowerCase());
  if (!discCanon) {
    return {
      ok: false,
      mensagem: `Disciplina inválida. Suas disciplinas: ${minhas.join(", ") || "nenhuma"}.`,
    };
  }
  return { ok: true, discCanon };
}

module.exports = { autenticarProfessor, validarDisciplina };
