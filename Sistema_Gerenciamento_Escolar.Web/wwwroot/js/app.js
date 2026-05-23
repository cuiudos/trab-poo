import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.1/+esm";

let supabase = null;
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

async function initSupabase() {
  const res = await fetch("/api/env");
  const env = await res.json();
  if (!env.ok) throw new Error(env.mensagem || "Configure Supabase na Vercel.");
  supabase = createClient(env.url, env.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
}

async function buscarIdPorEmail(email) {
  const r = await adminPost("/api/admin/buscar-email", { email: email.trim().toLowerCase() });
  if (!r.ok) return null;
  return r.id;
}

/* —— Login —— */
document.querySelectorAll(".role-tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".role-tab").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    perfilAtual = btn.dataset.tipo;
  });
});

$("#form-login").addEventListener("submit", async (e) => {
  e.preventDefault();
  const erro = $("#login-erro");
  const btn = $("#btn-login");
  erro.hidden = true;
  btn.disabled = true;
  btn.textContent = "Entrando…";

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: $("#email").value.trim().toLowerCase(),
      password: $("#senha").value,
    });

    if (error) {
      erro.textContent =
        error.message === "Invalid login credentials"
          ? "E-mail ou senha incorretos."
          : error.message;
      erro.hidden = false;
      return;
    }

    sessaoAtual = data.session;
    userId = data.user.id;

    const { data: perfil, error: perfilErr } = await supabase
      .from("perfis")
      .select("nome, role, escola_id")
      .eq("id", userId)
      .single();

    if (perfilErr || !perfil) {
      await supabase.auth.signOut();
      erro.textContent = "Perfil não cadastrado. Execute scripts/setup-supabase.mjs";
      erro.hidden = false;
      return;
    }

    if (perfil.role !== perfilAtual) {
      await supabase.auth.signOut();
      erro.textContent = `Selecione a aba "${perfil.role}" para este e-mail.`;
      erro.hidden = false;
      return;
    }

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
  await supabase.auth.signOut();
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
  const { data } = await supabase.auth.getSession();
  if (!data.session) return;

  sessaoAtual = data.session;
  userId = data.session.user.id;

  const { data: perfil } = await supabase
    .from("perfis")
    .select("nome, role, escola_id")
    .eq("id", userId)
    .single();

  if (perfil) {
    escolaId = perfil.escola_id;
    perfilAtual = perfil.role;
    mostrarApp({ nome: perfil.nome, perfil: perfil.role });
  }
}

async function listarTurmasCompletas() {
  const { data: turmas, error: turmaErr } = await supabase
    .from("turmas")
    .select("id, nome, professor_id")
    .eq("escola_id", escolaId)
    .order("nome");

  if (turmaErr) throw turmaErr;

  const resultado = [];

  for (const t of turmas || []) {
    let professorNome = null;
    if (t.professor_id) {
      const { data: prof } = await supabase
        .from("perfis")
        .select("nome")
        .eq("id", t.professor_id)
        .maybeSingle();
      professorNome = prof?.nome;
    }

    const { data: registros } = await supabase
      .from("registros_alunos")
      .select("id, nota, faltas, perfil_id")
      .eq("turma_id", t.id);

    const alunos = [];
    for (const r of registros || []) {
      const { data: p } = await supabase
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

    resultado.push({ id: t.id, nome: t.nome, professorNome, alunos });
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

      return `
      <div class="turma-bloco" data-turma-id="${t.id}">
        <h4>${escapeHtml(t.nome)}</h4>
        <p class="meta">Professor: ${escapeHtml(t.professorNome || "Não vinculado")}</p>
        ${rows ? `<table class="tabela-alunos"><thead><tr><th>Aluno</th><th>CPF</th><th>Nota</th><th>Faltas</th></tr></thead><tbody>${rows}</tbody></table>` : "<p class='meta'>Sem alunos</p>"}
      </div>`;
    })
    .join("");

  if (comSelect && turmas[0]?.alunos?.length) {
    const opts = turmas[0].alunos
      .map((a) => `<option value="${a.registroId}">${escapeHtml(a.nome)}</option>`)
      .join("");
    $("#pr-nota-aluno").innerHTML = opts;
    $("#pr-falta-aluno").innerHTML = opts;
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
      const { error } = await supabase
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
      toast(r.mensagem);
    } else if (acao === "vincular") {
      const profId = await buscarIdPorEmail($("#dir-vinc-prof").value);
      if (!profId) throw new Error("Professor não encontrado.");

      const { data: turma } = await supabase
        .from("turmas")
        .select("id")
        .eq("escola_id", escolaId)
        .eq("nome", $("#dir-vinc-turma").value.trim())
        .maybeSingle();

      if (!turma) throw new Error("Turma não encontrada.");

      const { error } = await supabase.from("turmas").update({ professor_id: profId }).eq("id", turma.id);
      if (error) throw error;
      toast("Professor vinculado!");
    } else if (acao === "edit-nf") {
      const alunoId = await buscarIdPorEmail($("#dir-nf-email").value);
      if (!alunoId) throw new Error("Aluno não encontrado.");

      const upd = {};
      if ($("#dir-nf-nota").value !== "") upd.nota = parseFloat($("#dir-nf-nota").value);
      if ($("#dir-nf-faltas").value !== "") upd.faltas = parseInt($("#dir-nf-faltas").value, 10);

      const { error } = await supabase.from("registros_alunos").update(upd).eq("perfil_id", alunoId);
      if (error) throw error;
      toast("Dados atualizados!");
    } else if (acao === "refresh-turmas") {
      await carregarTurmasDiretor();
      return;
    }
    await carregarTurmasDiretor();
  } catch (err) {
    toast(err.message);
  }
});

async function carregarTurmaProfessor() {
  const sem = $("#prof-sem-turma");
  const cont = $("#prof-conteudo");

  const { data: turma, error } = await supabase
    .from("turmas")
    .select("id, nome")
    .eq("professor_id", userId)
    .maybeSingle();

  if (error || !turma) {
    sem.hidden = false;
    cont.hidden = true;
    sem.textContent = "Você ainda não possui turma vinculada pelo diretor.";
    return;
  }

  sem.hidden = true;
  cont.hidden = false;
  $("#prof-turma-titulo").textContent = `Turma: ${turma.nome}`;

  const turmas = await listarTurmasCompletas();
  const minha = turmas.filter((t) => t.id === turma.id);
  renderTurmas($("#prof-lista-alunos"), minha, true);
}

document.querySelector("#painel-professor").addEventListener("click", async (e) => {
  const acao = e.target.dataset?.acao;
  if (!acao) return;

  try {
    const registroId = acao === "lancar-nota" ? $("#pr-nota-aluno").value : $("#pr-falta-aluno").value;

    if (acao === "lancar-nota") {
      const { error } = await supabase
        .from("registros_alunos")
        .update({ nota: parseFloat($("#pr-nota-valor").value) })
        .eq("id", registroId);
      if (error) throw error;
      toast("Nota lançada!");
    } else if (acao === "lancar-falta") {
      const { data: reg } = await supabase
        .from("registros_alunos")
        .select("faltas")
        .eq("id", registroId)
        .single();
      const { error } = await supabase
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
  const { data: reg, error } = await supabase
    .from("registros_alunos")
    .select("nota, faltas, turma:turmas(nome)")
    .eq("perfil_id", userId)
    .maybeSingle();

  if (error || !reg) {
    card.innerHTML = `<p class="alert">Registro acadêmico não encontrado.</p>`;
    return;
  }

  const { data: perfil } = await supabase.from("perfis").select("nome, cpf").eq("id", userId).single();

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
