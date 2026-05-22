const { requirePerfil } = require("../_lib/session");
const { parseBody } = require("../_lib/body");
const { carregar, salvar, buscarAluno, buscarProfessor, buscarTurma } = require("../_lib/dados");

module.exports = async (req, res) => {
  const sess = requirePerfil(req, res, ["professor"]);
  if (!sess) return;
  const body = await parseBody(req);
  const dados = carregar();
  const prof = buscarProfessor(dados, sess.nome);
  if (!prof?.turmaNome) return res.json({ ok: false, mensagem: "Sem turma vinculada." });
  const turma = buscarTurma(dados, prof.turmaNome);
  const found = turma.alunos.find((a) => a.nome === body.nomeAluno);
  if (!found) return res.json({ ok: false, mensagem: "Aluno não encontrado na sua turma." });
  found.nota = body.nota ?? 0;
  salvar(dados);
  res.json({ ok: true, mensagem: "Nota lançada!" });
};
