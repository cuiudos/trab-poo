const { parseBody } = require("../_lib/body");
const { createClient } = require("@supabase/supabase-js");
const { listaDisciplinas } = require("../_lib/disciplinas");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ ok: false });

  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");

  if (!url || !anonKey || !serviceKey) {
    return res.status(500).json({ ok: false, mensagem: "Supabase não configurado no servidor." });
  }
  if (!token) return res.status(401).json({ ok: false, mensagem: "Sessão inválida." });

  const userClient = createClient(url, anonKey);
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: userData, error: userErr } = await userClient.auth.getUser(token);
  if (userErr || !userData?.user) {
    return res.status(401).json({ ok: false, mensagem: "Sessão expirada." });
  }

  const userId = userData.user.id;
  const body = await parseBody(req);
  const { registroId, disciplina, nota, descricao, valorAtividade } = body;

  if (!registroId) return res.status(400).json({ ok: false, mensagem: "Aluno é obrigatório." });
  if (!disciplina?.trim()) return res.status(400).json({ ok: false, mensagem: "Disciplina é obrigatória." });
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

  const { data: perfil, error: perfilErr } = await admin
    .from("perfis")
    .select("role, disciplina")
    .eq("id", userId)
    .single();

  if (perfilErr || perfil?.role !== "professor") {
    return res.status(403).json({ ok: false, mensagem: "Apenas professores podem lançar notas." });
  }

  const minhasDisciplinas = listaDisciplinas(perfil.disciplina);
  const discNorm = disciplina.trim();
  const discOk = minhasDisciplinas.some((d) => d.toLowerCase() === discNorm.toLowerCase());
  if (!discOk) {
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

  const discCanon = minhasDisciplinas.find((d) => d.toLowerCase() === discNorm.toLowerCase()) || discNorm;

  const { error: insertErr } = await admin.from("notas_disciplinas").insert({
    registro_aluno_id: registroId,
    disciplina: discCanon,
    valor_atividade: valorAtvNum,
    nota: notaNum,
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

  res.json({
    ok: true,
    mensagem: `Nota ${notaNum}/${valorAtvNum} lançada em ${discCanon}${descricao?.trim() ? ` (${descricao.trim()})` : ""}.`,
  });
};
