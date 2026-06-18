const { parseBody } = require("../_lib/body");
const { autenticarProfessor } = require("../_lib/auth-professor");
const { validarNotaProfessor } = require("../_lib/validar-nota-professor");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ ok: false });

  const auth = await autenticarProfessor(req);
  if (auth.erro) return res.status(auth.erro.status).json({ ok: false, mensagem: auth.erro.mensagem });

  const { admin, userId, perfil } = auth;
  const body = await parseBody(req);
  const { notaId, nota, descricao, valorAtividade } = body;

  const validacao = await validarNotaProfessor(admin, userId, perfil, notaId);
  if (!validacao.ok) {
    return res.status(validacao.status).json({ ok: false, mensagem: validacao.mensagem });
  }

  if (valorAtividade === undefined || valorAtividade === null || valorAtividade === "") {
    return res.status(400).json({ ok: false, mensagem: "Valor da atividade é obrigatório." });
  }
  if (nota === undefined || nota === null || nota === "") {
    return res.status(400).json({ ok: false, mensagem: "Nota do aluno é obrigatória." });
  }

  const valorAtvNum = parseFloat(valorAtividade);
  if (Number.isNaN(valorAtvNum) || valorAtvNum <= 0 || valorAtvNum > 100) {
    return res.status(400).json({ ok: false, mensagem: "Valor da atividade deve ser entre 1 e 100." });
  }

  const notaNum = parseFloat(nota);
  if (Number.isNaN(notaNum) || notaNum < 0 || notaNum > valorAtvNum) {
    return res.status(400).json({
      ok: false,
      mensagem: `Nota do aluno deve ser entre 0 e ${valorAtvNum} (valor da atividade).`,
    });
  }

  const { error: updateErr } = await admin
    .from("notas_disciplinas")
    .update({
      valor_atividade: valorAtvNum,
      nota: notaNum,
      descricao: descricao?.trim() || null,
    })
    .eq("id", notaId);

  if (updateErr) {
    return res.status(400).json({ ok: false, mensagem: updateErr.message });
  }

  const desc = descricao?.trim();
  res.json({
    ok: true,
    mensagem: `Atividade atualizada: ${notaNum}/${valorAtvNum} em ${validacao.discCanon}${desc ? ` (${desc})` : ""}.`,
  });
};
