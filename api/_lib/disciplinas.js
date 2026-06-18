function normalizarDisciplinas(valor) {
  if (!valor || typeof valor !== "string") return null;
  const lista = valor
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const unicas = [...new Set(lista)];
  return unicas.length ? unicas.join(", ") : null;
}

function listaDisciplinas(valor) {
  if (!valor) return [];
  return valor
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

module.exports = { normalizarDisciplinas, listaDisciplinas };
