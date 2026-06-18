const { parseBody } = require("../_lib/body");
const { autenticarProfessor } = require("../_lib/auth-professor");
const { validarNotaProfessor } = require("../_lib/validar-nota-professor");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ ok: false });

  const auth = await autenticarProfessor(req);
  if (auth.erro) return res.status(auth.erro.status).json({ ok: false, mensagem: auth.erro.mensagem });

  const { admin, userId, perfil } = auth;
  const body = await parseBody(req);
  const { notaId } = body;

  const validacao = await validarNotaProfessor(admin, userId, perfil, notaId);
  if (!validacao.ok) {
    return res.status(validacao.status).json({ ok: false, mensagem: validacao.mensagem });
  }

  const { error: delErr } = await admin.from("notas_disciplinas").delete().eq("id", notaId);
  if (delErr) {
    return res.status(400).json({ ok: false, mensagem: delErr.message });
  }

  const n = validacao.nota;
  const desc = n.descricao ? ` (${n.descricao})` : "";
  res.json({
    ok: true,
    mensagem: `Atividade excluída: ${n.nota}/${n.valor_atividade} em ${validacao.discCanon}${desc}.`,
  });
};
