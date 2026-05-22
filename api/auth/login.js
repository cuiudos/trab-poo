const { autenticar } = require("../_lib/auth");
const { setSession } = require("../_lib/session");
const { parseBody } = require("../_lib/body");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ ok: false });

  const body = await parseBody(req);
  const resultado = autenticar(body.tipo, body.usuario, body.senha);

  if (!resultado.ok) return res.status(401).json(resultado);

  setSession(res, { perfil: resultado.perfil, nome: resultado.nome, login: resultado.login });
  res.json({
    ok: true,
    mensagem: resultado.mensagem,
    perfil: resultado.perfil,
    nome: resultado.nome,
  });
};
