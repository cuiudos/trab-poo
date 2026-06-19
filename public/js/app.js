const { createClient } = supabase;

let supabaseClient = null;
let sessaoAtual = null;
let perfilAtual = "diretor";
let escolaId = null;
let userId = null;

const $ = (sel) => document.querySelector(sel);

function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.hidden = false;
  setTimeout(() => (el.hidden = true), 3200);
}

function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s ?? "";
  return d.innerHTML;
}

function authHeader() {
  const token = sessaoAtual?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function adminPost(path, body) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  try {
    return { status: res.status, ...JSON.parse(text) };
  } catch {
    return { ok: false, status: res.status, mensagem: "Servidor indisponível." };
  }
}

async function ensureSupabase() {
  if (!supabaseClient) await initSupabase();
  if (!supabaseClient) {
    throw new Error("Supabase não inicializado. Verifique as variáveis na Vercel.");
  }
}

async function initSupabase() {
  const res = await fetch("/api/env");
  const env = await res.json();
  if (!env.ok) throw new Error(env.mensagem || "Configure Supabase na Vercel.");
  supabaseClient = createClient(env.url, env.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
}

async function adminGet(path) {
  const res = await fetch(path, { headers: authHeader() });
  const text = await res.text();
  try {
    return { status: res.status, ...JSON.parse(text) };
  } catch {
    return { ok: false, status: res.status, mensagem: "Servidor indisponível." };
  }
}

async function buscarIdPorEmail(email) {
  const e = loginParaEmail(email);
  const r = await adminPost("/api/admin/buscar-email", { email: e });
  if (!r.ok) return null;
  return r.id;
}

/* —— Login —— */
const DOMINIO_LOGIN = "acacias.edu.br";

function ativarAbaPerfil(role) {
  document.querySelectorAll(".role-tab").forEach((b) => {
    b.classList.toggle("active", b.dataset.tipo === role);
  });
  perfilAtual = role;
}

function emailsParaTentar(valor) {
  const v = valor.trim().toLowerCase();
  const base = v.includes("@") ? v.split("@")[0] : v;
  const emails = new Set([v.includes("@") ? v : `${base}@${DOMINIO_LOGIN}`]);

  if (base === "professor2") emails.add(`profesor2@${DOMINIO_LOGIN}`);
  if (base === "profesor2") emails.add(`professor2@${DOMINIO_LOGIN}`);

  return [...emails];
}

function loginParaEmail(valor) {
  return emailsParaTentar(valor)[0];
}

function emailParaLogin(email) {
  if (!email) return "";
  const partes = email.toLowerCase().split("@");
  if (partes.length !== 2) return email;
  const [local, dominio] = partes;
  return dominio === DOMINIO_LOGIN ? local : email;
}

async function signInComEmail(valor, password) {
  let ultimoErro = null;
  for (const email of emailsParaTentar(valor)) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (!error) return { data, error: null };
    ultimoErro = error;
    if (error.message !== "Invalid login credentials") break;
  }
  return { data: null, error: ultimoErro };
}

document.querySelectorAll(".role-tab").forEach((btn) => {
  btn.addEventListener("click", () => ativarAbaPerfil(btn.dataset.tipo));
});

$("#form-login").addEventListener("submit", async (e) => {
  e.preventDefault();
  const erro = $("#login-erro");
  const btn = $("#btn-login");
  erro.hidden = true;
  btn.disabled = true;
  btn.textContent = "Entrando…";

  try {
    await ensureSupabase();
    const { data, error } = await signInComEmail($("#email").value, $("#senha").value);

    if (error) {
      erro.textContent =
        error.message === "Invalid login credentials"
          ? "Usuário ou senha incorretos. Use só o login (ex: professor2) ou o e-mail completo."
          : error.message;
      erro.hidden = false;
      return;
    }

    sessaoAtual = data.session;
    userId = data.user.id;

    const { data: perfil, error: perfilErr } = await supabaseClient
      .from("perfis")
      .select("nome, role, escola_id")
      .eq("id", userId)
      .single();

    if (perfilErr || !perfil) {
      await supabaseClient.auth.signOut();
      erro.textContent = "Perfil não cadastrado. Execute: npm run setup";
      erro.hidden = false;
      return;
    }

    ativarAbaPerfil(perfil.role);
    escolaId = perfil.escola_id;
    mostrarApp({ nome: perfil.nome, perfil: perfil.role });
  } catch (err) {
    erro.textContent = err.message;
    erro.hidden = false;
  } finally {
    btn.disabled = false;
    btn.textContent = "Continuar →";
  }
});

$("#btn-sair").addEventListener("click", async () => {
  if (supabaseClient) await supabaseClient.auth.signOut();
  sessaoAtual = null;
  $("#app").hidden = true;
  $("#tela-login").hidden = false;
});

function mostrarApp(sessao) {
  $("#tela-login").hidden = true;
  $("#app").hidden = false;
  $("#user-nome").textContent = sessao.nome;
  $("#user-perfil").textContent = sessao.perfil;

  document.querySelectorAll(".painel").forEach((p) => (p.hidden = true));

  if (sessao.perfil === "diretor") {
    $("#painel-diretor").hidden = false;
    carregarUsuariosDiretor();
    carregarTurmasDiretor();
  } else if (sessao.perfil === "professor") {
    $("#painel-professor").hidden = false;
    carregarTurmaProfessor();
  } else if (sessao.perfil === "aluno") {
    $("#painel-aluno").hidden = false;
    carregarDadosAluno();
  }
}

async function verificarSessao() {
  if (!supabaseClient) return;
  const { data } = await supabaseClient.auth.getSession();
  if (!data.session) return;

  sessaoAtual = data.session;
  userId = data.session.user.id;

  const { data: perfil } = await supabaseClient
    .from("perfis")
    .select("nome, role, escola_id")
    .eq("id", userId)
    .single();

  if (perfil) {
    escolaId = perfil.escola_id;
    ativarAbaPerfil(perfil.role);
    mostrarApp({ nome: perfil.nome, perfil: perfil.role });
  }
}

let cacheUsuariosPorId = null;
let usuariosLista = [];
let turmasProfessorCache = [];
let disciplinasProfessorCache = [];
let professorContexto = { turmaId: null, disciplina: null, aba: "notas" };

