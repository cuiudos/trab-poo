const { parseBody } = require("./body");
const { createClient } = require("@supabase/supabase-js");

async function autenticarSessao(req) {
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
    .select("role, disciplina, escola_id, nome")
    .eq("id", userId)
    .single();

  if (perfilErr || !perfil) {
    return { erro: { status: 403, mensagem: "Perfil não encontrado." } };
  }

  let registroAluno = null;
  if (perfil.role === "aluno") {
    const { data: reg } = await admin
      .from("registros_alunos")
      .select("id, turma_id")
      .eq("perfil_id", userId)
      .maybeSingle();
    registroAluno = reg;
  }

  return { admin, userId, perfil, registroAluno };
}

module.exports = { autenticarSessao };
