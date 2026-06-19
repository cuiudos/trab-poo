function validarCpf(entrada) {
  if (entrada == null || String(entrada).trim() === "") {
    return { ok: false, mensagem: "CPF é obrigatório." };
  }

  const texto = String(entrada).trim();

  if (/[a-zA-Z]/.test(texto)) {
    return { ok: false, mensagem: "CPF não pode conter letras." };
  }

  const cpf = texto.replace(/\D/g, "");

  if (cpf.length !== 11) {
    return { ok: false, mensagem: "CPF deve ter exatamente 11 números." };
  }

  return { ok: true, cpf };
}

module.exports = { validarCpf };
