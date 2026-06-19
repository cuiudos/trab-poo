const { parseBody } = require("../_lib/body");
const { normalizarEmail } = require("../_lib/email");
const { normalizarDisciplinas } = require("../_lib/disciplinas");
const { verificarDiretor } = require("../_lib/auth-diretor");
const { validarCpf } = require("../_lib/validar-cpf");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ ok: false });

  const auth = await verificarDiretor(req);
  if (!auth.ok) return res.status(auth.status).json({ ok: false, mensagem: auth.mensagem });

  const body = await parseBody(req);
  const { email, password, nome, cpf, role, disciplina, turmaNome, matricula, responsavelNome, responsavelTelefone } = body;
  const emailNormalizado = normalizarEmail(email);

  if (!email || !password || !nome || !role) {
    return res.status(400).json({ ok: false, mensagem: "E-mail, senha, nome e perfil são obrigatórios." });
  }

  if (password.length < 8) {
    return res.status(400).json({ ok: false, mensagem: "Senha deve ter no mínimo 8 caracteres." });
  }

  let cpfNormalizado = null;
  if (cpf) {
    const validacaoCpf = validarCpf(cpf);
    if (!validacaoCpf.ok) {
      return res.status(400).json({ ok: false, mensagem: validacaoCpf.mensagem });
    }
    cpfNormalizado = validacaoCpf.cpf;

    const { data: cpfExistente } = await auth.admin
      .from("perfis")
      .select("id")
      .eq("escola_id", auth.escolaId)
      .eq("cpf", cpfNormalizado)
      .maybeSingle();

    if (cpfExistente) {
      return res.status(400).json({ ok: false, mensagem: "CPF já cadastrado no sistema." });
    }
  }

  if (role === "aluno" && !matricula?.trim()) {
    return res.status(400).json({ ok: false, mensagem: "Matrícula é obrigatória para alunos." });
  }

  if (role === "aluno" && matricula?.trim()) {
    const { data: matriculaExistente } = await auth.admin
      .from("registros_alunos")
      .select("id, perfil:perfis!inner(escola_id)")
      .eq("matricula", matricula.trim())
      .eq("perfil.escola_id", auth.escolaId)
      .maybeSingle();

    if (matriculaExistente) {
      return res.status(400).json({ ok: false, mensagem: "Matrícula já cadastrada no sistema." });
    }
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
    cpf: cpfNormalizado,
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
      matricula: matricula?.trim() || null,
      responsavel_nome: responsavelNome?.trim() || null,
      responsavel_telefone: responsavelTelefone?.trim() || null,
    });
  }

  res.json({ ok: true, mensagem: "Usuário criado com sucesso no Supabase Auth." });
};
