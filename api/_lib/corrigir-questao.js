function corrigirQuestao(tipo, opcoes, resposta, pontuacao) {
  const pts = parseFloat(pontuacao) || 1;

  if (tipo === "multipla_escolha") {
    const lista = opcoes?.opcoes || [];
    const correta = lista.find((o) => o.correta);
    const sel = resposta?.selecionada;
    const ok = correta && sel === correta.id;
    return { nota: ok ? pts : 0, corrigida: true };
  }

  if (tipo === "verdadeiro_falso") {
    const ok = resposta?.valor === opcoes?.correta;
    return { nota: ok ? pts : 0, corrigida: true };
  }

  if (tipo === "discursiva") {
    return { nota: null, corrigida: false };
  }

  if (tipo === "completar") {
    const gabarito = (opcoes?.lacunas || []).map((l) => String(l.resposta || "").trim().toLowerCase());
    const resp = (resposta?.lacunas || []).map((r) => String(r || "").trim().toLowerCase());
    if (!gabarito.length) return { nota: 0, corrigida: true };
    let acertos = 0;
    for (let i = 0; i < gabarito.length; i++) {
      if (gabarito[i] === resp[i]) acertos++;
    }
    const nota = (acertos / gabarito.length) * pts;
    return { nota: Math.round(nota * 100) / 100, corrigida: true };
  }

  if (tipo === "associacao") {
    const pares = opcoes?.pares || [];
    const resp = resposta?.pares || {};
    if (!pares.length) return { nota: 0, corrigida: true };
    let acertos = 0;
    for (const p of pares) {
      if (resp[p.esquerda] === p.direita) acertos++;
    }
    const nota = (acertos / pares.length) * pts;
    return { nota: Math.round(nota * 100) / 100, corrigida: true };
  }

  return { nota: 0, corrigida: true };
}

function sanitizarOpcoesAluno(tipo, opcoes) {
  if (!opcoes || typeof opcoes !== "object") return {};
  if (tipo === "multipla_escolha") {
    return {
      opcoes: (opcoes.opcoes || []).map((o) => ({ id: o.id, texto: o.texto })),
    };
  }
  if (tipo === "verdadeiro_falso") return {};
  if (tipo === "completar") {
    return { texto: opcoes.texto || "", lacunas: (opcoes.lacunas || []).map(() => "") };
  }
  if (tipo === "associacao") {
    return {
      esquerda: (opcoes.pares || []).map((p) => p.esquerda),
      direita: shuffle([...(opcoes.pares || []).map((p) => p.direita)]),
    };
  }
  return { ...opcoes };
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function calcularNotaTentativa(questoes, respostasMap) {
  let pontos = 0;
  let total = 0;
  let pendenteManual = false;

  for (const q of questoes) {
    const pts = parseFloat(q.pontuacao) || 1;
    total += pts;
    const resp = respostasMap[q.id];
    if (!resp) continue;
    if (resp.nota_atribuida !== null && resp.nota_atribuida !== undefined) {
      pontos += parseFloat(resp.nota_atribuida) || 0;
      if (!resp.corrigida && q.tipo === "discursiva") pendenteManual = true;
    } else if (resp.corrigida) {
      pontos += parseFloat(resp.nota_atribuida) || 0;
    } else if (q.tipo === "discursiva") {
      pendenteManual = true;
    }
  }

  return { pontos, total, pendenteManual };
}

function escalarNota(pontos, total, notaMaxima) {
  if (!total) return 0;
  return Math.round(((pontos / total) * notaMaxima) * 100) / 100;
}

function notaFinalAluno(tentativas, regraNota) {
  const finalizadas = (tentativas || []).filter((t) => t.status === "finalizada" && t.nota !== null);
  if (!finalizadas.length) return null;
  if (regraNota === "ultima") return finalizadas[finalizadas.length - 1].nota;
  if (regraNota === "media") {
    const soma = finalizadas.reduce((s, t) => s + parseFloat(t.nota), 0);
    return Math.round((soma / finalizadas.length) * 100) / 100;
  }
  return Math.max(...finalizadas.map((t) => parseFloat(t.nota)));
}

module.exports = {
  corrigirQuestao,
  sanitizarOpcoesAluno,
  calcularNotaTentativa,
  escalarNota,
  notaFinalAluno,
};
