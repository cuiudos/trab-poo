const { validarDisciplina } = require("./auth-professor");

async function validarAtividadeProfessor(admin, userId, perfil, atividadeId) {
  if (!atividadeId) {
    return { ok: false, status: 400, mensagem: "Atividade não informada." };
  }

  const { data: atv, error } = await admin
    .from("atividades_turma")
    .select("id, turma_id, disciplina, descricao, valor_atividade, turma:turmas(id, professor_id)")
    .eq("id", atividadeId)
    .maybeSingle();

  if (error?.message?.includes("atividades_turma")) {
    return {
      ok: false,
      status: 400,
      mensagem: "Execute supabase/migracao-atividades-turma.sql no Supabase.",
    };
  }
  if (error || !atv) {
    return { ok: false, status: 404, mensagem: "Atividade não encontrada." };
  }

  const turma = Array.isArray(atv.turma) ? atv.turma[0] : atv.turma;
  if (turma?.professor_id !== userId) {
    return { ok: false, status: 403, mensagem: "Esta atividade não pertence à sua turma." };
  }

  const disc = validarDisciplina(perfil, atv.disciplina);
  if (!disc.ok) {
    return { ok: false, status: 403, mensagem: "Você não pode alterar atividades desta disciplina." };
  }

  return { ok: true, atividade: atv, discCanon: disc.discCanon };
}

module.exports = { validarAtividadeProfessor };
