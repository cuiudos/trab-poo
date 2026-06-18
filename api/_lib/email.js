const DOMINIO = "acacias.edu.br";

function normalizarEmail(valor) {
  const v = (valor || "").trim().toLowerCase();
  return v.includes("@") ? v : `${v}@${DOMINIO}`;
}

function emailsParaBusca(valor) {
  const v = (valor || "").trim().toLowerCase();
  const base = v.includes("@") ? v.split("@")[0] : v;
  const emails = new Set([normalizarEmail(v)]);

  if (base === "professor2") emails.add(`profesor2@${DOMINIO}`);
  if (base === "profesor2") emails.add(`professor2@${DOMINIO}`);

  return [...emails];
}

function emailParaLogin(email) {
  if (!email) return null;
  const partes = email.toLowerCase().split("@");
  if (partes.length !== 2) return email;
  const [local, dominio] = partes;
  return dominio === DOMINIO ? local : email;
}

module.exports = { DOMINIO, normalizarEmail, emailsParaBusca, emailParaLogin };
