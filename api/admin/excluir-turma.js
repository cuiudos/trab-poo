const { parseBody } = require("../_lib/body");
const { verificarDiretor } = require("../_lib/auth-diretor");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ ok: false });

  const auth = await verificarDiretor(req);
  if (!auth.ok) return res.status(auth.status).json({ ok: false, mensagem: auth.mensagem });

  const body = await parseBody(req);
  const { id } = body;

  if (!id) return res.status(400).json({ ok: false, mensagem: "ID da turma é obrigatório." });

  const { data: turma, error: buscaErr } = await auth.admin
    .from("turmas")
    .select("id, nome")
    .eq("id", id)
    .eq("escola_id", auth.escolaId)
    .maybeSingle();

  if (buscaErr || !turma) {
    return res.status(404).json({ ok: false, mensagem: "Turma não encontrada." });
  }

  const { error: delErr } = await auth.admin.from("turmas").delete().eq("id", id);
  if (delErr) return res.status(400).json({ ok: false, mensagem: delErr.message });

  res.json({ ok: true, mensagem: `Turma "${turma.nome}" excluída com sucesso.` });
};
