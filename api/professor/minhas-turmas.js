const { createClient } = require("@supabase/supabase-js");
const { listaDisciplinas } = require("../_lib/disciplinas");

function mapNotas(notas) {
  return (notas || []).map((n) => ({
    id: n.id,
    disciplina: n.disciplina,
    nota: n.nota,
    descricao: n.descricao,
    createdAt: n.created_at,
  }));
}

async function buscarRegistrosTurma(admin, turmaId) {
  const comNotas = `
    id, faltas, perfil_id,
    perfil:perfis(nome, cpf),
    notas_disciplinas(id, disciplina, nota, descricao, created_at)
  `;
  const semNotas = `
    id, faltas, perfil_id,
    perfil:perfis(nome, cpf)
  `;

  let result = await admin.from("registros_alunos").select(comNotas).eq("turma_id", turmaId);

  if (result.error) {
    const msg = result.error.message || "";
    const semTabelaNotas =
      msg.includes("notas_disciplinas") ||
      msg.includes("relationship") ||
      result.error.code === "PGRST200";
    if (semTabelaNotas) {
      result = await admin.from("registros_alunos").select(semNotas).eq("turma_id", turmaId);
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

    const alunos = (registros || []).map((r) => {
      const p = Array.isArray(r.perfil) ? r.perfil[0] : r.perfil;
      return {
        registroId: r.id,
        perfilId: r.perfil_id,
        nome: p?.nome || "Aluno",
        cpf: p?.cpf || "",
        faltas: r.faltas,
        notasDisciplinas: mapNotas(r.notas_disciplinas),
      };
    });

    resultado.push({
      id: t.id,
      nome: t.nome,
      professorNome: perfil.nome,
      professorDisciplinas: perfil.disciplina,
      alunos,
    });
  }

  res.json({ ok: true, disciplinas, turmas: resultado });
};
