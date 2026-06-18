const { parseBody } = require("../_lib/body");
const { autenticarProfessor, validarDisciplina } = require("../_lib/auth-professor");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ ok: false });

  const auth = await autenticarProfessor(req);
  if (auth.erro) return res.status(auth.erro.status).json({ ok: false, mensagem: auth.erro.mensagem });

  const { admin, userId, perfil } = auth;
  const body = await parseBody(req);
  const { turmaId, disciplina, totalAulas } = body;

  if (!turmaId) return res.status(400).json({ ok: false, mensagem: "Turma é obrigatória." });
  if (!disciplina?.trim()) return res.status(400).json({ ok: false, mensagem: "Disciplina é obrigatória." });
  if (totalAulas === undefined || totalAulas === null || totalAulas === "") {
    return res.status(400).json({ ok: false, mensagem: "Total de aulas é obrigatório." });
  }

  const total = parseInt(totalAulas, 10);
  if (Number.isNaN(total) || total <= 0) {
    return res.status(400).json({ ok: false, mensagem: "Total de aulas deve ser maior que zero." });
  }

  const disc = validarDisciplina(perfil, disciplina);
  if (!disc.ok) return res.status(400).json({ ok: false, mensagem: disc.mensagem });

  const { data: turma, error: turmaErr } = await admin
    .from("turmas")
    .select("id")
    .eq("id", turmaId)
    .eq("professor_id", userId)
    .maybeSingle();

  if (turmaErr || !turma) {
    return res.status(403).json({ ok: false, mensagem: "Turma não encontrada ou não é sua." });
  }

  const { error: upsertErr } = await admin.from("aulas_disciplinas").upsert(
    {
      turma_id: turmaId,
      disciplina: disc.discCanon,
      total_aulas: total,
      professor_id: userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "turma_id,disciplina" }
  );

  if (upsertErr) {
    if (upsertErr.message?.includes("aulas_disciplinas")) {
      return res.status(400).json({
        ok: false,
        mensagem: "Execute supabase/migracao-frequencia-disciplinas.sql no Supabase.",
      });
    }
    return res.status(400).json({ ok: false, mensagem: upsertErr.message });
  }

  const limiteFaltas = Math.floor(total * 0.25);
  res.json({
    ok: true,
    mensagem: `${disc.discCanon}: ${total} aulas cadastradas (máx. ${limiteFaltas} faltas = 25%).`,
  });
};
