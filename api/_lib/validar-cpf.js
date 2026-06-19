function extrairDigitosCpf(entrada) {
  if (entrada == null || String(entrada).trim() === "") return "";

  let texto = String(entrada).trim();

  if (/e/i.test(texto)) {
    const n = Number(texto);
    if (Number.isFinite(n) && n > 0) {
      texto = n.toLocaleString("fullwide", { useGrouping: false, maximumFractionDigits: 0 });
    }
  }

  return texto.replace(/\D/g, "");
}

function validarCpf(entrada) {
  if (entrada == null || String(entrada).trim() === "") {
    return { ok: false, mensagem: "CPF é obrigatório." };
  }

  const texto = String(entrada).trim();

  if (/[a-zA-Z]/.test(texto)) {
    return { ok: false, mensagem: "CPF não pode conter letras." };
  }

  const cpf = extrairDigitosCpf(texto);

  if (cpf.length !== 11) {
    return { ok: false, mensagem: "CPF deve ter exatamente 11 números." };
  }

  return { ok: true, cpf };
}

function formatarCpfExibicao(entrada) {
  const cpf = extrairDigitosCpf(entrada);
  if (!cpf) return "—";
  if (cpf.length !== 11) return "CPF inválido";
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
}

module.exports = { validarCpf, extrairDigitosCpf, formatarCpfExibicao };
