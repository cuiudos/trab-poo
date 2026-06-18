const { createClient } = require("@supabase/supabase-js");

async function verificarDiretor(req) {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");

  if (!url || !anonKey || !serviceKey) {
    return { ok: false, status: 500, mensagem: "Supabase não configurado no servidor." };
  }
  if (!token) return { ok: false, status: 401, mensagem: "Sessão inválida." };

  const userClient = createClient(url, anonKey);
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: userData, error: userErr } = await userClient.auth.getUser(token);
  if (userErr || !userData?.user) {
    return { ok: false, status: 401, mensagem: "Sessão expirada. Faça login novamente." };
  }

  const { data: diretor, error: perfilErr } = await admin
    .from("perfis")
    .select("role, escola_id")
    .eq("id", userData.user.id)
    .single();

  if (perfilErr || diretor?.role !== "diretor") {
    return { ok: false, status: 403, mensagem: "Apenas o diretor pode executar esta ação." };
  }

  return {
    ok: true,
    admin,
    diretorId: userData.user.id,
    escolaId: diretor.escola_id,
  };
}

module.exports = { verificarDiretor };
