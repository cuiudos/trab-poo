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
  return res.json();
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

async function listarTurmasCompletas() {
  const usuarios = perfilAtual === "diretor" ? await obterUsuariosPorId() : new Map();
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

    const { data: registros } = await supabaseClient
      .from("registros_alunos")
      .select("id, nota, faltas, perfil_id")
      .eq("turma_id", t.id);

    const alunos = [];
    for (const r of registros || []) {
      const { data: p } = await supabaseClient
        .from("perfis")
        .select("nome, cpf")
        .eq("id", r.perfil_id)
        .single();
      alunos.push({
        registroId: r.id,
        perfilId: r.perfil_id,
        nome: p?.nome,
        cpf: p?.cpf,
        nota: r.nota,
        faltas: r.faltas,
      });
    }

    resultado.push({
      id: t.id,
      nome: t.nome,
      professorId: t.professor_id,
      professorNome,
      professorLogin: t.professor_id ? usuarios.get(t.professor_id)?.login : null,
      alunos,
    });
  }

  return resultado;
}

function renderTurmas(container, turmas, comSelect = false) {
  if (!turmas?.length) {
    container.innerHTML = "<p>Nenhuma turma cadastrada.</p>";
    return;
  }

  container.innerHTML = turmas
    .map((t) => {
      const rows = (t.alunos || [])
        .map(
          (a) =>
            `<tr><td>${escapeHtml(a.nome)}</td><td>${escapeHtml(a.cpf || "")}</td><td>${a.nota}</td><td>${a.faltas}</td></tr>`
        )
        .join("");

      const profInfo = t.professorNome
        ? t.professorLogin
          ? `${escapeHtml(t.professorNome)} (login: <code class="login-cell">${escapeHtml(t.professorLogin)}</code>)`
          : escapeHtml(t.professorNome)
        : "Não vinculado";

      return `
      <div class="turma-bloco" data-turma-id="${t.id}">
        <h4>${escapeHtml(t.nome)}</h4>
        <p class="meta">Professor: ${profInfo}</p>
        ${rows ? `<table class="tabela-alunos"><thead><tr><th>Aluno</th><th>CPF</th><th>Nota</th><th>Faltas</th></tr></thead><tbody>${rows}</tbody></table>` : "<p class='meta'>Sem alunos</p>"}
      </div>`;
    })
    .join("");

  if (comSelect) {
    const alunos = turmas.flatMap((t) => t.alunos || []);
    if (alunos.length) {
      const opts = alunos
        .map((a) => `<option value="${a.registroId}">${escapeHtml(a.nome)}</option>`)
        .join("");
      $("#pr-nota-aluno").innerHTML = opts;
      $("#pr-falta-aluno").innerHTML = opts;
    }
  }
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
  if (!usuarios?.length) {
    container.innerHTML = "<p>Nenhum usuário cadastrado.</p>";
    return;
  }

  const rows = usuarios
    .map(
      (u) => `
      <tr>
        <td><code class="login-cell">${escapeHtml(u.login || "—")}</code></td>
        <td>${escapeHtml(u.nome)}</td>
        <td><span class="badge-role badge-role-${escapeHtml(u.role)}">${escapeHtml(labelPerfil(u.role))}</span></td>
      </tr>`
    )
    .join("");

  container.innerHTML = `
    <table class="tabela-alunos tabela-usuarios">
      <thead>
        <tr><th>Login</th><th>Nome</th><th>Perfil</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

async function carregarUsuariosDiretor() {
  const container = $("#dir-lista-usuarios");
  if (!container) return;
  container.innerHTML = "<p class='meta'>Carregando usuários…</p>";
  try {
    renderUsuarios(container, await listarTodosUsuarios());
  } catch (e) {
    container.innerHTML = `<p class="alert">${escapeHtml(e.message)}</p>`;
    toast(e.message);
  }
}

async function carregarTurmasDiretor() {
  try {
    renderTurmas($("#dir-lista-turmas"), await listarTurmasCompletas());
  } catch (e) {
    toast(e.message);
  }
}

document.querySelector("#painel-diretor").addEventListener("click", async (e) => {
  const acao = e.target.dataset?.acao;
  if (!acao) return;

  try {
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
    } else if (acao === "edit-nf") {
      const alunoId = await buscarIdPorEmail($("#dir-nf-email").value);
      if (!alunoId) throw new Error("Aluno não encontrado.");

      const upd = {};
      if ($("#dir-nf-nota").value !== "") upd.nota = parseFloat($("#dir-nf-nota").value);
      if ($("#dir-nf-faltas").value !== "") upd.faltas = parseInt($("#dir-nf-faltas").value, 10);

      const { error } = await supabaseClient.from("registros_alunos").update(upd).eq("perfil_id", alunoId);
      if (error) throw error;
      toast("Dados atualizados!");
    } else if (acao === "refresh-turmas") {
      await carregarTurmasDiretor();
      return;
    } else if (acao === "refresh-usuarios") {
      await carregarUsuariosDiretor();
      return;
    }
    await carregarUsuariosDiretor();
    await carregarTurmasDiretor();
  } catch (err) {
    toast(err.message);
  }
});

async function carregarTurmaProfessor() {
  const sem = $("#prof-sem-turma");
  const cont = $("#prof-conteudo");

  const { data: turmas, error } = await supabaseClient
    .from("turmas")
    .select("id, nome")
    .eq("professor_id", userId)
    .order("nome");

  if (error || !turmas?.length) {
    const { data: authData } = await supabaseClient.auth.getUser();
    const meuLogin = emailParaLogin(authData?.user?.email);
    sem.hidden = false;
    cont.hidden = true;
    sem.innerHTML = `
      <p><strong>Nenhuma turma vinculada ao login <code class="login-cell">${escapeHtml(meuLogin)}</code>.</strong></p>
      <p>Se o diretor já vinculou um professor com seu nome, confira no painel dele qual <strong>login</strong> foi usado e entre com essa conta.</p>`;
    return;
  }

  sem.hidden = true;
  cont.hidden = false;
  $("#prof-turma-titulo").textContent =
    turmas.length === 1 ? `Turma: ${turmas[0].nome}` : `Minhas turmas (${turmas.length})`;

  const todas = await listarTurmasCompletas();
  const ids = new Set(turmas.map((t) => t.id));
  renderTurmas($("#prof-lista-alunos"), todas.filter((t) => ids.has(t.id)), true);
}

document.querySelector("#painel-professor").addEventListener("click", async (e) => {
  const acao = e.target.dataset?.acao;
  if (!acao) return;

  try {
    const registroId = acao === "lancar-nota" ? $("#pr-nota-aluno").value : $("#pr-falta-aluno").value;

    if (acao === "lancar-nota") {
      const { error } = await supabaseClient
        .from("registros_alunos")
        .update({ nota: parseFloat($("#pr-nota-valor").value) })
        .eq("id", registroId);
      if (error) throw error;
      toast("Nota lançada!");
    } else if (acao === "lancar-falta") {
      const { data: reg } = await supabaseClient
        .from("registros_alunos")
        .select("faltas")
        .eq("id", registroId)
        .single();
      const { error } = await supabaseClient
        .from("registros_alunos")
        .update({ faltas: (reg?.faltas || 0) + 1 })
        .eq("id", registroId);
      if (error) throw error;
      toast("Falta registrada!");
    }
    await carregarTurmaProfessor();
  } catch (err) {
    toast(err.message);
  }
});

async function carregarDadosAluno() {
  const card = $("#aluno-card");
  const { data: reg, error } = await supabaseClient
    .from("registros_alunos")
    .select("nota, faltas, turma:turmas(nome)")
    .eq("perfil_id", userId)
    .maybeSingle();

  if (error || !reg) {
    card.innerHTML = `<p class="alert">Registro acadêmico não encontrado.</p>`;
    return;
  }

  const { data: perfil } = await supabaseClient.from("perfis").select("nome, cpf").eq("id", userId).single();

  card.innerHTML = `
    <p><strong>Escola:</strong> Colégio Jardim das Acácias</p>
    <p><strong>Nome:</strong> ${escapeHtml(perfil?.nome)}</p>
    <p><strong>CPF:</strong> ${escapeHtml(perfil?.cpf || "")}</p>
    <p><strong>Turma:</strong> ${escapeHtml(reg.turma?.nome || "")}</p>
    <p><strong>Nota:</strong> ${reg.nota}</p>
    <p><strong>Faltas:</strong> ${reg.faltas}</p>
  `;
}

initSupabase()
  .then(verificarSessao)
  .catch((e) => {
    const erro = $("#login-erro");
    erro.textContent = e.message;
    erro.hidden = false;
  });
