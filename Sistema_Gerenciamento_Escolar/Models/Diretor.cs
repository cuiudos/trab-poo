namespace Sistema_Gerenciamento_Escolar.Models;

using Sistema_Gerenciamento_Escolar.Helpers;

public class Diretor : DadosPessoais
{
    public Instituicao Instituicao { get; set; }
    public List<Turma> Turmas { get; set; }
    public List<Professor> Professores { get; set; }

    public Diretor(string Nome, string CPF) : base(Nome, CPF)
    {
        Instituicao = new Instituicao("Colégio Jardim das Acácias");
        Turmas = new List<Turma>();
        Professores = new List<Professor>();
    }

    public void CadastrarTurmma(string NomeTurma)
    {
        Turma turma = new Turma(NomeTurma);
        Turmas.Add(turma);
    }

    public bool CadastrarAluno(string nome, string CPF, string NomeTurma, string matricula,
        Responsavel responsavel, Usuario? usuarioLogin)
    {
        if (!ValidadorCpf.TentarNormalizar(CPF, out string cpf, out string erroCpf))
        {
            Console.WriteLine(erroCpf);
            return false;
        }

        if (string.IsNullOrWhiteSpace(matricula))
        {
            Console.WriteLine("Matrícula é obrigatória.");
            return false;
        }

        if (MatriculaJaCadastrada(matricula))
        {
            Console.WriteLine("Matrícula já cadastrada no sistema.");
            return false;
        }

        if (CpfJaCadastrado(cpf))
        {
            Console.WriteLine("CPF já cadastrado no sistema.");
            return false;
        }

        Aluno aluno = new Aluno(nome, cpf, matricula.Trim(), responsavel, usuarioLogin);

        foreach (Turma x in Turmas)
        {
            if (NomeTurma == x.Nome)
            {
                x.Alunos.Add(aluno);
                Console.WriteLine("Aluno cadastrado!");
                return true;
            }
        }

        Console.WriteLine("Turma não encontrada!");
        return false;
    }

    public bool CadastrarProfessor(string nome, string CPF, string Disciplina)
    {
        if (!ValidadorCpf.TentarNormalizar(CPF, out string cpf, out string erroCpf))
        {
            Console.WriteLine(erroCpf);
            return false;
        }

        if (CpfJaCadastrado(cpf))
        {
            Console.WriteLine("CPF já cadastrado no sistema.");
            return false;
        }

        Professor professor = new Professor(nome, cpf, Disciplina);
        Professores.Add(professor);

        Console.WriteLine("Professor cadastrado!");
        return true;
    }

    public void VincularProfessorTurma(Professor professor, string nomeTurma)
    {
        foreach (Turma y in Turmas)
        {
            if (y.Nome == nomeTurma)
            {
                y.professor = professor;
                professor.Turma = y;

                Console.WriteLine("Professor vinculado à turma!");
                return;
            }
        }

        Console.WriteLine("Turma não encontrada!");
    }

    public void ListarTodasTurmas()
    {
        if (Turmas.Count == 0)
        {
            Console.WriteLine("Nenhuma turma cadastrada.");
            return;
        }

        foreach (Turma turma in Turmas)
        {
            Console.WriteLine($"\n--- Turma: {turma.Nome} ---");
            Console.WriteLine($"Professor: {(turma.professor != null ? turma.professor.GetNome() + " (" + turma.professor.Disciplina.Nome + ")" : "Não vinculado")}");

            if (turma.Alunos.Count == 0)
            {
                Console.WriteLine("  (sem alunos)");
                continue;
            }

            foreach (Aluno aluno in turma.Alunos)
            {
                Console.WriteLine($"  Aluno: {aluno.GetNome()} | Matrícula: {aluno.Matricula} | CPF: {aluno.GetCPF()} | Responsável: {aluno.Responsavel.Nome}");
                aluno.VisualizarNotaeFalta();
            }
        }
    }

    public Turma? BuscarTurma(string nomeTurma)
    {
        foreach (Turma turma in Turmas)
        {
            if (turma.Nome == nomeTurma)
                return turma;
        }
        return null;
    }

    public void EditarNomeTurma(string nomeAtual, string nomeNovo)
    {
        Turma? turma = BuscarTurma(nomeAtual);
        if (turma == null)
        {
            Console.WriteLine("Turma não encontrada!");
            return;
        }

        if (BuscarTurma(nomeNovo) != null && nomeAtual != nomeNovo)
        {
            Console.WriteLine("Já existe uma turma com esse nome.");
            return;
        }

        turma.Nome = nomeNovo;
        Console.WriteLine("Turma atualizada!");
    }

