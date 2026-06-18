const { parseBody } = require("../_lib/body");
const { autenticarProfessor, validarDisciplina } = require("../_lib/auth-professor");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ ok: false });

  const auth = await autenticarProfessor(req);
  if (auth.erro) return res.status(auth.erro.status).json({ ok: false, mensagem: auth.erro.mensagem });

  const { admin, userId, perfil } = auth;
  const body = await parseBody(req);
  const { registroId, disciplina, remover } = body;

  if (!registroId) return res.status(400).json({ ok: false, mensagem: "Aluno é obrigatório." });
  if (!disciplina?.trim()) return res.status(400).json({ ok: false, mensagem: "Disciplina é obrigatória." });

  const disc = validarDisciplina(perfil, disciplina);
  if (!disc.ok) return res.status(400).json({ ok: false, mensagem: disc.mensagem });

  const { data: registro, error: regErr } = await admin
    .from("registros_alunos")
    .select("id, turma:turmas(id, professor_id)")
    .eq("id", registroId)
    .maybeSingle();

  if (regErr || !registro) {
    return res.status(404).json({ ok: false, mensagem: "Aluno não encontrado." });
  }

  const turma = Array.isArray(registro.turma) ? registro.turma[0] : registro.turma;
  if (turma?.professor_id !== userId) {
    return res.status(403).json({ ok: false, mensagem: "Este aluno não está na sua turma." });
  }

  const { data: aulasCfg, error: aulasErr } = await admin
    .from("aulas_disciplinas")
    .select("total_aulas")
    .eq("turma_id", turma.id)
    .eq("disciplina", disc.discCanon)
    .maybeSingle();

  if (aulasErr?.message?.includes("aulas_disciplinas")) {
    return res.status(400).json({
      ok: false,
      mensagem: "Execute supabase/migracao-frequencia-disciplinas.sql no Supabase.",
    });
  }
  if (!aulasCfg) {
    return res.status(400).json({
      ok: false,
      mensagem: `Cadastre o total de aulas de ${disc.discCanon} antes de registrar faltas.`,
    });
  }

  const { data: atual, error: faltaErr } = await admin
    .from("faltas_disciplinas")
    .select("id, faltas")
    .eq("registro_aluno_id", registroId)
    .eq("disciplina", disc.discCanon)
    .maybeSingle();

  if (faltaErr?.message?.includes("faltas_disciplinas")) {
    return res.status(400).json({
      ok: false,
      mensagem: "Execute supabase/migracao-frequencia-disciplinas.sql no Supabase.",
    });
  }

  const limiteFaltas = Math.floor(aulasCfg.total_aulas * 0.25);
  let novasFaltas;

  if (remover) {
    if (!atual?.faltas) {
      return res.status(400).json({ ok: false, mensagem: "O aluno não tem faltas registradas nesta disciplina." });
    }
    novasFaltas = atual.faltas - 1;
  } else {
    novasFaltas = (atual?.faltas || 0) + 1;
    if (novasFaltas > aulasCfg.total_aulas) {
      return res.status(400).json({
        ok: false,
        mensagem: `Faltas não podem ultrapassar o total de ${aulasCfg.total_aulas} aulas.`,
      });
    }
  }

  if (novasFaltas === 0 && atual?.id) {
    const { error: delErr } = await admin.from("faltas_disciplinas").delete().eq("id", atual.id);
    if (delErr) return res.status(400).json({ ok: false, mensagem: delErr.message });
    const freq = 100;
    return res.json({
      ok: true,
      mensagem: `Falta removida em ${disc.discCanon}. Aluno sem faltas nesta disciplina (${freq}% presença).`,
      faltas: 0,
      frequencia: freq,
    });
  }

  const payload = {
    registro_aluno_id: registroId,
    disciplina: disc.discCanon,
    faltas: novasFaltas,
    professor_id: userId,
    updated_at: new Date().toISOString(),
  };

  const { error: saveErr } = atual?.id
    ? await admin.from("faltas_disciplinas").update(payload).eq("id", atual.id)
    : await admin.from("faltas_disciplinas").insert(payload);

  if (saveErr) {
    return res.status(400).json({ ok: false, mensagem: saveErr.message });
  }

  const freq = Math.round(((aulasCfg.total_aulas - novasFaltas) / aulasCfg.total_aulas) * 1000) / 10;
  let msg = remover
    ? `Falta removida em ${disc.discCanon}: ${novasFaltas}/${aulasCfg.total_aulas} (${freq}% presença).`
    : `Falta registrada em ${disc.discCanon}: ${novasFaltas}/${aulasCfg.total_aulas} (${freq}% presença).`;
  if (!remover && novasFaltas > limiteFaltas) {
    msg += " Atenção: ultrapassou 25% de faltas — reprovação por frequência.";
  }

  res.json({ ok: true, mensagem: msg, faltas: novasFaltas, frequencia: freq });
};
