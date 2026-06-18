const { createClient } = require("@supabase/supabase-js");
const { listaDisciplinas } = require("../_lib/disciplinas");

function mapNotas(notas) {
  return (notas || []).map((n) => ({
    id: n.id,
    atividadeId: n.atividade_id,
    disciplina: n.disciplina,
    nota: n.nota,
    valorAtividade: n.valor_atividade,
    descricao: n.descricao,
    createdAt: n.created_at,
  }));
}

function mapAtividades(atividades) {
  return (atividades || []).map((a) => ({
    id: a.id,
    disciplina: a.disciplina,
    descricao: a.descricao,
    valorAtividade: a.valor_atividade,
    createdAt: a.created_at,
  }));
}

function mapFaltas(faltas) {
  const obj = {};
  for (const f of faltas || []) {
    obj[f.disciplina] = f.faltas;
  }
  return obj;
}

function mapAulas(aulas) {
  const obj = {};
  for (const a of aulas || []) {
    obj[a.disciplina] = a.total_aulas;
  }
  return obj;
}

async function buscarRegistrosTurma(admin, turmaId) {
  const completo = `
    id, faltas, perfil_id,
    perfil:perfis(nome, cpf),
    notas_disciplinas(id, atividade_id, disciplina, valor_atividade, nota, descricao, created_at),
    faltas_disciplinas(disciplina, faltas)
  `;
  const semFaltas = `
    id, faltas, perfil_id,
    perfil:perfis(nome, cpf),
    notas_disciplinas(id, disciplina, valor_atividade, nota, descricao, created_at)
  `;
  const basico = `
    id, faltas, perfil_id,
    perfil:perfis(nome, cpf)
  `;

  let result = await admin.from("registros_alunos").select(completo).eq("turma_id", turmaId);

  if (result.error) {
    const msg = result.error.message || "";
    if (msg.includes("faltas_disciplinas")) {
      result = await admin.from("registros_alunos").select(semFaltas).eq("turma_id", turmaId);
    }
    if (result.error) {
      const msg2 = result.error.message || "";
      if (msg2.includes("notas_disciplinas") || result.error.code === "PGRST200") {
        result = await admin.from("registros_alunos").select(basico).eq("turma_id", turmaId);
      }
    }
  }

  return result;
}

module.exports = async (req, res) => {
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).json({ ok: false });

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
    return res.status(401).json({ ok: false, mensagem: "Sessão expirada. Faça login novamente." });
  }

  const userId = userData.user.id;

  const { data: perfil, error: perfilErr } = await admin
    .from("perfis")
    .select("role, escola_id, nome, disciplina")
    .eq("id", userId)
    .single();

  if (perfilErr || perfil?.role !== "professor") {
    return res.status(403).json({ ok: false, mensagem: "Acesso apenas para professores." });
  }

  const disciplinas = listaDisciplinas(perfil.disciplina);

  const { data: turmas, error: turmaErr } = await admin
    .from("turmas")
    .select("id, nome")
    .eq("professor_id", userId)
    .eq("escola_id", perfil.escola_id)
    .order("nome");

  if (turmaErr) return res.status(400).json({ ok: false, mensagem: turmaErr.message });

  const resultado = [];

  for (const t of turmas || []) {
    const { data: registros, error: regErr } = await buscarRegistrosTurma(admin, t.id);

    if (regErr) {
      return res.status(400).json({ ok: false, mensagem: regErr.message });
    }

    let aulasDisciplinas = {};
    const { data: aulasRows, error: aulasErr } = await admin
      .from("aulas_disciplinas")
      .select("disciplina, total_aulas")
      .eq("turma_id", t.id);

    if (!aulasErr) aulasDisciplinas = mapAulas(aulasRows);

    let atividades = [];
    const { data: atvRows, error: atvErr } = await admin
      .from("atividades_turma")
      .select("id, disciplina, descricao, valor_atividade, created_at")
      .eq("turma_id", t.id)
      .order("created_at", { ascending: false });

    if (!atvErr) atividades = mapAtividades(atvRows);

    const alunos = (registros || []).map((r) => {
      const p = Array.isArray(r.perfil) ? r.perfil[0] : r.perfil;
      return {
        registroId: r.id,
        perfilId: r.perfil_id,
        nome: p?.nome || "Aluno",
        cpf: p?.cpf || "",
        faltasDisciplinas: mapFaltas(r.faltas_disciplinas),
        notasDisciplinas: mapNotas(r.notas_disciplinas),
      };
    });

    resultado.push({
      id: t.id,
      nome: t.nome,
      professorNome: perfil.nome,
      professorDisciplinas: perfil.disciplina,
      aulasDisciplinas,
      atividades,
      alunos,
    });
  }

  res.json({ ok: true, disciplinas, turmas: resultado });
};
