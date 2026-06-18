const { parseBody } = require("../_lib/body");
const { normalizarEmail } = require("../_lib/email");
const { normalizarDisciplinas } = require("../_lib/disciplinas");
const { verificarDiretor } = require("../_lib/auth-diretor");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ ok: false });

  const auth = await verificarDiretor(req);
  if (!auth.ok) return res.status(auth.status).json({ ok: false, mensagem: auth.mensagem });

  const body = await parseBody(req);
  const { email, password, nome, cpf, role, disciplina, turmaNome } = body;
  const emailNormalizado = normalizarEmail(email);

  if (!email || !password || !nome || !role) {
    return res.status(400).json({ ok: false, mensagem: "E-mail, senha, nome e perfil são obrigatórios." });
  }

  if (password.length < 8) {
    return res.status(400).json({ ok: false, mensagem: "Senha deve ter no mínimo 8 caracteres." });
  }

  const { data: novoAuth, error: createErr } = await auth.admin.auth.admin.createUser({
    email: emailNormalizado,
    password,
    email_confirm: true,
  });

  if (createErr) {
    return res.status(400).json({ ok: false, mensagem: createErr.message });
  }

  const userId = novoAuth.user.id;

  const { error: perfilInsertErr } = await auth.admin.from("perfis").insert({
    id: userId,
    escola_id: auth.escolaId,
    nome: nome.trim(),
    cpf: cpf || null,
    role,
    disciplina: role === "professor" ? normalizarDisciplinas(disciplina) : null,
  });

  if (perfilInsertErr) {
    await auth.admin.auth.admin.deleteUser(userId);
    return res.status(400).json({ ok: false, mensagem: perfilInsertErr.message });
  }

  if (role === "aluno" && turmaNome) {
    const { data: turma } = await auth.admin
      .from("turmas")
      .select("id")
      .eq("escola_id", auth.escolaId)
      .eq("nome", turmaNome.trim())
      .maybeSingle();

    if (!turma) {
      return res.status(400).json({ ok: false, mensagem: "Turma não encontrada." });
    }

    await auth.admin.from("registros_alunos").insert({
      perfil_id: userId,
      turma_id: turma.id,
    });
  }

  res.json({ ok: true, mensagem: "Usuário criado com sucesso no Supabase Auth." });
};
