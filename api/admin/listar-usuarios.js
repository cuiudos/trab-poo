const { createClient } = require("@supabase/supabase-js");
const { emailParaLogin } = require("../_lib/email");

module.exports = async (req, res) => {
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).json({ ok: false });

  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");

  if (!url || !anonKey || !serviceKey) {
    return res.status(500).json({ ok: false, mensagem: "Supabase não configurado no servidor." });
  }

  if (!token) return res.status(401).json({ ok: false, mensagem: "Sessão inválida." });

  const userClient = createClient(url, anonKey);
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: userData, error: userErr } = await userClient.auth.getUser(token);
  if (userErr || !userData?.user) {
    return res.status(401).json({ ok: false, mensagem: "Sessão expirada. Faça login novamente." });
  }

  const { data: diretor, error: perfilErr } = await admin
    .from("perfis")
    .select("role, escola_id")
    .eq("id", userData.user.id)
    .single();

  if (perfilErr || diretor?.role !== "diretor") {
    return res.status(403).json({ ok: false, mensagem: "Apenas o diretor pode listar usuários." });
  }

  const { data: perfis, error: listaErr } = await admin
    .from("perfis")
    .select("id, nome, cpf, role, disciplina")
    .eq("escola_id", diretor.escola_id)
    .order("role")
    .order("nome");

  if (listaErr) return res.status(400).json({ ok: false, mensagem: listaErr.message });

  const { data: authList, error: authErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (authErr) return res.status(400).json({ ok: false, mensagem: authErr.message });

  const emailPorId = new Map((authList?.users || []).map((u) => [u.id, u.email]));

  const usuarios = (perfis || []).map((p) => {
    const email = emailPorId.get(p.id) || null;
    return {
      id: p.id,
      nome: p.nome,
      login: emailParaLogin(email),
      email,
      cpf: p.cpf,
      role: p.role,
      disciplina: p.disciplina,
    };
  });

  res.json({ ok: true, usuarios });
};
