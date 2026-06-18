const { parseBody } = require("../_lib/body");
const { autenticarProfessor } = require("../_lib/auth-professor");
const { listaDisciplinas } = require("../_lib/disciplinas");
const { validarNotaProfessor } = require("../_lib/validar-nota-professor");

function validarValoresNota(valorAtividade, nota) {
  if (valorAtividade === undefined || valorAtividade === null || valorAtividade === "") {
    return { ok: false, mensagem: "Valor da atividade é obrigatório." };
  }
  if (nota === undefined || nota === null || nota === "") {
    return { ok: false, mensagem: "Nota do aluno é obrigatória." };
  }
  const valorAtvNum = parseFloat(valorAtividade);
  if (Number.isNaN(valorAtvNum) || valorAtvNum <= 0 || valorAtvNum > 100) {
    return { ok: false, mensagem: "Valor da atividade deve ser entre 1 e 100." };
  }
  const notaNum = parseFloat(nota);
  if (Number.isNaN(notaNum) || notaNum < 0 || notaNum > valorAtvNum) {
    return {
      ok: false,
      mensagem: `Nota do aluno deve ser entre 0 e ${valorAtvNum} (valor da atividade).`,
    };
  }
  return { ok: true, valorAtvNum, notaNum };
}

async function lancarNota(admin, userId, perfil, body, res) {
  const { registroId, disciplina, nota, descricao, valorAtividade } = body;
  if (!registroId) return res.status(400).json({ ok: false, mensagem: "Aluno é obrigatório." });
  if (!disciplina?.trim()) return res.status(400).json({ ok: false, mensagem: "Disciplina é obrigatória." });

  const vals = validarValoresNota(valorAtividade, nota);
  if (!vals.ok) return res.status(400).json({ ok: false, mensagem: vals.mensagem });

  const minhasDisciplinas = listaDisciplinas(perfil.disciplina);
  const discNorm = disciplina.trim();
  const discCanon = minhasDisciplinas.find((d) => d.toLowerCase() === discNorm.toLowerCase());
  if (!discCanon) {
    return res.status(400).json({
      ok: false,
      mensagem: `Disciplina inválida. Suas disciplinas: ${minhasDisciplinas.join(", ") || "nenhuma cadastrada"}.`,
    });
  }

  const { data: registro, error: regErr } = await admin
    .from("registros_alunos")
    .select("id, turma:turmas(professor_id)")
    .eq("id", registroId)
    .maybeSingle();

  if (regErr || !registro) {
    return res.status(404).json({ ok: false, mensagem: "Aluno não encontrado na turma." });
  }

  const turma = Array.isArray(registro.turma) ? registro.turma[0] : registro.turma;
  if (turma?.professor_id !== userId) {
    return res.status(403).json({ ok: false, mensagem: "Este aluno não está na sua turma." });
  }

  const { error: insertErr } = await admin.from("notas_disciplinas").insert({
    registro_aluno_id: registroId,
    disciplina: discCanon,
    valor_atividade: vals.valorAtvNum,
    nota: vals.notaNum,
    descricao: descricao?.trim() || null,
    professor_id: userId,
  });

  if (insertErr) {
    if (insertErr.message?.includes("notas_disciplinas") || insertErr.message?.includes("valor_atividade")) {
      return res.status(400).json({
        ok: false,
        mensagem: "Execute supabase/migracao-notas-valor-atividade.sql no Supabase.",
      });
    }
    return res.status(400).json({ ok: false, mensagem: insertErr.message });
  }

  const desc = descricao?.trim();
  return res.json({
    ok: true,
    mensagem: `Nota ${vals.notaNum}/${vals.valorAtvNum} lançada em ${discCanon}${desc ? ` (${desc})` : ""}.`,
  });
}

async function editarNota(admin, userId, perfil, body, res) {
  const { notaId, nota, descricao, valorAtividade } = body;
  const validacao = await validarNotaProfessor(admin, userId, perfil, notaId);
  if (!validacao.ok) {
    return res.status(validacao.status).json({ ok: false, mensagem: validacao.mensagem });
  }

  const vals = validarValoresNota(valorAtividade, nota);
  if (!vals.ok) return res.status(400).json({ ok: false, mensagem: vals.mensagem });

  const { error: updateErr } = await admin
    .from("notas_disciplinas")
    .update({
      valor_atividade: vals.valorAtvNum,
      nota: vals.notaNum,
      descricao: descricao?.trim() || null,
    })
    .eq("id", notaId);

  if (updateErr) return res.status(400).json({ ok: false, mensagem: updateErr.message });

  const desc = descricao?.trim();
  return res.json({
    ok: true,
    mensagem: `Atividade atualizada: ${vals.notaNum}/${vals.valorAtvNum} em ${validacao.discCanon}${desc ? ` (${desc})` : ""}.`,
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
    mensagem: `Atividade excluída: ${n.nota}/${n.valor_atividade} em ${validacao.discCanon}${desc}.`,
  });
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ ok: false });

  const auth = await autenticarProfessor(req);
  if (auth.erro) return res.status(auth.erro.status).json({ ok: false, mensagem: auth.erro.mensagem });

  const { admin, userId, perfil } = auth;
  const body = await parseBody(req);
  const acao = body.acao || "lancar";

  if (acao === "lancar") return lancarNota(admin, userId, perfil, body, res);
  if (acao === "editar") return editarNota(admin, userId, perfil, body, res);
  if (acao === "excluir") return excluirNota(admin, userId, perfil, body, res);

  return res.status(400).json({ ok: false, mensagem: "Ação inválida." });
};
