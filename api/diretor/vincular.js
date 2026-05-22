const { requirePerfil } = require("../_lib/session");
const { parseBody } = require("../_lib/body");
const { carregar, salvar, buscarTurma, buscarProfessor } = require("../_lib/dados");

module.exports = async (req, res) => {
  if (!requirePerfil(req, res, ["diretor"])) return;
  const body = await parseBody(req);
  const dados = carregar();
  const prof = buscarProfessor(dados, body.professor);
  const turma = buscarTurma(dados, body.turma);
  if (!prof) return res.json({ ok: false, mensagem: "Professor não encontrado." });
  if (!turma) return res.json({ ok: false, mensagem: "Turma não encontrada." });
  prof.turmaNome = turma.nome;
  turma.professorNome = prof.nome;
  salvar(dados);
  res.json({ ok: true, mensagem: "Professor vinculado à turma!" });
};
