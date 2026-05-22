const { requirePerfil } = require("../_lib/session");
const { parseBody } = require("../_lib/body");
const { carregar, salvar, buscarAluno } = require("../_lib/dados");

module.exports = async (req, res) => {
  if (req.method !== "PUT" && req.method !== "POST") return res.status(405).json({ ok: false });
  if (!requirePerfil(req, res, ["diretor"])) return;
  const body = await parseBody(req);
  const dados = carregar();
  const found = buscarAluno(dados, body.nomeAluno);
  if (!found) return res.json({ ok: false, mensagem: "Aluno não encontrado." });
  if (body.nota != null) found.aluno.nota = body.nota;
  if (body.faltas != null) found.aluno.faltas = body.faltas;
  salvar(dados);
  res.json({ ok: true, mensagem: "Dados atualizados!" });
};
