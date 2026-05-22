const { requirePerfil } = require("../_lib/session");
const { parseBody } = require("../_lib/body");
const { carregar, salvar, buscarTurma, turmaDto } = require("../_lib/dados");

module.exports = async (req, res) => {
  if (!requirePerfil(req, res, ["diretor"])) return;

  if (req.method === "GET") {
    const dados = carregar();
    return res.json({ ok: true, turmas: dados.turmas.map(turmaDto) });
  }

  if (req.method === "POST") {
    const body = await parseBody(req);
    const nome = (body.nome || "").trim();
    const dados = carregar();
    if (!nome) return res.json({ ok: false, mensagem: "Nome obrigatório." });
    if (buscarTurma(dados, nome)) return res.json({ ok: false, mensagem: "Turma já existe." });
    dados.turmas.push({ nome, professorNome: null, alunos: [] });
    salvar(dados);
    return res.json({ ok: true, mensagem: "Turma cadastrada!" });
  }

  res.status(405).json({ ok: false });
};
