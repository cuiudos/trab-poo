const { createClient } = require("@supabase/supabase-js");
const { parseBody } = require("../_lib/body");
const { normalizarEmail } = require("../_lib/email");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ ok: false });

  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey || !serviceKey) {
    return res.status(500).json({ ok: false, mensagem: "Supabase não configurado no servidor." });
  }

  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ ok: false, mensagem: "Sessão inválida." });

  const userClient = createClient(url, anonKey);
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: userData, error: userErr } = await userClient.auth.getUser(token);
  if (userErr || !userData?.user) {
    return res.status(401).json({ ok: false, mensagem: "Sessão expirada. Faça login novamente." });
  }

  const { data: perfilDiretor, error: perfilErr } = await admin
    .from("perfis")
    .select("role, escola_id")
    .eq("id", userData.user.id)
    .single();

  if (perfilErr || perfilDiretor?.role !== "diretor") {
    return res.status(403).json({ ok: false, mensagem: "Apenas o diretor pode criar usuários." });
  }

  const body = await parseBody(req);
  const { email, password, nome, cpf, role, disciplina, turmaNome } = body;
  const emailNormalizado = normalizarEmail(email);

  if (!email || !password || !nome || !role) {
    return res.status(400).json({ ok: false, mensagem: "E-mail, senha, nome e perfil são obrigatórios." });
  }

  if (password.length < 8) {
    return res.status(400).json({ ok: false, mensagem: "Senha deve ter no mínimo 8 caracteres." });
  }

  const { data: novoAuth, error: createErr } = await admin.auth.admin.createUser({
    email: emailNormalizado,
    password,
    email_confirm: true,
  });

  if (createErr) {
    return res.status(400).json({ ok: false, mensagem: createErr.message });
  }

  const userId = novoAuth.user.id;

  const { error: perfilInsertErr } = await admin.from("perfis").insert({
    id: userId,
    escola_id: perfilDiretor.escola_id,
    nome: nome.trim(),
    cpf: cpf || null,
    role,
    disciplina: role === "professor" ? disciplina : null,
  });

  if (perfilInsertErr) {
    await admin.auth.admin.deleteUser(userId);
    return res.status(400).json({ ok: false, mensagem: perfilInsertErr.message });
  }

  if (role === "aluno" && turmaNome) {
    const { data: turma } = await admin
      .from("turmas")
      .select("id")
      .eq("escola_id", perfilDiretor.escola_id)
      .eq("nome", turmaNome.trim())
      .maybeSingle();

    if (!turma) {
      return res.status(400).json({ ok: false, mensagem: "Turma não encontrada." });
    }

    await admin.from("registros_alunos").insert({
      perfil_id: userId,
      turma_id: turma.id,
    });
  }

  res.json({ ok: true, mensagem: "Usuário criado com sucesso no Supabase Auth." });
};
