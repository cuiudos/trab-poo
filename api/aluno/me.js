const { requirePerfil } = require("../_lib/session");
const { carregar, buscarAluno } = require("../_lib/dados");

module.exports = (req, res) => {
  const sess = requirePerfil(req, res, ["aluno"]);
  if (!sess) return;
  const dados = carregar();
  const found = buscarAluno(dados, sess.nome);
  if (!found) return res.json({ ok: false, mensagem: "Aluno não encontrado em turma." });
  res.json({ ok: true, nome: sess.nome, aluno: found.aluno });
};
