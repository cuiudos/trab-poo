const { requirePerfil } = require("../_lib/session");
const { parseBody } = require("../_lib/body");
const { carregar, salvar, buscarTurma } = require("../_lib/dados");

module.exports = async (req, res) => {
  if (!requirePerfil(req, res, ["diretor"])) return;
  const body = await parseBody(req);
  const dados = carregar();
  const turma = buscarTurma(dados, body.turma);
  if (!turma) return res.json({ ok: false, mensagem: "Turma não encontrada." });
  turma.alunos.push({ nome: body.nome, cpf: body.cpf, nota: 0, faltas: 0 });
  salvar(dados);
  res.json({ ok: true, mensagem: "Aluno cadastrado!" });
};
