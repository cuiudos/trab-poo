const { verificarDiretor } = require("../_lib/auth-diretor");
const { emailParaLogin } = require("../_lib/email");
const { listaDisciplinas } = require("../_lib/disciplinas");

function extrairTurmaAluno(registros) {
  const reg = Array.isArray(registros) ? registros[0] : registros;
  return {
    turma: reg?.turma?.nome || null,
    matricula: reg?.matricula || null,
    responsavelNome: reg?.responsavel_nome || null,
    responsavelTelefone: reg?.responsavel_telefone || null,
  };
}

function extrairTurmasProfessor(turmas) {
  const lista = Array.isArray(turmas) ? turmas : turmas ? [turmas] : [];
  return lista.map((t) => t.nome).filter(Boolean);
}

module.exports = async (req, res) => {
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).json({ ok: false });

  const auth = await verificarDiretor(req);
  if (!auth.ok) return res.status(auth.status).json({ ok: false, mensagem: auth.mensagem });

  const { data: perfis, error: listaErr } = await auth.admin
    .from("perfis")
    .select(`
      id, nome, cpf, role, disciplina,
      registros_alunos ( matricula, responsavel_nome, responsavel_telefone, turma:turmas ( nome ) ),
      turmas ( nome )
    `)
    .eq("escola_id", auth.escolaId)
    .order("role")
    .order("nome");

  if (listaErr) return res.status(400).json({ ok: false, mensagem: listaErr.message });

  const { data: authList, error: authErr } = await auth.admin.auth.admin.listUsers({ perPage: 1000 });
  if (authErr) return res.status(400).json({ ok: false, mensagem: authErr.message });

  const emailPorId = new Map((authList?.users || []).map((u) => [u.id, u.email]));

  const usuarios = (perfis || []).map((p) => {
    const email = emailPorId.get(p.id) || null;
    const disciplinas = listaDisciplinas(p.disciplina);
    const turmasProfessor = extrairTurmasProfessor(p.turmas);

    const registroAluno = extrairTurmaAluno(p.registros_alunos);

    return {
      id: p.id,
      nome: p.nome,
      login: emailParaLogin(email),
      email,
      cpf: p.cpf,
      role: p.role,
      disciplina: p.disciplina,
      disciplinas,
      turmaAluno: registroAluno.turma,
      matricula: registroAluno.matricula,
      responsavelNome: registroAluno.responsavelNome,
      responsavelTelefone: registroAluno.responsavelTelefone,
      turmasProfessor,
    };
  });

  res.json({ ok: true, usuarios });
};
