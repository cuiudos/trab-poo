const { getSession } = require("../_lib/session");

module.exports = (req, res) => {
  const sess = getSession(req);
  if (!sess) return res.json({ autenticado: false });
  res.json({ autenticado: true, perfil: sess.perfil, nome: sess.nome, login: sess.login });
};
