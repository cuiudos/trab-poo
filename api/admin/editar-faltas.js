const { parseBody } = require("../_lib/body");
const { verificarDiretor } = require("../_lib/auth-diretor");
const { emailsParaBusca } = require("../_lib/email");

async function buscarAlunoId(admin, email) {
  const candidatos = emailsParaBusca(email);
  if (!candidatos.length) return null;

  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const user = candidatos
    .map((e) => list?.users?.find((u) => u.email?.toLowerCase() === e))
    .find(Boolean);

  return user?.id || null;
}

function canonDisciplina(disciplina, aulasRows) {
  const discNorm = disciplina.trim();
  const match = (aulasRows || []).find((a) => a.disciplina.toLowerCase() === discNorm.toLowerCase());
  return match?.disciplina || discNorm;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ ok: false });

  const auth = await verificarDiretor(req);
  if (!auth.ok) return res.status(auth.status).json({ ok: false, mensagem: auth.mensagem });

  const { admin, escolaId } = auth;
  const body = await parseBody(req);
  const { email, disciplina, faltas, remover } = body;

  if (!email?.trim()) return res.status(400).json({ ok: false, mensagem: "E-mail do aluno é obrigatório." });
  if (!disciplina?.trim()) return res.status(400).json({ ok: false, mensagem: "Disciplina é obrigatória." });

  const alunoId = await buscarAlunoId(admin, email);
  if (!alunoId) return res.status(404).json({ ok: false, mensagem: "Aluno não encontrado." });

  const { data: registro, error: regErr } = await admin
    .from("registros_alunos")
    .select("id, turma:turmas(id, professor_id, escola_id)")
    .eq("perfil_id", alunoId)
    .maybeSingle();

  if (regErr || !registro) {
    return res.status(404).json({ ok: false, mensagem: "Registro do aluno não encontrado." });
  }

  const turma = Array.isArray(registro.turma) ? registro.turma[0] : registro.turma;
  if (turma?.escola_id !== escolaId) {
    return res.status(403).json({ ok: false, mensagem: "Aluno não pertence à sua escola." });
  }

  const { data: aulasRows, error: aulasErr } = await admin
    .from("aulas_disciplinas")
    .select("disciplina, total_aulas")
    .eq("turma_id", turma.id);

  if (aulasErr?.message?.includes("aulas_disciplinas")) {
    return res.status(400).json({
      ok: false,
      mensagem: "Execute supabase/migracao-frequencia-disciplinas.sql no Supabase.",
    });
  }

  const discCanon = canonDisciplina(disciplina, aulasRows);
  const aulasCfg = (aulasRows || []).find((a) => a.disciplina === discCanon);

  const { data: atual, error: faltaErr } = await admin
    .from("faltas_disciplinas")
    .select("id, faltas")
    .eq("registro_aluno_id", registro.id)
    .eq("disciplina", discCanon)
    .maybeSingle();

  if (faltaErr?.message?.includes("faltas_disciplinas")) {
    return res.status(400).json({
      ok: false,
      mensagem: "Execute supabase/migracao-frequencia-disciplinas.sql no Supabase.",
    });
  }

  let novasFaltas;

  if (remover) {
    if (!atual?.faltas) {
      return res.status(400).json({ ok: false, mensagem: "O aluno não tem faltas registradas nesta disciplina." });
    }
    novasFaltas = Math.max(0, atual.faltas - 1);
  } else {
    if (faltas === undefined || faltas === null || faltas === "") {
      return res.status(400).json({ ok: false, mensagem: "Informe o total de faltas." });
    }
    novasFaltas = parseInt(faltas, 10);
    if (Number.isNaN(novasFaltas) || novasFaltas < 0) {
      return res.status(400).json({ ok: false, mensagem: "Faltas deve ser um número ≥ 0." });
    }
  }

  if (aulasCfg && novasFaltas > aulasCfg.total_aulas) {
    return res.status(400).json({
      ok: false,
      mensagem: `Faltas não podem ultrapassar ${aulasCfg.total_aulas} aulas cadastradas.`,
    });
  }

  if (novasFaltas === 0 && !atual?.id) {
    return res.json({ ok: true, mensagem: `${discCanon}: aluno sem faltas registradas.`, faltas: 0 });
  }

  if (novasFaltas === 0 && atual?.id) {
    const { error: delErr } = await admin.from("faltas_disciplinas").delete().eq("id", atual.id);
    if (delErr) return res.status(400).json({ ok: false, mensagem: delErr.message });
    return res.json({ ok: true, mensagem: `Faltas de ${discCanon} zeradas.`, faltas: 0 });
  }

  const professorId = turma.professor_id;
  if (!professorId) {
    return res.status(400).json({ ok: false, mensagem: "Turma sem professor vinculado." });
  }

  const payload = {
    registro_aluno_id: registro.id,
    disciplina: discCanon,
    faltas: novasFaltas,
    professor_id: professorId,
    updated_at: new Date().toISOString(),
  };

  const { error: saveErr } = atual?.id
    ? await admin.from("faltas_disciplinas").update(payload).eq("id", atual.id)
    : await admin.from("faltas_disciplinas").insert(payload);

  if (saveErr) return res.status(400).json({ ok: false, mensagem: saveErr.message });

  let msg = remover
    ? `1 falta removida em ${discCanon}. Total: ${novasFaltas}.`
    : `Faltas de ${discCanon} atualizadas para ${novasFaltas}.`;

  if (aulasCfg) {
    const freq = Math.round(((aulasCfg.total_aulas - novasFaltas) / aulasCfg.total_aulas) * 1000) / 10;
    msg += ` (${freq}% de presença)`;
  }

  res.json({ ok: true, mensagem: msg, faltas: novasFaltas });
};