    public void EditarAluno(string nomeAtual, string novoNome, string novoCpf, string novaTurma)
    {
        Aluno? aluno = null;
        Turma? turmaOrigem = null;

        foreach (Turma turma in Turmas)
        {
            foreach (Aluno a in turma.Alunos)
            {
                if (a.GetNome() == nomeAtual)
                {
                    aluno = a;
                    turmaOrigem = turma;
                    break;
                }
            }
            if (aluno != null)
                break;
        }

        if (aluno == null || turmaOrigem == null)
        {
            Console.WriteLine("Aluno não encontrado!");
            return;
        }

        if (!ValidadorCpf.TentarNormalizar(novoCpf, out string cpf, out string erroCpf))
        {
            Console.WriteLine(erroCpf);
            return;
        }

        if (CpfJaCadastrado(cpf, aluno.GetCPF()))
        {
            Console.WriteLine("CPF já cadastrado no sistema.");
            return;
        }

        Turma? turmaDestino = BuscarTurma(novaTurma);
        if (turmaDestino == null)
        {
            Console.WriteLine("Turma de destino não encontrada!");
            return;
        }

        aluno.SetNome(novoNome);
        aluno.SetCPF(cpf);

        if (turmaOrigem != turmaDestino)
        {
            turmaOrigem.Alunos.Remove(aluno);
            turmaDestino.Alunos.Add(aluno);
        }

        Console.WriteLine("Aluno atualizado!");
    }

    public void EditarNotasFaltasAluno(string nomeAluno, double? nota, int? faltas)
    {
        foreach (Turma turma in Turmas)
        {
            foreach (Aluno aluno in turma.Alunos)
            {
                if (aluno.GetNome() == nomeAluno)
                {
                    var registro = aluno.Boletim.ObterRegistro("Geral")
                        ?? aluno.Boletim.Registros.FirstOrDefault();

                    if (nota.HasValue)
                    {
                        if (registro != null)
                            registro.Nota.Valor = nota.Value;
                        else
                            aluno.Boletim.LancarNota("Geral", nota.Value);
                    }

                    if (faltas.HasValue)
                    {
                        if (registro != null)
                            registro.Falta.Quantidade = faltas.Value;
                        else
                            aluno.Boletim.DefinirFaltas("Geral", faltas.Value);
                    }

                    Console.WriteLine("Notas/faltas do aluno atualizadas!");
                    return;
                }
            }
        }

        Console.WriteLine("Aluno não encontrado!");
    }

    public Professor? BuscarProfessor(string nome)
    {
        foreach (Professor professor in Professores)
        {
            if (professor.GetNome() == nome)
                return professor;
        }
        return null;
    }

    public void EditarProfessor(string nomeAtual, string novoNome, string novoCpf, string novaDisciplina)
    {
        Professor? professor = BuscarProfessor(nomeAtual);
        if (professor == null)
        {
            Console.WriteLine("Professor não encontrado!");
            return;
        }

        if (!ValidadorCpf.TentarNormalizar(novoCpf, out string cpf, out string erroCpf))
        {
            Console.WriteLine(erroCpf);
            return;
        }

        if (CpfJaCadastrado(cpf, professor.GetCPF()))
        {
            Console.WriteLine("CPF já cadastrado no sistema.");
            return;
        }

        professor.SetNome(novoNome);
        professor.SetCPF(cpf);
        professor.Disciplina = new Disciplina(novaDisciplina);
        Console.WriteLine("Professor atualizado!");
    }

    private bool CpfJaCadastrado(string cpf, string? cpfIgnorar = null)
    {
        if (cpfIgnorar != null && cpf == cpfIgnorar)
            return false;

        if (GetCPF() == cpf)
            return true;

        foreach (Professor professor in Professores)
        {
            if (professor.GetCPF() == cpf)
                return true;
        }

        foreach (Turma turma in Turmas)
        {
            foreach (Aluno aluno in turma.Alunos)
            {
                if (aluno.GetCPF() == cpf)
                    return true;
            }
        }

        return false;
    }

    private bool MatriculaJaCadastrada(string matricula, string? matriculaIgnorar = null)
    {
        matricula = matricula.Trim();

        if (matriculaIgnorar != null && matricula == matriculaIgnorar.Trim())
            return false;

        foreach (Turma turma in Turmas)
        {
            foreach (Aluno aluno in turma.Alunos)
            {
                if (aluno.Matricula == matricula)
                    return true;
            }
        }

        return false;
    }
}
