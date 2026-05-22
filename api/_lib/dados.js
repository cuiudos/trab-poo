const fs = require("fs");
const path = require("path");

const BUNDLED = path.join(process.cwd(), "data", "dados_escola.json");
const TMP = "/tmp/dados_escola.json";

function carregar() {
  const p = fs.existsSync(TMP) ? TMP : BUNDLED;
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function salvar(dados) {
  try {
    fs.writeFileSync(TMP, JSON.stringify(dados, null, 2));
  } catch {
    fs.writeFileSync(BUNDLED, JSON.stringify(dados, null, 2));
  }
}

function buscarTurma(dados, nome) {
  return dados.turmas.find((t) => t.nome === nome);
}

function buscarProfessor(dados, nome) {
  return dados.professores.find((p) => p.nome === nome);
}

function buscarAluno(dados, nomeAluno) {
  for (const t of dados.turmas) {
    const a = t.alunos.find((x) => x.nome === nomeAluno);
    if (a) return { aluno: a, turma: t };
  }
  return null;
}

function turmaDto(t) {
  return {
    nome: t.nome,
    professorNome: t.professorNome || null,
    alunos: t.alunos || [],
  };
}

module.exports = { carregar, salvar, buscarTurma, buscarProfessor, buscarAluno, turmaDto };
