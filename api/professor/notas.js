const { parseBody } = require("../_lib/body");
const { autenticarProfessor, validarDisciplina } = require("../_lib/auth-professor");
const { validarNotaProfessor } = require("../_lib/validar-nota-professor");
const { validarAtividadeProfessor } = require("../_lib/validar-atividade-professor");

function validarNotaAluno(nota, valorMax) {
  if (nota === undefined || nota === null || nota === "") {
    return { ok: false, mensagem: "Nota do aluno é obrigatória." };
  }
  const notaNum = parseFloat(nota);
  if (Number.isNaN(notaNum) || notaNum < 0 || notaNum > valorMax) {
    return { ok: false, mensagem: `Nota do aluno deve ser entre 0 e ${valorMax}.` };
  }
  return { ok: true, notaNum };
}

function validarValorAtividade(valorAtividade) {
  if (valorAtividade === undefined || valorAtividade === null || valorAtividade === "") {
    return { ok: false, mensagem: "Valor da atividade é obrigatório." };
  }
  const valorAtvNum = parseFloat(valorAtividade);
  if (Number.isNaN(valorAtvNum) || valorAtvNum <= 0 || valorAtvNum > 100) {
    return { ok: false, mensagem: "Valor da atividade deve ser entre 1 e 100." };
  }
  return { ok: true, valorAtvNum };
}

async function verificarTurmaProfessor(admin, userId, turmaId) {
  const { data: turma, error } = await admin
    .from("turmas")
    .select("id")
    .eq("id", turmaId)
    .eq("professor_id", userId)
    .maybeSingle();
  if (error || !turma) {
    return { ok: false, status: 403, mensagem: "Turma não encontrada ou não é sua." };
  }
  return { ok: true, turma };
}

async function criarAtividade(admin, userId, perfil, body, res) {
  const { turmaId, disciplina, descricao, valorAtividade } = body;
  if (!turmaId) return res.status(400).json({ ok: false, mensagem: "Turma é obrigatória." });
  if (!disciplina?.trim()) return res.status(400).json({ ok: false, mensagem: "Disciplina é obrigatória." });
  if (!descricao?.trim()) return res.status(400).json({ ok: false, mensagem: "Descrição é obrigatória." });

  const vals = validarValorAtividade(valorAtividade);
  if (!vals.ok) return res.status(400).json({ ok: false, mensagem: vals.mensagem });

  const turmaOk = await verificarTurmaProfessor(admin, userId, turmaId);
  if (!turmaOk.ok) return res.status(turmaOk.status).json({ ok: false, mensagem: turmaOk.mensagem });

  const disc = validarDisciplina(perfil, disciplina);
  if (!disc.ok) return res.status(400).json({ ok: false, mensagem: disc.mensagem });

  const { error: insertErr } = await admin.from("atividades_turma").insert({
    turma_id: turmaId,
    disciplina: disc.discCanon,
    descricao: descricao.trim(),
    valor_atividade: vals.valorAtvNum,
    professor_id: userId,
  });

  if (insertErr?.message?.includes("atividades_turma")) {
    return res.status(400).json({
      ok: false,
      mensagem: "Execute supabase/migracao-atividades-turma.sql no Supabase.",
    });
  }
  if (insertErr) return res.status(400).json({ ok: false, mensagem: insertErr.message });

  return res.json({
    ok: true,
    mensagem: `Atividade "${descricao.trim()}" criada para a turma em ${disc.discCanon} (vale ${vals.valorAtvNum} pts).`,
  });
}

async function editarAtividade(admin, userId, perfil, body, res) {
  const { atividadeId, descricao, valorAtividade } = body;
  const validacao = await validarAtividadeProfessor(admin, userId, perfil, atividadeId);
  if (!validacao.ok) {
    return res.status(validacao.status).json({ ok: false, mensagem: validacao.mensagem });
  }
  if (!descricao?.trim()) return res.status(400).json({ ok: false, mensagem: "Descrição é obrigatória." });

  const vals = validarValorAtividade(valorAtividade);
  if (!vals.ok) return res.status(400).json({ ok: false, mensagem: vals.mensagem });

  const desc = descricao.trim();
  const { error: updateErr } = await admin
    .from("atividades_turma")
    .update({ descricao: desc, valor_atividade: vals.valorAtvNum })
    .eq("id", atividadeId);

  if (updateErr) return res.status(400).json({ ok: false, mensagem: updateErr.message });

  await admin
    .from("notas_disciplinas")
    .update({ descricao: desc, valor_atividade: vals.valorAtvNum })
    .eq("atividade_id", atividadeId);

  return res.json({
    ok: true,
    mensagem: `Atividade atualizada: "${desc}" (${vals.valorAtvNum} pts) em ${validacao.discCanon}.`,
  });
}

async function excluirAtividade(admin, userId, perfil, body, res) {
  const { atividadeId } = body;
  const validacao = await validarAtividadeProfessor(admin, userId, perfil, atividadeId);
  if (!validacao.ok) {
    return res.status(validacao.status).json({ ok: false, mensagem: validacao.mensagem });
  }

  const { error: delErr } = await admin.from("atividades_turma").delete().eq("id", atividadeId);
  if (delErr) return res.status(400).json({ ok: false, mensagem: delErr.message });

  const atv = validacao.atividade;
  return res.json({
    ok: true,
    mensagem: `Atividade "${atv.descricao}" excluída de ${validacao.discCanon} (notas dos alunos removidas).`,
  });
}