function listaDisciplinas(valor) {
  if (!valor) return [];
  return String(valor)
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function renderDisciplinasHtml(valor) {
  const lista = listaDisciplinas(valor);
  if (!lista.length) return "—";
  return lista.map((d) => `<span class="disciplina-tag">${escapeHtml(d)}</span>`).join("");
}

function formatNotasHtml(notas) {
  if (!notas?.length) return "—";
  return notas
    .map((n) => {
      const max = n.valorAtividade ?? 100;
      const desc = n.descricao ? ` — ${escapeHtml(n.descricao)}` : "";
      return `<div class="nota-item"><strong>${escapeHtml(n.disciplina)}</strong>: ${n.nota} / ${max}${desc}</div>`;
    })
    .join("");
}

function notasDaDisciplina(notas, disciplina) {
  return (notas || []).filter((n) => n.disciplina === disciplina);
}

function atividadesDaDisciplina(atividades, disciplina) {
  return (atividades || []).filter((a) => a.disciplina === disciplina);
}

function encontrarTurmaPorAluno(registroId) {
  for (const t of turmasProfessorCache || []) {
    if ((t.alunos || []).some((a) => a.registroId === registroId)) return t;
  }
  return null;
}

function encontrarAtividadePorId(atividadeId) {
  for (const t of turmasProfessorCache || []) {
    const a = (t.atividades || []).find((x) => x.id === atividadeId);
    if (a) return { ...a, turmaId: t.id, turmaNome: t.nome };
  }
  return null;
}

function encontrarNotaPorId(notaId) {
  for (const t of turmasProfessorCache || []) {
    for (const a of t.alunos || []) {
      const n = (a.notasDisciplinas || []).find((x) => x.id === notaId);
      if (n) return n;
    }
  }
  return null;
}

function formatNotasProfessorHtml(notas, disciplina) {
  const lista = notasDaDisciplina(notas, disciplina);
  if (!lista.length) return "—";
  return lista
    .map((n) => {
      const max = n.valorAtividade ?? 100;
      const desc = n.descricao ? ` — ${escapeHtml(n.descricao)}` : "";
      return `<div class="nota-item nota-item-editavel">
        <span class="nota-texto">${n.nota} / ${max}${desc}</span>
        <span class="nota-acoes">
          <button type="button" class="btn-icon btn-sm" data-acao="editar-nota" data-nota-id="${n.id}" title="Editar nota">✎</button>
          <button type="button" class="btn-icon btn-icon-danger btn-sm" data-acao="excluir-nota" data-nota-id="${n.id}" title="Excluir nota">✕</button>
        </span>
      </div>`;
    })
    .join("");
}

function formatAtividadesProfessorHtml(atividades, disciplina) {
  const lista = atividadesDaDisciplina(atividades, disciplina);
  if (!lista.length) return `<p class="meta atividades-vazio">Nenhuma atividade cadastrada para a turma.</p>`;
  return lista
    .map(
      (a) => `<div class="atividade-item nota-item-editavel">
        <span class="nota-texto"><strong>${escapeHtml(a.descricao)}</strong> · ${a.valorAtividade} pts</span>
        <span class="nota-acoes">
          <button type="button" class="btn-icon btn-sm" data-acao="editar-atividade" data-atividade-id="${a.id}" title="Editar atividade">✎</button>
          <button type="button" class="btn-icon btn-icon-danger btn-sm" data-acao="excluir-atividade" data-atividade-id="${a.id}" title="Excluir atividade">✕</button>
        </span>
      </div>`
    )
    .join("");
}

function calcularSituacaoDisciplina(notas, faltasDisciplinas, aulasDisciplinas, disciplina) {
  const notaRes = calcularResultadoFinal(notasDaDisciplina(notas, disciplina));
  let reprovadoFalta = false;
  const totalAulas = aulasDisciplinas?.[disciplina];
  if (totalAulas) {
    const calc = calcularFrequenciaDisciplina(faltasDisciplinas?.[disciplina] || 0, totalAulas);
    if (calc?.reprovadoFalta) reprovadoFalta = true;
  }

  let situacaoFinal = null;
  const passNota = notaRes.percentual === null ? null : notaRes.percentual >= 60;
  if (passNota === false) situacaoFinal = "Reprovado (nota)";
  else if (reprovadoFalta) situacaoFinal = "Reprovado (falta)";
  else if (passNota === true) situacaoFinal = "Aprovado";

  return { ...notaRes, situacaoFinal, reprovadoFalta };
}

function formatSituacaoDisciplinaHtml(notas, faltasDisciplinas, aulasDisciplinas, disciplina) {
  const r = calcularSituacaoDisciplina(notas, faltasDisciplinas, aulasDisciplinas, disciplina);
  if (!r.situacaoFinal) return "—";
  const cls = r.situacaoFinal.startsWith("Aprovado") ? "badge-aprovado" : "badge-reprovado";
  return `<span class="badge-situacao ${cls}">${r.situacaoFinal}</span>`;
}

function formatFrequenciaDisciplinaHtml(faltasDisciplinas, aulasDisciplinas, disciplina) {
  const total = aulasDisciplinas?.[disciplina];
  if (!total) return `<span class="meta">Cadastre as aulas</span>`;
  const calc = calcularFrequenciaDisciplina(faltasDisciplinas?.[disciplina] || 0, total);
  if (!calc) return "—";
  const cls = calc.reprovadoFalta ? "freq-reprovado" : "freq-ok";
  return `<div class="freq-item ${cls}"><span class="freq-pct">${calc.percentualFaltas}% faltas</span> · ${calc.faltas}/${calc.totalAulas} aulas</div>`;
}

function calcularResultadoFinal(notas) {
  if (!notas?.length) {
    return { pontos: 0, pontosMax: 0, percentual: null, situacao: null };
  }

  let pontos = 0;
  let pontosMax = 0;
  for (const n of notas) {
    pontos += Number(n.nota) || 0;
    pontosMax += Number(n.valorAtividade ?? 100) || 0;
  }

  if (pontosMax <= 0) {
    return { pontos: 0, pontosMax: 0, percentual: null, situacao: null };
  }

  const percentual = Math.round((pontos / pontosMax) * 1000) / 10;
  const situacao = percentual >= 60 ? "Aprovado" : "Reprovado";
  return { pontos, pontosMax, percentual, situacao };
}

function formatTotalHtml(notas) {
  const r = calcularResultadoFinal(notas);
  if (r.percentual === null) return "—";
  return `<strong>${r.percentual}%</strong><br><span class="meta">${r.pontos} / ${r.pontosMax} pts</span>`;
}

function calcularFrequenciaDisciplina(faltas, totalAulas) {
  const total = Number(totalAulas) || 0;
  const f = Number(faltas) || 0;
  if (total <= 0) return null;
  const limiteFaltas = Math.floor(total * 0.25);
  const percentualFaltas = Math.round((f / total) * 1000) / 10;
  const reprovadoFalta = f > limiteFaltas;
  return { faltas: f, totalAulas: total, percentualFaltas, limiteFaltas, reprovadoFalta };
}

function mapFaltasLista(faltas) {
  const obj = {};
  for (const f of faltas || []) obj[f.disciplina] = f.faltas;
  return obj;
}

function mapAulasLista(aulas) {
  const obj = {};
  for (const a of aulas || []) obj[a.disciplina] = a.total_aulas;
  return obj;
}

function calcularSituacaoCompleta(notas, faltasDisciplinas, aulasDisciplinas) {
  const notaRes = calcularResultadoFinal(notas);
  const frequencias = [];
  let reprovadoFalta = false;

  for (const disc of Object.keys(aulasDisciplinas || {})) {
    const total = aulasDisciplinas[disc];
    if (!total) continue;
    const calc = calcularFrequenciaDisciplina(faltasDisciplinas?.[disc] || 0, total);
    if (calc) {
      frequencias.push({ disciplina: disc, ...calc });
      if (calc.reprovadoFalta) reprovadoFalta = true;
    }
  }

  let situacaoFinal = null;
  const passNota = notaRes.percentual === null ? null : notaRes.percentual >= 60;

  if (passNota === false) situacaoFinal = "Reprovado (nota)";
  else if (reprovadoFalta) situacaoFinal = "Reprovado (falta)";
  else if (passNota === true) situacaoFinal = "Aprovado";
  else if (reprovadoFalta) situacaoFinal = "Reprovado (falta)";

  return { ...notaRes, frequencias, reprovadoFalta, situacaoFinal };
}

function formatFrequenciaHtml(faltasDisciplinas, aulasDisciplinas) {
  const discs = Object.keys(aulasDisciplinas || {});
  if (!discs.length) return `<span class="meta">Cadastre as aulas</span>`;

  return discs
    .map((disc) => {
      const calc = calcularFrequenciaDisciplina(faltasDisciplinas?.[disc] || 0, aulasDisciplinas[disc]);
      if (!calc) return "";
      const cls = calc.reprovadoFalta ? "freq-reprovado" : "freq-ok";
      return `<div class="freq-item ${cls}"><strong>${escapeHtml(disc)}</strong>: <span class="freq-pct">${calc.percentualFaltas}% faltas</span> · ${calc.faltas}/${calc.totalAulas} aulas</div>`;
    })
    .join("");
}

function formatSituacaoHtml(notas, faltasDisciplinas, aulasDisciplinas) {
  const r = calcularSituacaoCompleta(notas, faltasDisciplinas, aulasDisciplinas);
  if (!r.situacaoFinal) return "—";
  const cls = r.situacaoFinal.startsWith("Aprovado") ? "badge-aprovado" : "badge-reprovado";
  return `<span class="badge-situacao ${cls}">${r.situacaoFinal}</span>`;
}

function atualizarMaxNotaAluno() {
  const sel = $("#pr-nota-atividade");
  const opt = sel?.selectedOptions?.[0];
  const valor = opt?.dataset?.valor ? parseFloat(opt.dataset.valor) : NaN;
  const inputNota = $("#pr-nota-valor");
  if (!inputNota) return;
  const max = Number.isNaN(valor) || valor <= 0 ? 100 : Math.min(valor, 100);
  inputNota.max = max;
  inputNota.placeholder = valor > 0 ? `Nota do aluno (0 a ${max})` : "Selecione a atividade";
}

function popularSelectAtividades(registroId) {
  const sel = $("#pr-nota-atividade");
  if (!sel) return;
  if (!registroId) {
    sel.innerHTML = "<option value=''>Selecione o aluno primeiro</option>";
    atualizarMaxNotaAluno();
    return;
  }
  const turma = encontrarTurmaPorAluno(registroId);
  const atividades = turma?.atividades || [];
  if (!atividades.length) {
    sel.innerHTML = "<option value=''>Crie uma atividade para a turma</option>";
    atualizarMaxNotaAluno();
    return;
  }
  sel.innerHTML = atividades
    .map(
      (a) =>
        `<option value="${a.id}" data-valor="${a.valorAtividade}">${escapeHtml(a.disciplina)} — ${escapeHtml(a.descricao)} (${a.valorAtividade} pts)</option>`
    )
    .join("");
  atualizarMaxNotaAluno();
}

function popularSelectsDisciplinas(disciplinas) {
  const vazio = !disciplinas?.length
    ? "<option value=''>Cadastre disciplinas no diretor</option>"
    : disciplinas.map((d) => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join("");

  for (const id of ["pr-atividade-disciplina", "pr-falta-disciplina", "pr-aulas-disciplina"]) {
    const sel = $(`#${id}`);
    if (sel) sel.innerHTML = vazio;
  }
}

function popularSelectTurmasProfessor(turmas) {
  for (const cfg of [
    { sel: "pr-aulas-turma", wrap: "pr-aulas-turma-wrap" },
    { sel: "pr-atividade-turma", wrap: "pr-atividade-turma-wrap" },
  ]) {
    const el = $(`#${cfg.sel}`);
    const wrap = $(`#${cfg.wrap}`);
    if (!el) continue;
    if (!turmas?.length) {
      el.innerHTML = "<option value=''>Sem turma</option>";
      continue;
    }
    el.innerHTML = turmas.map((t) => `<option value="${t.id}">${escapeHtml(t.nome)}</option>`).join("");
    if (wrap) wrap.hidden = turmas.length <= 1;
  }
}

function infoExtraUsuario(u) {
  if (u.role === "professor") {
    const disc = u.disciplinas?.length ? u.disciplinas : listaDisciplinas(u.disciplina);
    const turmas = u.turmasProfessor?.length ? u.turmasProfessor.join(", ") : null;
    const partes = [];
    if (disc.length) partes.push(disc.join(", "));
    if (turmas) partes.push(`Turmas: ${turmas}`);
    return partes.join(" · ") || "—";
  }
  if (u.role === "aluno") {
    const partes = [u.turmaAluno || "Sem turma"];
    if (u.matricula) partes.push(`Matr. ${u.matricula}`);
    if (u.responsavelNome) partes.push(`Resp. ${u.responsavelNome}`);
    return partes.join(" · ");
  }
  return "—";
}

async function obterUsuariosPorId() {
  if (!cacheUsuariosPorId) {
    const lista = await listarTodosUsuarios();
    cacheUsuariosPorId = new Map(lista.map((u) => [u.id, u]));
  }
  return cacheUsuariosPorId;
}

function invalidarCacheUsuarios() {
  cacheUsuariosPorId = null;
}

async function buscarRegistrosTurma(turmaId) {
  const completo =
    "id, faltas, perfil_id, perfil:perfis(nome, cpf), notas_disciplinas(id, disciplina, valor_atividade, nota, descricao, created_at), faltas_disciplinas(disciplina, faltas)";
  const semFaltas =
    "id, faltas, perfil_id, perfil:perfis(nome, cpf), notas_disciplinas(id, disciplina, valor_atividade, nota, descricao, created_at)";
  const semNotas = "id, faltas, perfil_id, perfil:perfis(nome, cpf)";

  let result = await supabaseClient.from("registros_alunos").select(completo).eq("turma_id", turmaId);

  if (result.error) {
    const msg = result.error.message || "";
    if (msg.includes("faltas_disciplinas")) {
      result = await supabaseClient.from("registros_alunos").select(semFaltas).eq("turma_id", turmaId);
    }
    if (result.error) {
      const msg2 = result.error.message || "";
      if (msg2.includes("notas_disciplinas") || result.error.code === "PGRST200") {
        result = await supabaseClient.from("registros_alunos").select(semNotas).eq("turma_id", turmaId);
      }
    }
  }

  return result;
}

async function buscarAulasTurma(turmaId) {
  const { data, error } = await supabaseClient
    .from("aulas_disciplinas")
    .select("disciplina, total_aulas")
    .eq("turma_id", turmaId);
  if (error) return {};
  return mapAulasLista(data);
}

function mapRegistrosParaAlunos(registros) {
  return (registros || []).map((r) => {
    const p = Array.isArray(r.perfil) ? r.perfil[0] : r.perfil;
    const notas = (r.notas_disciplinas || []).map((n) => ({
      id: n.id,
      atividadeId: n.atividade_id,
      disciplina: n.disciplina,
      valorAtividade: n.valor_atividade,
      nota: n.nota,
      descricao: n.descricao,
    }));
    return {
      registroId: r.id,
      perfilId: r.perfil_id,
      nome: p?.nome || "Aluno",
      cpf: p?.cpf || "",
      faltasDisciplinas: mapFaltasLista(r.faltas_disciplinas),
      notasDisciplinas: notas,
    };
  });
}

async function listarTurmasCompletas() {
  const usuarios = perfilAtual === "diretor" ? await obterUsuariosPorId() : new Map();
  if (perfilAtual === "professor") {
    const { data: me } = await supabaseClient.from("perfis").select("disciplina").eq("id", userId).single();
    if (me) usuarios.set(userId, { disciplina: me.disciplina });
  }
  const { data: turmas, error: turmaErr } = await supabaseClient
    .from("turmas")
    .select("id, nome, professor_id")
    .eq("escola_id", escolaId)
    .order("nome");

  if (turmaErr) throw turmaErr;

  const resultado = [];

  for (const t of turmas || []) {
    let professorNome = null;
    if (t.professor_id) {
      const { data: prof } = await supabaseClient
        .from("perfis")
        .select("nome")
        .eq("id", t.professor_id)
        .maybeSingle();
      professorNome = prof?.nome;
    }

    const { data: registros, error: regErr } = await buscarRegistrosTurma(t.id);
    if (regErr) throw regErr;

    const alunos = mapRegistrosParaAlunos(registros);
    const aulasDisciplinas = await buscarAulasTurma(t.id);

    resultado.push({
      id: t.id,
      nome: t.nome,
      professorId: t.professor_id,
      professorNome,
      professorLogin: t.professor_id ? usuarios.get(t.professor_id)?.login : null,
      professorDisciplinas: t.professor_id ? usuarios.get(t.professor_id)?.disciplina : null,
      aulasDisciplinas,
      alunos,
    });
  }

  return resultado;
}

function renderTurmas(container, turmas, comSelect = false, modoDiretor = false) {
  if (comSelect && !modoDiretor) {
    return;
  }

  if (!turmas?.length) {
    container.innerHTML = "<p>Nenhuma turma cadastrada.</p>";
    return;
  }

  container.innerHTML = turmas
    .map((t) => {
      const aulas = t.aulasDisciplinas || {};
      const rows = (t.alunos || [])
        .map(
          (a) =>
            `<tr><td>${escapeHtml(a.nome)}</td><td>${escapeHtml(a.cpf || "")}</td><td class="col-notas">${formatNotasHtml(a.notasDisciplinas)}</td><td class="col-total">${formatTotalHtml(a.notasDisciplinas)}</td><td class="col-freq">${formatFrequenciaHtml(a.faltasDisciplinas, aulas)}</td><td>${formatSituacaoHtml(a.notasDisciplinas, a.faltasDisciplinas, aulas)}</td></tr>`
        )
        .join("");

      const aulasInfo = Object.keys(aulas).length
        ? `<p class="meta">Aulas dadas: ${Object.entries(aulas)
            .map(([d, n]) => `${escapeHtml(d)} (${n})`)
            .join(", ")}</p>`
        : "";

      const profInfo = t.professorNome
        ? t.professorLogin
          ? `${escapeHtml(t.professorNome)} (login: <code class="login-cell">${escapeHtml(t.professorLogin)}</code>)`
          : escapeHtml(t.professorNome)
        : "Não vinculado";

      const discHtml = t.professorDisciplinas
        ? `<p class="meta">Disciplinas: ${renderDisciplinasHtml(t.professorDisciplinas)}</p>`
        : "";

      const btnExcluir = modoDiretor
        ? `<button type="button" class="btn-danger btn-sm" data-acao="excluir-turma" data-turma-id="${t.id}" data-turma-nome="${escapeHtml(t.nome)}">Excluir</button>`
        : "";

      return `
      <div class="turma-bloco" data-turma-id="${t.id}">
        <div class="turma-head">
          <h4>${escapeHtml(t.nome)}</h4>
          ${btnExcluir}
        </div>
        <p class="meta">Professor: ${profInfo}</p>
        ${discHtml}
        ${aulasInfo}
        ${rows ? `<table class="tabela-alunos"><thead><tr><th>Aluno</th><th>CPF</th><th>Notas</th><th>Total</th><th>% Faltas</th><th>Situação</th></tr></thead><tbody>${rows}</tbody></table>` : "<p class='meta'>Sem alunos</p>"}
      </div>`;
    })
    .join("");

}

function notaAlunoAtividade(aluno, atividadeId) {
  return (aluno?.notasDisciplinas || []).find((n) => n.atividadeId === atividadeId);
}

function obterTurmaContexto() {
  return (turmasProfessorCache || []).find((t) => t.id === professorContexto.turmaId) || turmasProfessorCache?.[0] || null;
}

function renderNavDisciplinas(disciplinas) {
  const nav = $("#pr-disc-nav");
  if (!nav) return;
  if (!disciplinas?.length) {
    nav.innerHTML = `<p class="meta">Sem disciplinas</p>`;
    return;
  }
  nav.innerHTML = disciplinas
    .map(
      (d) =>
        `<button type="button" class="prof-disc-btn${d === professorContexto.disciplina ? " active" : ""}" data-acao="selecionar-disciplina" data-disciplina="${escapeHtml(d)}">${escapeHtml(d)}</button>`
    )
    .join("");
}

function renderSelectContextoTurma(turmas) {
  const sel = $("#pr-contexto-turma");
  if (!sel) return;
  sel.innerHTML = (turmas || [])
    .map(
      (t) =>
        `<option value="${t.id}"${t.id === professorContexto.turmaId ? " selected" : ""}>${escapeHtml(t.nome)}</option>`
    )
    .join("");
}

function popularSelectFaltasAlunos(turma) {
  const sel = $("#pr-falta-aluno");
  if (!sel) return;
  const alunos = turma?.alunos || [];
  if (!alunos.length) {
    sel.innerHTML = "<option value=''>Sem alunos</option>";
    return;
  }
  sel.innerHTML = alunos
    .map((a) => `<option value="${a.registroId}">${escapeHtml(a.nome)}</option>`)
    .join("");
}

function renderResumoFrequencia(turma, disciplina) {
  const box = $("#prof-freq-resumo");
  if (!box || !turma) return;
  const aulas = turma.aulasDisciplinas?.[disciplina];
  const rows = (turma.alunos || [])
    .map((a) => {
      const calc = aulas
        ? calcularFrequenciaDisciplina(a.faltasDisciplinas?.[disciplina] || 0, aulas)
        : null;
      const freq = calc
        ? `<span class="${calc.reprovadoFalta ? "dash-warn" : "dash-ok"}">${calc.percentualFaltas}% faltas</span>`
        : "—";
      return `<tr><td>${escapeHtml(a.nome)}</td><td>${freq}</td><td>${formatSituacaoDisciplinaHtml(a.notasDisciplinas, a.faltasDisciplinas, turma.aulasDisciplinas || {}, disciplina)}</td></tr>`;
    })
    .join("");
  box.innerHTML = `
    <h3>Frequência — ${escapeHtml(disciplina)}</h3>
    <p class="meta">${aulas ? `${aulas} aulas dadas` : "Cadastre o total de aulas acima."}</p>
    <table class="tabela-alunos"><thead><tr><th>Aluno</th><th>% Faltas</th><th>Situação</th></tr></thead><tbody>${rows || "<tr><td colspan='3'>Sem alunos</td></tr>"}</tbody></table>`;
}

function renderGradebook(turma, disciplina) {
  const container = $("#prof-gradebook");
  if (!container) return;

  const atividades = atividadesDaDisciplina(turma?.atividades, disciplina);
  const alunos = turma?.alunos || [];

  if (!atividades.length) {
    container.innerHTML = `<p class="meta gradebook-vazio">Nenhuma atividade em <strong>${escapeHtml(disciplina)}</strong>. Use o campo acima para criar a primeira.</p>`;
    return;
  }

  const colHeads = atividades
    .map(
      (a) => `<th class="grade-col-head">
        <div class="grade-col-title">${escapeHtml(a.descricao)}</div>
        <div class="grade-col-meta">${a.valorAtividade} pts</div>
        <div class="grade-col-acoes">
          <button type="button" class="btn-icon btn-sm" data-acao="editar-atividade" data-atividade-id="${a.id}" title="Editar">✎</button>
          <button type="button" class="btn-icon btn-icon-danger btn-sm" data-acao="excluir-atividade" data-atividade-id="${a.id}" title="Excluir">✕</button>
        </div>
      </th>`
    )
    .join("");

  const rows = alunos
    .map((a) => {
      const cells = atividades
        .map((atv) => {
          const n = notaAlunoAtividade(a, atv.id);
          const val = n ? `value="${n.nota}"` : "";
          const notaId = n ? `data-nota-id="${n.id}"` : "";
          return `<td class="grade-cell">
            <input class="grade-input" type="number" step="0.1" min="0" max="${atv.valorAtividade}"
              data-registro-id="${a.registroId}" data-atividade-id="${atv.id}" ${notaId} ${val} placeholder="—" title="0 a ${atv.valorAtividade}" />
          </td>`;
        })
        .join("");
      return `<tr>
        <td class="grade-student sticky-col">${escapeHtml(a.nome)}</td>
        ${cells}
        <td class="grade-total sticky-total">${formatTotalHtml(notasDaDisciplina(a.notasDisciplinas, disciplina))}</td>
      </tr>`;
    })
    .join("");

  container.innerHTML = `
    <div class="gradebook-scroll">
      <table class="gradebook-table tabela-alunos">
        <thead>
          <tr>
            <th class="sticky-col grade-corner">Aluno</th>
            ${colHeads}
            <th class="sticky-total">Total</th>
          </tr>
        </thead>
        <tbody>${rows || "<tr><td colspan='99'>Sem alunos na turma</td></tr>"}</tbody>
      </table>
    </div>`;
}

function renderPainelProfessorCanvas() {
  const turmas = turmasProfessorCache || [];
  const disciplinas = disciplinasProfessorCache.length
    ? disciplinasProfessorCache
    : listaDisciplinas(turmas[0]?.professorDisciplinas);

  if (!professorContexto.turmaId && turmas[0]) professorContexto.turmaId = turmas[0].id;
  if (!professorContexto.disciplina && disciplinas[0]) professorContexto.disciplina = disciplinas[0];

  const turma = obterTurmaContexto();
  const disciplina = professorContexto.disciplina || disciplinas[0];

  renderSelectContextoTurma(turmas);
  renderNavDisciplinas(disciplinas);
  popularSelectFaltasAlunos(turma);

  const abaNotas = $("#prof-aba-notas");
  const abaFreq = $("#prof-aba-frequencia");
  if (abaNotas) abaNotas.hidden = professorContexto.aba !== "notas";
  if (abaFreq) abaFreq.hidden = professorContexto.aba !== "frequencia";

  document.querySelectorAll(".prof-tab").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.aba === professorContexto.aba);
  });

  if (turma && disciplina) {
    if (professorContexto.aba === "notas") renderGradebook(turma, disciplina);
    else renderResumoFrequencia(turma, disciplina);
  }
}

