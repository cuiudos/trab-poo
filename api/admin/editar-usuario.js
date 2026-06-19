const { parseBody } = require("../_lib/body");
const { verificarDiretor } = require("../_lib/auth-diretor");
const { normalizarDisciplinas } = require("../_lib/disciplinas");
const { validarCpf } = require("../_lib/validar-cpf");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ ok: false });

  const auth = await verificarDiretor(req);
  if (!auth.ok) return res.status(auth.status).json({ ok: false, mensagem: auth.mensagem });

  const body = await parseBody(req);
  const { id, nome, cpf, disciplina, turmaNome, password, passwordConfirm, matricula, responsavelNome, responsavelTelefone } = body;

  if (!id) return res.status(400).json({ ok: false, mensagem: "ID do usuário é obrigatório." });
  if (!nome?.trim()) return res.status(400).json({ ok: false, mensagem: "Nome é obrigatório." });

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
      .neq("id", id)
      .maybeSingle();

    if (cpfExistente) {
      return res.status(400).json({ ok: false, mensagem: "CPF já cadastrado no sistema." });
    }
  }

  const { data: perfil, error: buscaErr } = await auth.admin
    .from("perfis")
    .select("id, role, escola_id")
    .eq("id", id)
    .single();

  if (buscaErr || !perfil || perfil.escola_id !== auth.escolaId) {
    return res.status(404).json({ ok: false, mensagem: "Usuário não encontrado." });
  }

  const upd = {
    nome: nome.trim(),
    cpf: cpfNormalizado,
  };

  if (perfil.role === "professor") {
    upd.disciplina = normalizarDisciplinas(disciplina || "");
  }

  const { error: updErr } = await auth.admin.from("perfis").update(upd).eq("id", id);
  if (updErr) return res.status(400).json({ ok: false, mensagem: updErr.message });

  if (perfil.role === "aluno") {
    if (matricula?.trim()) {
      const { data: matriculaExistente } = await auth.admin
        .from("registros_alunos")
        .select("id, perfil:perfis!inner(escola_id)")
        .eq("matricula", matricula.trim())
        .eq("perfil.escola_id", auth.escolaId)
        .neq("perfil_id", id)
        .maybeSingle();

      if (matriculaExistente) {
        return res.status(400).json({ ok: false, mensagem: "Matrícula já cadastrada no sistema." });
      }
    }

    const registroUpd = {
      responsavel_nome: responsavelNome?.trim() || null,
      responsavel_telefone: responsavelTelefone?.trim() || null,
    };
    if (matricula?.trim()) registroUpd.matricula = matricula.trim();

    if (turmaNome?.trim()) {
      const { data: turma } = await auth.admin
        .from("turmas")
        .select("id")
        .eq("escola_id", auth.escolaId)
        .eq("nome", turmaNome.trim())
        .maybeSingle();

      if (!turma) return res.status(400).json({ ok: false, mensagem: "Turma não encontrada." });

      registroUpd.turma_id = turma.id;
      const { error: regErr } = await auth.admin
        .from("registros_alunos")
        .upsert({ perfil_id: id, ...registroUpd }, { onConflict: "perfil_id" });

      if (regErr) return res.status(400).json({ ok: false, mensagem: regErr.message });
    } else {
      const { error: regErr } = await auth.admin
        .from("registros_alunos")
        .update(registroUpd)
        .eq("perfil_id", id);

      if (regErr) return res.status(400).json({ ok: false, mensagem: regErr.message });
    }
  }

  if (password) {
    if (password.length < 8) {
      return res.status(400).json({ ok: false, mensagem: "Senha deve ter no mínimo 8 caracteres." });
    }
    if (!passwordConfirm || password !== passwordConfirm) {
      return res.status(400).json({ ok: false, mensagem: "As senhas não coincidem." });
    }
    const { error: passErr } = await auth.admin.auth.admin.updateUserById(id, { password });
    if (passErr) return res.status(400).json({ ok: false, mensagem: passErr.message });
  }

  res.json({ ok: true, mensagem: "Usuário atualizado com sucesso." });
};
