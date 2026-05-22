const API = "";
let perfilAtual = "diretor";

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

async function api(url, opts = {}) {
  const res = await fetch(API + url, {
    ...opts,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...opts.headers },
  });
  return res.json();
}

function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.hidden = false;
  setTimeout(() => (el.hidden = true), 3200);
}

/* —— Login —— */
$$(".role-tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    $$(".role-tab").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    perfilAtual = btn.dataset.tipo;
  });
});

$("#form-login").addEventListener("submit", async (e) => {
  e.preventDefault();
  const erro = $("#login-erro");
  erro.hidden = true;

  const data = await api("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      tipo: perfilAtual,
      usuario: $("#usuario").value.trim(),
      senha: $("#senha").value,
    }),
  });

  if (!data.ok) {
    erro.textContent = data.mensagem;
    erro.hidden = false;
    return;
  }

  mostrarApp(data);
});

$("#btn-sair").addEventListener("click", async () => {
  await api("/api/auth/logout", { method: "POST" });
  $("#app").hidden = true;
  $("#tela-login").hidden = false;
});

function mostrarApp(sessao) {
  $("#tela-login").hidden = true;
  $("#app").hidden = false;
  $("#user-nome").textContent = sessao.nome;
  $("#user-perfil").textContent = sessao.perfil;

  $$(".painel").forEach((p) => (p.hidden = true));

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
  const me = await api("/api/auth/me");
  if (me.autenticado) mostrarApp(me);
}

/* —— Diretor —— */
function renderTurmas(container, turmas) {
  if (!turmas?.length) {
    container.innerHTML = "<p>Nenhuma turma cadastrada.</p>";
    return;
  }

  container.innerHTML = turmas
    .map(
      (t) => `
    <div class="turma-bloco">
      <h4>${escapeHtml(t.nome)}</h4>
      <p class="meta">Professor: ${escapeHtml(t.professorNome || "Não vinculado")}</p>
      ${
        t.alunos?.length
          ? `<table class="tabela-alunos">
        <thead><tr><th>Aluno</th><th>CPF</th><th>Nota</th><th>Faltas</th></tr></thead>
        <tbody>${t.alunos
          .map(
            (a) =>
              `<tr><td>${escapeHtml(a.nome)}</td><td>${escapeHtml(a.cpf)}</td><td>${a.nota}</td><td>${a.faltas}</td></tr>`
          )
          .join("")}</tbody></table>`
          : "<p class='meta'>Sem alunos</p>"
      }
    </div>`
    )
    .join("");
}

async function carregarTurmasDiretor() {
  const data = await api("/api/diretor/turmas");
  if (data.ok) renderTurmas($("#dir-lista-turmas"), data.turmas);
}

$("#painel-diretor").addEventListener("click", async (e) => {
  const acao = e.target.dataset?.acao;
  if (!acao) return;

  let data;

  switch (acao) {
    case "cad-turma":
      data = await api("/api/diretor/turmas", {
        method: "POST",
        body: JSON.stringify({ nome: $("#dir-turma-nome").value }),
      });
      break;
    case "cad-aluno":
      data = await api("/api/diretor/alunos", {
        method: "POST",
        body: JSON.stringify({
          nome: $("#dir-al-nome").value,
          cpf: $("#dir-al-cpf").value,
          turma: $("#dir-al-turma").value,
          usuario: $("#dir-al-user").value,
          senha: $("#dir-al-pass").value,
        }),
      });
      break;
    case "cad-prof":
      data = await api("/api/diretor/professores", {
        method: "POST",
        body: JSON.stringify({
          nome: $("#dir-pr-nome").value,
          cpf: $("#dir-pr-cpf").value,
          disciplina: $("#dir-pr-disc").value,
          usuario: $("#dir-pr-user").value,
          senha: $("#dir-pr-pass").value,
        }),
      });
      break;
    case "vincular":
      data = await api("/api/diretor/vincular", {
        method: "POST",
        body: JSON.stringify({
          professor: $("#dir-vinc-prof").value,
          turma: $("#dir-vinc-turma").value,
        }),
      });
      break;
    case "edit-nf":
      data = await api("/api/diretor/notas-faltas", {
        method: "PUT",
        body: JSON.stringify({
          nomeAluno: $("#dir-nf-aluno").value,
          nota: parseFloat($("#dir-nf-nota").value) || null,
          faltas: parseInt($("#dir-nf-faltas").value, 10) ?? null,
        }),
      });
      break;
    case "refresh-turmas":
      await carregarTurmasDiretor();
      toast("Lista atualizada.");
      return;
  }

  if (data) {
    toast(data.mensagem);
    if (data.ok) carregarTurmasDiretor();
  }
});

/* —— Professor —— */
async function carregarTurmaProfessor() {
  const data = await api("/api/professor/turma");
  const sem = $("#prof-sem-turma");
  const cont = $("#prof-conteudo");

  if (!data.ok) {
    sem.hidden = false;
    cont.hidden = true;
    sem.textContent = data.mensagem;
    return;
  }

  sem.hidden = true;
  cont.hidden = false;
  $("#prof-turma-titulo").textContent = `Turma: ${data.turma.nome}`;
  renderTurmas($("#prof-lista-alunos"), [data.turma]);
}

$("#painel-professor").addEventListener("click", async (e) => {
  const acao = e.target.dataset?.acao;
  if (!acao) return;

  let data;
  if (acao === "lancar-nota") {
    data = await api("/api/professor/nota", {
      method: "POST",
      body: JSON.stringify({
        nomeAluno: $("#pr-nota-aluno").value,
        nota: parseFloat($("#pr-nota-valor").value),
      }),
    });
  } else if (acao === "lancar-falta") {
    data = await api("/api/professor/falta", {
      method: "POST",
      body: JSON.stringify({ nomeAluno: $("#pr-falta-aluno").value }),
    });
  }

  if (data) {
    toast(data.mensagem);
    if (data.ok) carregarTurmaProfessor();
  }
});

/* —— Aluno —— */
async function carregarDadosAluno() {
  const data = await api("/api/aluno/me");
  const card = $("#aluno-card");

  if (!data.ok) {
    card.innerHTML = `<p class="alert">${escapeHtml(data.mensagem)}</p>`;
    return;
  }

  card.innerHTML = `
    <p><strong>Nome:</strong> ${escapeHtml(data.nome)}</p>
    <p><strong>CPF:</strong> ${escapeHtml(data.aluno.cpf)}</p>
    <p><strong>Nota:</strong> ${data.aluno.nota}</p>
    <p><strong>Faltas:</strong> ${data.aluno.faltas}</p>
  `;
}

function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s ?? "";
  return d.innerHTML;
}

verificarSessao();