async function salvarNotaCelula(input) {
  const registroId = input.dataset.registroId;
  const atividadeId = input.dataset.atividadeId;
  const notaId = input.dataset.notaId || "";
  const valorStr = input.value.trim();
  const max = parseFloat(input.max) || 100;

  if (!valorStr) {
    if (notaId && confirm("Remover a nota deste aluno nesta atividade?")) {
      const r = await adminPost("/api/professor/notas", { acao: "excluir", notaId });
      if (!r.ok) throw new Error(r.mensagem || "Não foi possível remover.");
      toast(r.mensagem || "Nota removida.");
      await carregarTurmaProfessor(true);
    }
    return;
  }

  const nota = parseFloat(valorStr);
  if (Number.isNaN(nota) || nota < 0 || nota > max) {
    throw new Error(`Nota deve ser entre 0 e ${max}.`);
  }

  const r = notaId
    ? await adminPost("/api/professor/notas", { acao: "editar", notaId, nota })
    : await adminPost("/api/professor/notas", { acao: "lancar", registroId, atividadeId, nota });

  if (!r.ok) throw new Error(r.mensagem || "Não foi possível salvar a nota.");
  input.dataset.notaId = notaId || input.dataset.notaId;
  await carregarTurmaProfessor(true);
}

function labelPerfil(role) {
  return { diretor: "Diretor", professor: "Professor", aluno: "Aluno" }[role] || role;
}

