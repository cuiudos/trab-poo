const { validarDisciplina } = require("./auth-professor");

async function validarNotaProfessor(admin, userId, perfil, notaId) {
  if (!notaId) {
    return { ok: false, status: 400, mensagem: "Atividade não informada." };
  }

  const { data: notaRow, error } = await admin
    .from("notas_disciplinas")
    .select(
      "id, disciplina, valor_atividade, nota, descricao, registro_aluno_id, registro:registros_alunos(id, turma:turmas(id, professor_id))"
    )
    .eq("id", notaId)
    .maybeSingle();

  if (error || !notaRow) {
    return { ok: false, status: 404, mensagem: "Atividade não encontrada." };
  }

  const registro = Array.isArray(notaRow.registro) ? notaRow.registro[0] : notaRow.registro;
  const turma = Array.isArray(registro?.turma) ? registro.turma[0] : registro?.turma;

  if (turma?.professor_id !== userId) {
    return { ok: false, status: 403, mensagem: "Esta atividade não pertence à sua turma." };
  }

  const disc = validarDisciplina(perfil, notaRow.disciplina);
  if (!disc.ok) {
    return { ok: false, status: 403, mensagem: "Você não pode alterar notas desta disciplina." };
  }

  return { ok: true, nota: notaRow, discCanon: disc.discCanon };
}

module.exports = { validarNotaProfessor };
