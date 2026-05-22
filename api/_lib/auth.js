const fs = require("fs");
const path = require("path");
const { XMLParser } = require("fast-xml-parser");

const xmlPath = path.join(process.cwd(), "data", "usuarios.xml");

function carregarXml() {
  const xml = fs.readFileSync(xmlPath, "utf8");
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });
  return parser.parse(xml).SistemaGerenciamentoEscolar;
}

function asArray(v) {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

function autenticar(tipo, usuario, senha) {
  usuario = (usuario || "").trim();
  senha = (senha || "").trim();
  if (!usuario || !senha) return { ok: false, mensagem: "Usuário e senha são obrigatórios." };

  const root = carregarXml();
  let lista = [];

  if (tipo === "diretor") lista = asArray(root.Diretor?.Usuario);
  else if (tipo === "professor") lista = asArray(root.Professores?.Professor);
  else if (tipo === "aluno") lista = asArray(root.Alunos?.Aluno);

  const found = lista.find(
    (u) => u.login?.toLowerCase() === usuario.toLowerCase() && u.senha === senha
  );

  if (!found) return { ok: false, mensagem: "Usuário ou senha incorretos." };

  const nome = found.Nome || found.nome;
  return {
    ok: true,
    mensagem: `Login realizado com sucesso. Bem-vindo(a), ${nome}!`,
    perfil: tipo,
    nome,
    login: found.login,
  };
}

module.exports = { autenticar };
