const { parseBody } = require("../_lib/body");
const { verificarDiretor } = require("../_lib/auth-diretor");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ ok: false });

  const auth = await verificarDiretor(req);
  if (!auth.ok) return res.status(auth.status).json({ ok: false, mensagem: auth.mensagem });

  const body = await parseBody(req);
  const { id } = body;

  if (!id) return res.status(400).json({ ok: false, mensagem: "ID do usuário é obrigatório." });
  if (id === auth.diretorId) {
    return res.status(400).json({ ok: false, mensagem: "Você não pode excluir sua própria conta." });
  }

  const { data: perfil, error: buscaErr } = await auth.admin
    .from("perfis")
    .select("id, escola_id")
    .eq("id", id)
    .single();

  if (buscaErr || !perfil || perfil.escola_id !== auth.escolaId) {
    return res.status(404).json({ ok: false, mensagem: "Usuário não encontrado." });
  }

  const { error: delErr } = await auth.admin.auth.admin.deleteUser(id);
  if (delErr) return res.status(400).json({ ok: false, mensagem: delErr.message });

  res.json({ ok: true, mensagem: "Usuário excluído com sucesso." });
};