async function lancarNota(admin, userId, perfil, body, res) {
  const { registroId, atividadeId, nota } = body;
  if (!registroId) return res.status(400).json({ ok: false, mensagem: "Aluno é obrigatório." });

  const validacao = await validarAtividadeProfessor(admin, userId, perfil, atividadeId);
  if (!validacao.ok) {
    return res.status(validacao.status).json({ ok: false, mensagem: validacao.mensagem });
  }

  const atv = validacao.atividade;
  const vals = validarNotaAluno(nota, atv.valor_atividade);
  if (!vals.ok) return res.status(400).json({ ok: false, mensagem: vals.mensagem });

  const { data: registro, error: regErr } = await admin
    .from("registros_alunos")
    .select("id, turma_id, turma:turmas(professor_id)")
    .eq("id", registroId)
    .maybeSingle();

  if (regErr || !registro) {
    return res.status(404).json({ ok: false, mensagem: "Aluno não encontrado na turma." });
  }

  const turma = Array.isArray(registro.turma) ? registro.turma[0] : registro.turma;
  if (turma?.professor_id !== userId) {
    return res.status(403).json({ ok: false, mensagem: "Este aluno não está na sua turma." });
  }
  if (registro.turma_id !== atv.turma_id) {
    return res.status(400).json({ ok: false, mensagem: "Esta atividade não é da turma do aluno." });
  }

  const { data: existente } = await admin
    .from("notas_disciplinas")
    .select("id")
    .eq("registro_aluno_id", registroId)
    .eq("atividade_id", atividadeId)
    .maybeSingle();

  if (existente?.id) {
    return res.status(400).json({
      ok: false,
      mensagem: "Este aluno já tem nota nesta atividade. Use editar na tabela.",
    });
  }

  const { error: insertErr } = await admin.from("notas_disciplinas").insert({
    registro_aluno_id: registroId,
    atividade_id: atividadeId,
    disciplina: validacao.discCanon,
    valor_atividade: atv.valor_atividade,
    descricao: atv.descricao,
    nota: vals.notaNum,
    professor_id: userId,
  });

  if (insertErr) {
    if (insertErr.message?.includes("atividade_id") || insertErr.message?.includes("atividades_turma")) {
      return res.status(400).json({
        ok: false,
        mensagem: "Execute supabase/migracao-atividades-turma.sql no Supabase.",
      });
    }
    return res.status(400).json({ ok: false, mensagem: insertErr.message });
  }

  return res.json({
    ok: true,
    mensagem: `Nota ${vals.notaNum}/${atv.valor_atividade} lançada em ${validacao.discCanon} — ${atv.descricao}.`,
  });
}

async function editarNota(admin, userId, perfil, body, res) {
  const { notaId, nota } = body;
  const validacao = await validarNotaProfessor(admin, userId, perfil, notaId);
  if (!validacao.ok) {
    return res.status(validacao.status).json({ ok: false, mensagem: validacao.mensagem });
  }

  const valorMax = validacao.nota.valor_atividade;
  const vals = validarNotaAluno(nota, valorMax);
  if (!vals.ok) return res.status(400).json({ ok: false, mensagem: vals.mensagem });

  const { error: updateErr } = await admin.from("notas_disciplinas").update({ nota: vals.notaNum }).eq("id", notaId);
  if (updateErr) return res.status(400).json({ ok: false, mensagem: updateErr.message });

  const desc = validacao.nota.descricao ? ` — ${validacao.nota.descricao}` : "";
  return res.json({
    ok: true,
    mensagem: `Nota atualizada: ${vals.notaNum}/${valorMax} em ${validacao.discCanon}${desc}.`,
  });
}

async function excluirNota(admin, userId, perfil, body, res) {
  const { notaId } = body;
  const validacao = await validarNotaProfessor(admin, userId, perfil, notaId);
  if (!validacao.ok) {
    return res.status(validacao.status).json({ ok: false, mensagem: validacao.mensagem });
  }

  const { error: delErr } = await admin.from("notas_disciplinas").delete().eq("id", notaId);
  if (delErr) return res.status(400).json({ ok: false, mensagem: delErr.message });

  const n = validacao.nota;
  const desc = n.descricao ? ` (${n.descricao})` : "";
  return res.json({
    ok: true,
    mensagem: `Nota excluída: ${n.nota}/${n.valor_atividade} em ${validacao.discCanon}${desc}.`,
  });
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ ok: false });

  const auth = await autenticarProfessor(req);
  if (auth.erro) return res.status(auth.erro.status).json({ ok: false, mensagem: auth.erro.mensagem });

  const { admin, userId, perfil } = auth;
  const body = await parseBody(req);
  const acao = body.acao || "lancar";

  if (acao === "criar-atividade") return criarAtividade(admin, userId, perfil, body, res);
  if (acao === "editar-atividade") return editarAtividade(admin, userId, perfil, body, res);
  if (acao === "excluir-atividade") return excluirAtividade(admin, userId, perfil, body, res);
  if (acao === "lancar") return lancarNota(admin, userId, perfil, body, res);
  if (acao === "editar") return editarNota(admin, userId, perfil, body, res);
  if (acao === "excluir") return excluirNota(admin, userId, perfil, body, res);

  return res.status(400).json({ ok: false, mensagem: "Ação inválida." });
};
