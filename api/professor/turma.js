const { requirePerfil } = require("../_lib/session");
const { carregar, buscarProfessor, buscarTurma, turmaDto } = require("../_lib/dados");

module.exports = (req, res) => {
  const sess = requirePerfil(req, res, ["professor"]);
  if (!sess) return;
  const dados = carregar();
  const prof = buscarProfessor(dados, sess.nome);
  if (!prof?.turmaNome) return res.json({ ok: false, mensagem: "Sem turma vinculada pelo diretor." });
  const turma = buscarTurma(dados, prof.turmaNome);
  res.json({ ok: true, turma: turmaDto(turma) });
};
