const { requirePerfil } = require("../_lib/session");
const { parseBody } = require("../_lib/body");
const { carregar, salvar, buscarProfessor } = require("../_lib/dados");

module.exports = async (req, res) => {
  if (!requirePerfil(req, res, ["diretor"])) return;
  const body = await parseBody(req);
  const dados = carregar();
  if (buscarProfessor(dados, body.nome))
    return res.json({ ok: false, mensagem: "Professor já existe." });
  dados.professores.push({
    nome: body.nome,
    cpf: body.cpf,
    disciplina: body.disciplina,
    turmaNome: null,
  });
  salvar(dados);
  res.json({ ok: true, mensagem: "Professor cadastrado!" });
};