async function listarTodosUsuarios() {
  const r = await adminGet("/api/admin/listar-usuarios");
  if (r.ok && r.usuarios) return r.usuarios;
  if (r.status === 401 || r.status === 403) throw new Error(r.mensagem || "Acesso negado.");

  const { data, error } = await supabaseClient
    .from("perfis")
    .select("id, nome, cpf, role, disciplina")
    .eq("escola_id", escolaId)
    .order("role")
    .order("nome");

  if (error) throw error;

  return (data || []).map((u) => ({
    id: u.id,
    nome: u.nome,
    login: null,
    cpf: u.cpf,
    role: u.role,
    disciplina: u.disciplina,
  }));
}

function renderUsuarios(container, usuarios) {
  usuariosLista = usuarios || [];
  if (!usuariosLista.length) {
    container.innerHTML = "<p>Nenhum usuário cadastrado.</p>";
    return;
  }

  const rows = usuariosLista
    .map((u) => {
      const podeExcluir = u.id !== userId;
      return `
      <tr data-user-id="${u.id}">
        <td><code class="login-cell">${escapeHtml(u.login || "—")}</code></td>
        <td>${escapeHtml(u.nome)}</td>
        <td>${escapeHtml(u.cpf || "—")}</td>
        <td><span class="badge-role badge-role-${escapeHtml(u.role)}">${escapeHtml(labelPerfil(u.role))}</span></td>
        <td>${u.role === "professor" ? renderDisciplinasHtml(u.disciplina) : "—"}</td>
        <td>${escapeHtml(infoExtraUsuario(u))}</td>
        <td class="col-acoes acoes-linha">
          <button type="button" class="btn-editar" data-acao="editar-usuario" data-user-id="${u.id}">Editar</button>
          ${podeExcluir ? `<button type="button" class="btn-danger" data-acao="excluir-usuario" data-user-id="${u.id}" data-user-nome="${escapeHtml(u.nome)}">Excluir</button>` : ""}
        </td>
      </tr>`;
    })
    .join("");

  container.innerHTML = `
    <table class="tabela-alunos tabela-usuarios">
      <thead>
        <tr><th>Login</th><th>Nome</th><th>CPF</th><th>Perfil</th><th>Disciplinas</th><th>Detalhes</th><th>Ações</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function abrirModalEditar(usuario) {
  $("#edit-user-id").value = usuario.id;
  $("#edit-user-role").value = usuario.role;
  $("#edit-nome").value = usuario.nome || "";
  $("#edit-cpf").value = usuario.cpf || "";
  $("#edit-matricula").value = usuario.matricula || "";
  $("#edit-responsavel").value = usuario.responsavelNome || "";
  $("#edit-responsavel-tel").value = usuario.responsavelTelefone || "";
  $("#edit-senha").value = "";
  $("#edit-disciplinas").value = (usuario.disciplinas || listaDisciplinas(usuario.disciplina)).join(", ");
  $("#edit-turma").value = usuario.turmaAluno || "";
  $("#edit-campo-disciplinas").hidden = usuario.role !== "professor";
  $("#edit-campo-turma").hidden = usuario.role !== "aluno";
  $("#edit-campo-matricula").hidden = usuario.role !== "aluno";
  $("#edit-campo-responsavel").hidden = usuario.role !== "aluno";
  $("#edit-campo-responsavel-tel").hidden = usuario.role !== "aluno";
  $("#modal-titulo").textContent = `Editar ${labelPerfil(usuario.role).toLowerCase()}`;
  $("#modal-editar-usuario").hidden = false;
}

function fecharModalEditar() {
  $("#modal-editar-usuario").hidden = true;
}

async function carregarUsuariosDiretor() {
  const container = $("#dir-lista-usuarios");
  if (!container) return;
  container.innerHTML = "<p class='meta'>Carregando usuários…</p>";
  try {
    invalidarCacheUsuarios();
    renderUsuarios(container, await listarTodosUsuarios());
  } catch (e) {
    container.innerHTML = `<p class="alert">${escapeHtml(e.message)}</p>`;
    toast(e.message);
  }
}

async function carregarTurmasDiretor() {
  try {
    invalidarCacheUsuarios();
    renderTurmas($("#dir-lista-turmas"), await listarTurmasCompletas(), false, true);
  } catch (e) {
    toast(e.message);
  }
}

async function executarAcaoDiretor(acao, e) {
  if (acao === "editar-usuario") {
    const u = usuariosLista.find((x) => x.id === e.target.dataset.userId);
    if (u) abrirModalEditar(u);
    return;
  }

  if (acao === "excluir-usuario") {
    const id = e.target.dataset.userId;
    const nome = e.target.dataset.userNome;
    if (!confirm(`Excluir o usuário "${nome}"? Esta ação não pode ser desfeita.`)) return;
    const r = await adminPost("/api/admin/excluir-usuario", { id });
    if (!r.ok) throw new Error(r.mensagem);
    invalidarCacheUsuarios();
    toast(r.mensagem);
    await carregarUsuariosDiretor();
    await carregarTurmasDiretor();
    return;
  }

  if (acao === "excluir-turma") {
    const turmaId = e.target.dataset.turmaId;
    const turmaNome = e.target.dataset.turmaNome;
    if (!confirm(`Excluir a turma "${turmaNome}"? Alunos serão desvinculados.`)) return;

    const r = await adminPost("/api/admin/excluir-turma", { id: turmaId });
    if (!r.ok) {
      const { data, error } = await supabaseClient
        .from("turmas")
        .delete()
        .eq("id", turmaId)
        .eq("escola_id", escolaId)
        .select("id");
      if (error) throw error;
      if (!data?.length) {
        throw new Error(
          "Sem permissão para excluir. Atualize o site na Vercel ou execute supabase/migracao-policies-delete.sql no Supabase."
        );
      }
      toast("Turma excluída!");
    } else {
      toast(r.mensagem);
    }

    invalidarCacheUsuarios();
    await carregarTurmasDiretor();
    return;
  }

  if (acao === "fechar-modal") {
    fecharModalEditar();
    return;
  }

  if (acao === "salvar-edicao") {
    const btn = e.target;
    const id = $("#edit-user-id").value;
    const role = $("#edit-user-role").value;
    const body = {
      id,
      nome: $("#edit-nome").value,
      cpf: $("#edit-cpf").value,
      matricula: $("#edit-matricula").value,
      responsavelNome: $("#edit-responsavel").value,
      responsavelTelefone: $("#edit-responsavel-tel").value,
    };
    if (role === "professor") body.disciplina = $("#edit-disciplinas").value;
    if (role === "aluno") body.turmaNome = $("#edit-turma").value;
    const senha = $("#edit-senha").value;
    if (senha) body.password = senha;

    btn.disabled = true;
    try {
      const r = await adminPost("/api/admin/editar-usuario", body);
      if (!r.ok) throw new Error(r.mensagem || "Não foi possível salvar.");
      invalidarCacheUsuarios();
      fecharModalEditar();
      toast(r.mensagem);
      await carregarUsuariosDiretor();
      await carregarTurmasDiretor();
    } finally {
      btn.disabled = false;
    }
    return;
  }

  if (acao === "cad-turma") {
    const { error } = await supabaseClient
      .from("turmas")
      .insert({ escola_id: escolaId, nome: $("#dir-turma-nome").value.trim() });
    if (error) throw error;
    toast("Turma cadastrada!");
  } else if (acao === "cad-aluno") {
    const r = await adminPost("/api/admin/criar-usuario", {
      email: $("#dir-al-email").value,
      password: $("#dir-al-pass").value,
      nome: $("#dir-al-nome").value,
      cpf: $("#dir-al-cpf").value,
      matricula: $("#dir-al-matricula").value,
      responsavelNome: $("#dir-al-responsavel").value,
      responsavelTelefone: $("#dir-al-responsavel-tel").value,
      role: "aluno",
      turmaNome: $("#dir-al-turma").value,
    });
    if (!r.ok) throw new Error(r.mensagem);
    invalidarCacheUsuarios();
    toast(r.mensagem);
  } else if (acao === "cad-prof") {
    const r = await adminPost("/api/admin/criar-usuario", {
      email: $("#dir-pr-email").value,
      password: $("#dir-pr-pass").value,
      nome: $("#dir-pr-nome").value,
      cpf: $("#dir-pr-cpf").value,
      role: "professor",
      disciplina: $("#dir-pr-disc").value,
    });
    if (!r.ok) throw new Error(r.mensagem);
    invalidarCacheUsuarios();
    toast(r.mensagem);
  } else if (acao === "vincular") {
    const profId = await buscarIdPorEmail($("#dir-vinc-prof").value);
    if (!profId) throw new Error("Professor não encontrado.");

    const { data: turma } = await supabaseClient
      .from("turmas")
      .select("id")
      .eq("escola_id", escolaId)
      .eq("nome", $("#dir-vinc-turma").value.trim())
      .maybeSingle();

    if (!turma) throw new Error("Turma não encontrada.");

    const { error } = await supabaseClient.from("turmas").update({ professor_id: profId }).eq("id", turma.id);
    if (error) throw error;
    invalidarCacheUsuarios();
    const usuarios = await obterUsuariosPorId();
    const prof = usuarios.get(profId);
    toast(`Professor vinculado! Login: ${prof?.login || $("#dir-vinc-prof").value.trim()}`);
  } else if (acao === "refresh-turmas") {
    await carregarTurmasDiretor();
    return;
  } else if (acao === "refresh-usuarios") {
    await carregarUsuariosDiretor();
    return;
  } else {
    return;
  }

  await carregarUsuariosDiretor();
  await carregarTurmasDiretor();
}

function aoClicarDiretor(e) {
  const acao = e.target.dataset?.acao;
  if (!acao) return;
  executarAcaoDiretor(acao, e).catch((err) => toast(err.message));
}

document.querySelector("#painel-diretor").addEventListener("click", aoClicarDiretor);
document.querySelector("#modal-editar-usuario").addEventListener("click", aoClicarDiretor);

async function carregarTurmaProfessor(preservar = false) {
  const ctxAnt = preservar ? { ...professorContexto } : null;
  const sem = $("#prof-sem-turma");
  const cont = $("#prof-conteudo");

  const r = await adminGet("/api/professor/minhas-turmas");
  let turmas = r.ok ? r.turmas : null;
  let disciplinasProfessor = r.ok ? r.disciplinas || [] : [];

  if (!r.ok && r.mensagem) {
    console.warn("minhas-turmas:", r.mensagem);
  }

  if (!turmas) {
    const { data: turmasDb, error } = await supabaseClient
      .from("turmas")
      .select("id, nome")
      .eq("professor_id", userId)
      .order("nome");

    if (error || !turmasDb?.length) {
      const { data: authData } = await supabaseClient.auth.getUser();
      const meuLogin = emailParaLogin(authData?.user?.email);
      sem.hidden = false;
      cont.hidden = true;
      sem.innerHTML = `
        <p><strong>Nenhuma turma vinculada ao login <code class="login-cell">${escapeHtml(meuLogin)}</code>.</strong></p>
        <p>Se o diretor já vinculou um professor com seu nome, confira no painel dele qual <strong>login</strong> foi usado e entre com essa conta.</p>`;
      return;
    }

    const todas = await listarTurmasCompletas();
    const ids = new Set(turmasDb.map((t) => t.id));
    turmas = todas.filter((t) => ids.has(t.id));

    const { data: meuPerfil } = await supabaseClient.from("perfis").select("disciplina").eq("id", userId).single();
    disciplinasProfessor = listaDisciplinas(meuPerfil?.disciplina);
  }

  if (!turmas?.length) {
    sem.hidden = false;
    cont.hidden = true;
    sem.textContent = "Nenhuma turma vinculada pelo diretor.";
    return;
  }

  sem.hidden = true;
  cont.hidden = false;

  turmasProfessorCache = turmas;
  disciplinasProfessorCache = disciplinasProfessor;

  const disc = disciplinasProfessor.length ? disciplinasProfessor : listaDisciplinas(turmas[0]?.professorDisciplinas);
  if (!preservar || !ctxAnt?.turmaId || !turmas.some((t) => t.id === ctxAnt.turmaId)) {
    professorContexto = { turmaId: turmas[0].id, disciplina: disc[0] || null, aba: "notas" };
  } else {
    professorContexto = {
      turmaId: ctxAnt.turmaId,
      disciplina: disc.includes(ctxAnt.disciplina) ? ctxAnt.disciplina : disc[0] || null,
      aba: ctxAnt.aba || "notas",
    };
  }

  renderPainelProfessorCanvas();
}

document.querySelector("#pr-contexto-turma")?.addEventListener("change", (e) => {
  professorContexto.turmaId = e.target.value;
  renderPainelProfessorCanvas();
});

document.querySelector("#prof-conteudo")?.addEventListener("change", async (e) => {
  if (!e.target.classList.contains("grade-input")) return;
  try {
    await salvarNotaCelula(e.target);
  } catch (err) {
    toast(err.message);
  }
});

function abrirModalEditarNota(nota) {
  $("#edit-nota-id").value = nota.id;
  $("#edit-nota-info-label").textContent = `${nota.disciplina} — ${nota.descricao || "Atividade"} (máx. ${nota.valorAtividade ?? 10} pts)`;
  $("#edit-nota-valor").value = nota.nota;
  const max = Number(nota.valorAtividade) || 10;
  $("#edit-nota-valor").max = max;
  $("#edit-nota-valor").placeholder = `Nota do aluno (0 a ${max})`;
  $("#modal-editar-nota").hidden = false;
}

function fecharModalEditarNota() {
  $("#modal-editar-nota").hidden = true;
}

function abrirModalEditarAtividade(atividade) {
  $("#edit-atividade-id").value = atividade.id;
  $("#edit-atividade-disciplina-label").textContent = atividade.disciplina;
  $("#edit-atividade-desc").value = atividade.descricao || "";
  $("#edit-atividade-valor").value = atividade.valorAtividade ?? 10;
  $("#modal-editar-atividade").hidden = false;
}

function fecharModalEditarAtividade() {
  $("#modal-editar-atividade").hidden = true;
}

async function salvarNotaEdicao() {
  const notaId = $("#edit-nota-id").value;
  const notaVal = $("#edit-nota-valor").value;
  if (!notaId) throw new Error("Nota inválida.");
  if (notaVal === "") throw new Error("Informe a nota do aluno.");
  const nota = parseFloat(notaVal);
  if (Number.isNaN(nota)) throw new Error("Nota inválida.");
  const r = await adminPost("/api/professor/notas", { acao: "editar", notaId, nota });
  if (!r.ok) throw new Error(r.mensagem || "Não foi possível salvar a nota.");
  toast(r.mensagem || "Nota atualizada!");
  fecharModalEditarNota();
  await carregarTurmaProfessor(true);
}

async function salvarAtividadeEdicao() {
  const atividadeId = $("#edit-atividade-id").value;
  const descricao = $("#edit-atividade-desc").value.trim();
  const valorAtvVal = $("#edit-atividade-valor").value;
  if (!atividadeId) throw new Error("Atividade inválida.");
  if (!descricao) throw new Error("Informe a descrição.");
  if (valorAtvVal === "") throw new Error("Informe o valor da atividade.");
  const valorAtividade = parseFloat(valorAtvVal);
  if (Number.isNaN(valorAtividade) || valorAtividade <= 0 || valorAtividade > 100) {
    throw new Error("Valor da atividade deve ser entre 1 e 100.");
  }
  const r = await adminPost("/api/professor/notas", {
    acao: "editar-atividade",
    atividadeId,
    descricao,
    valorAtividade,
  });
  if (!r.ok) throw new Error(r.mensagem || "Não foi possível salvar a atividade.");
  toast(r.mensagem || "Atividade atualizada!");
  fecharModalEditarAtividade();
  await carregarTurmaProfessor(true);
}

document.querySelector("#modal-editar-nota")?.addEventListener("click", async (e) => {
  const acao = e.target.dataset?.acao;
  if (!acao) return;
  try {
    if (acao === "fechar-modal-nota") fecharModalEditarNota();
    else if (acao === "salvar-nota-edicao") await salvarNotaEdicao();
  } catch (err) {
    toast(err.message);
  }
});

document.querySelector("#modal-editar-atividade")?.addEventListener("click", async (e) => {
  const acao = e.target.dataset?.acao;
  if (!acao) return;
  try {
    if (acao === "fechar-modal-atividade") fecharModalEditarAtividade();
    else if (acao === "salvar-atividade-edicao") await salvarAtividadeEdicao();
  } catch (err) {
    toast(err.message);
  }
});

document.querySelector("#painel-professor").addEventListener("click", async (e) => {
  if (e.target.classList.contains("prof-tab")) {
    professorContexto.aba = e.target.dataset.aba;
    renderPainelProfessorCanvas();
    return;
  }

  const acao = e.target.dataset?.acao;
  if (!acao) return;

  try {
    if (acao === "selecionar-disciplina") {
      professorContexto.disciplina = e.target.dataset.disciplina;
      renderPainelProfessorCanvas();
      return;
    }

    if (acao === "fechar-modal-nota") {
      fecharModalEditarNota();
      return;
    }

    if (acao === "editar-atividade") {
      const atividade = encontrarAtividadePorId(e.target.dataset.atividadeId);
      if (!atividade) throw new Error("Atividade não encontrada.");
      abrirModalEditarAtividade(atividade);
      return;
    }

    if (acao === "excluir-atividade") {
      const atividade = encontrarAtividadePorId(e.target.dataset.atividadeId);
      if (!atividade) throw new Error("Atividade não encontrada.");
      if (!confirm(`Excluir a atividade "${atividade.descricao}" da turma? Todas as notas dos alunos serão removidas.`)) return;
      const r = await adminPost("/api/professor/notas", { acao: "excluir-atividade", atividadeId: atividade.id });
      if (!r.ok) throw new Error(r.mensagem || "Não foi possível excluir a atividade.");
      toast(r.mensagem || "Atividade excluída!");
      await carregarTurmaProfessor(true);
      return;
    }

    if (acao === "salvar-nota-edicao") {
      await salvarNotaEdicao();
      return;
    }

    if (acao === "criar-atividade") {
      const turmaId = professorContexto.turmaId;
      const disciplina = professorContexto.disciplina;
      const descricao = $("#pr-grade-desc").value.trim();
      const valorAtvVal = $("#pr-grade-valor").value;
      if (!turmaId) throw new Error("Selecione a turma.");
      if (!disciplina) throw new Error("Selecione a disciplina.");
      if (!descricao) throw new Error("Informe a descrição da atividade.");
      if (valorAtvVal === "") throw new Error("Informe o valor da atividade.");
      const valorAtividade = parseFloat(valorAtvVal);
      if (Number.isNaN(valorAtividade) || valorAtividade <= 0 || valorAtividade > 100) {
        throw new Error("Valor da atividade deve ser entre 1 e 100.");
      }
      const r = await adminPost("/api/professor/notas", {
        acao: "criar-atividade",
        turmaId,
        disciplina,
        descricao,
        valorAtividade,
      });
      if (!r.ok) throw new Error(r.mensagem || "Não foi possível criar a atividade.");
      toast(r.mensagem || "Atividade criada!");
      $("#pr-grade-desc").value = "";
      await carregarTurmaProfessor(true);
      return;
    }

    if (acao === "definir-aulas") {
      const turmaId = professorContexto.turmaId;
      const disciplina = professorContexto.disciplina;
      const totalAulas = $("#pr-aulas-total").value;
      if (!turmaId) throw new Error("Selecione a turma.");
      if (!disciplina) throw new Error("Selecione a disciplina.");
      if (totalAulas === "") throw new Error("Informe o total de aulas dadas.");
      const r = await adminPost("/api/professor/definir-aulas", { turmaId, disciplina, totalAulas });
      if (!r.ok) throw new Error(r.mensagem || "Não foi possível salvar.");
      toast(r.mensagem || "Aulas cadastradas!");
      $("#pr-aulas-total").value = "";
      await carregarTurmaProfessor(true);
      return;
    }

    if (acao === "lancar-falta" || acao === "remover-falta") {
      const registroId = $("#pr-falta-aluno").value;
      const disciplina = professorContexto.disciplina;
      if (!registroId) throw new Error("Selecione um aluno.");
      if (!disciplina) throw new Error("Selecione a disciplina.");
      const r = await adminPost("/api/professor/lancar-falta", {
        registroId,
        disciplina,
        remover: acao === "remover-falta",
      });
      if (!r.ok) throw new Error(r.mensagem || "Não foi possível atualizar as faltas.");
      toast(r.mensagem || (acao === "remover-falta" ? "Falta removida!" : "Falta registrada!"));
      await carregarTurmaProfessor(true);
    }
  } catch (err) {
    toast(err.message);
  }
});

async function carregarDadosAluno() {
  const container = $("#aluno-dashboard");
  let reg = null;
  let error = null;

  const comNotas = await supabaseClient
    .from("registros_alunos")
    .select(
      "turma_id, faltas, matricula, responsavel_nome, responsavel_telefone, turma:turmas(nome), notas_disciplinas(disciplina, valor_atividade, nota, descricao), faltas_disciplinas(disciplina, faltas)"
    )
    .eq("perfil_id", userId)
    .maybeSingle();

  if (comNotas.error) {
    const msg = comNotas.error.message || "";
    const semFaltas = msg.includes("faltas_disciplinas");
    const semNotas = msg.includes("notas_disciplinas") || msg.includes("relationship");
    if (semFaltas) {
      const r2 = await supabaseClient
        .from("registros_alunos")
        .select("turma_id, faltas, turma:turmas(nome), notas_disciplinas(disciplina, valor_atividade, nota, descricao)")
        .eq("perfil_id", userId)
        .maybeSingle();
      reg = r2.data;
      error = r2.error;
    } else if (semNotas) {
      const r2 = await supabaseClient
        .from("registros_alunos")
        .select("turma_id, faltas, turma:turmas(nome)")
        .eq("perfil_id", userId)
        .maybeSingle();
      reg = r2.data;
      error = r2.error;
    } else {
      error = comNotas.error;
    }
  } else {
    reg = comNotas.data;
  }

  if (error || !reg) {
    container.innerHTML = `<p class="alert">Registro acadêmico não encontrado.</p>`;
    return;
  }

  const { data: perfil } = await supabaseClient
    .from("perfis")
    .select("nome, cpf")
    .eq("id", userId)
    .single();

  const { data: authUser } = await supabaseClient.auth.getUser();
  const loginAluno = authUser?.user?.email?.split("@")[0] || "—";

  const notas = (reg.notas_disciplinas || []).map((n) => ({
    disciplina: n.disciplina,
    valorAtividade: n.valor_atividade,
    nota: n.nota,
    descricao: n.descricao,
  }));

  const faltasDisciplinas = mapFaltasLista(reg.faltas_disciplinas);
  const aulasDisciplinas = reg.turma_id ? await buscarAulasTurma(reg.turma_id) : {};
  const resultado = calcularSituacaoCompleta(notas, faltasDisciplinas, aulasDisciplinas);

  container.innerHTML = renderDashboardAluno(perfil, reg, notas, faltasDisciplinas, aulasDisciplinas, resultado, loginAluno);
}

function renderBarraDash(percentual, clsExtra = "") {
  const pct = percentual ?? 0;
  const width = Math.min(100, Math.max(0, pct));
  return `<div class="dash-bar ${clsExtra}"><div class="dash-fill" style="width:${width}%"></div></div>`;
}

function formatNotasDisciplinaHtml(notas, disciplina) {
  const lista = notasDaDisciplina(notas, disciplina);
  if (!lista.length) return `<p class="meta dash-vazio">Nenhuma atividade lançada.</p>`;
  return `<div class="notas-aluno dash-notas-lista">${lista
    .map((n) => {
      const max = n.valorAtividade ?? 100;
      const desc = n.descricao ? ` — ${escapeHtml(n.descricao)}` : "";
      return `<div class="nota-item">${n.nota} / ${max}${desc}</div>`;
    })
    .join("")}</div>`;
}

function disciplinasDoAluno(notas, faltasDisciplinas, aulasDisciplinas) {
  const set = new Set();
  for (const n of notas || []) set.add(n.disciplina);
  for (const d of Object.keys(aulasDisciplinas || {})) set.add(d);
  for (const d of Object.keys(faltasDisciplinas || {})) set.add(d);
  return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function renderBlocoDisciplinaAluno(disc, notas, faltasDisciplinas, aulasDisciplinas) {
  const notasDisc = notasDaDisciplina(notas, disc);
  const notaRes = calcularResultadoFinal(notasDisc);
  const situacao = calcularSituacaoDisciplina(notas, faltasDisciplinas, aulasDisciplinas, disc);
  const situacaoCls = situacao.situacaoFinal?.startsWith("Aprovado") ? "badge-aprovado" : "badge-reprovado";
  const okNota = notaRes.percentual !== null && notaRes.percentual >= 60;

  const totalAulas = aulasDisciplinas?.[disc];
  let faltasHtml = `<p class="meta dash-vazio">Aulas não cadastradas.</p>`;
  if (totalAulas) {
    const calc = calcularFrequenciaDisciplina(faltasDisciplinas?.[disc] || 0, totalAulas);
    if (calc) {
      const okFalta = !calc.reprovadoFalta;
      faltasHtml = `
        <div class="aluno-disc-metric">
          <div class="dash-disc-head">
            <span class="dash-label">Faltas</span>
            <span class="${okFalta ? "dash-ok" : "dash-warn"}">${calc.percentualFaltas}%</span>
          </div>
          ${renderBarraDash(calc.percentualFaltas, okFalta ? "dash-bar-faltas-ok" : "dash-bar-faltas-warn")}
          <span class="meta">${calc.faltas} de ${calc.totalAulas} aulas · máx. 25% (${calc.limiteFaltas} faltas)</span>
        </div>`;
    }
  }

  const notasHtml =
    notaRes.percentual !== null
      ? `
        <div class="aluno-disc-metric">
          <div class="dash-disc-head">
            <span class="dash-label">Média</span>
            <span class="${okNota ? "dash-ok" : "dash-warn"}">${notaRes.percentual}%</span>
          </div>
          ${renderBarraDash(notaRes.percentual, okNota ? "dash-bar-ok" : "dash-bar-warn")}
          <span class="meta">${notaRes.pontos} / ${notaRes.pontosMax} pontos</span>
        </div>`
      : `<p class="meta dash-vazio">Sem notas nesta matéria.</p>`;

  return `
    <article class="card aluno-disc-card">
      <div class="aluno-disc-head">
        <h4>${escapeHtml(disc)}</h4>
        ${
          situacao.situacaoFinal
            ? `<span class="badge-situacao ${situacaoCls}">${situacao.situacaoFinal}</span>`
            : `<span class="meta">—</span>`
        }
      </div>
      <div class="aluno-disc-metrics">${notasHtml}${faltasHtml}</div>
      <div class="aluno-disc-atividades">
        <p class="dash-label">Atividades</p>
        ${formatNotasDisciplinaHtml(notas, disc)}
      </div>
    </article>`;
}

function renderDashboardAluno(perfil, reg, notas, faltasDisciplinas, aulasDisciplinas, resultado, loginAluno) {
  const situacaoCls = resultado.situacaoFinal?.startsWith("Aprovado") ? "badge-aprovado" : "badge-reprovado";
  const disciplinas = disciplinasDoAluno(notas, faltasDisciplinas, aulasDisciplinas);

  const blocosDisc = disciplinas.length
    ? disciplinas
        .map((disc) => renderBlocoDisciplinaAluno(disc, notas, faltasDisciplinas, aulasDisciplinas))
        .join("")
    : `<p class="meta dash-vazio">Nenhuma matéria cadastrada ainda.</p>`;

  return `
    <div class="aluno-dashboard-grid">
      <article class="card aluno-info-card">
        <h3>Perfil</h3>
        <dl class="aluno-dl">
          <div><dt>Instituição</dt><dd>Colégio Jardim das Acácias</dd></div>
          <div><dt>Nome</dt><dd>${escapeHtml(perfil?.nome)}</dd></div>
          <div><dt>Usuário</dt><dd>${escapeHtml(loginAluno)}</dd></div>
          <div><dt>Matrícula</dt><dd>${escapeHtml(reg.matricula || "—")}</dd></div>
          <div><dt>CPF</dt><dd>${escapeHtml(perfil?.cpf || "—")}</dd></div>
          <div><dt>Turma</dt><dd>${escapeHtml(reg.turma?.nome || "—")}</dd></div>
          <div><dt>Responsável</dt><dd>${escapeHtml(reg.responsavel_nome || "—")}${reg.responsavel_telefone ? ` (${escapeHtml(reg.responsavel_telefone)})` : ""}</dd></div>
        </dl>
      </article>

      <article class="card dash-stat">
        <p class="dash-label">Média geral</p>
        <p class="dash-value">${resultado.percentual !== null ? `${resultado.percentual}%` : "—"}</p>
        ${resultado.percentual !== null ? renderBarraDash(resultado.percentual, resultado.percentual >= 60 ? "dash-bar-ok" : "dash-bar-warn") : ""}
        <p class="meta dash-meta">${resultado.percentual !== null ? `${resultado.pontos} / ${resultado.pontosMax} pontos` : "Sem notas"}</p>
      </article>

      <article class="card dash-stat">
        <p class="dash-label">Situação final</p>
        <p class="dash-situacao">${
          resultado.situacaoFinal
            ? `<span class="badge-situacao ${situacaoCls}">${resultado.situacaoFinal}</span>`
            : "—"
        }</p>
        <p class="meta dash-meta">Mín. 60% nas notas e máx. 25% de faltas por disciplina.</p>
      </article>

      <section class="card dash-panel-wide aluno-materias-section">
        <h3>Boletim</h3>
        <div class="aluno-disciplinas-grid">${blocosDisc}</div>
      </section>
    </div>`;
}

initSupabase()
  .then(verificarSessao)
  .catch((e) => {
    const erro = $("#login-erro");
    erro.textContent = e.message;
    erro.hidden = false;
  });
