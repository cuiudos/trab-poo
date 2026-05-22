public class Diretor : DadosPessoais
{
    public List<Turma> Turmas { get; set; }
    public List<Professor> Professores { get; set; }

    public Diretor(string Nome, string CPF) : base(Nome, CPF)
    {
        Turmas = new List<Turma>();
        Professores = new List<Professor>();
    }


    public void CadastrarTurmma(string NomeTurma)
    {
        Turma turma = new Turma(NomeTurma);
        Turmas.Add(turma);
    }

    public void CadastrarAluno(string nome, string CPF, string NomeTurma)
    {
        Aluno aluno = new Aluno(nome, CPF);

        foreach (Turma x in Turmas)
        {
            if (NomeTurma == x.Nome)
            {
                x.Alunos.Add(aluno);
                Console.WriteLine("Aluno cadastrado!");
                return;
            }
        }

        Console.WriteLine("Turma não encontrada!");
    }

    public void CadastrarProfessor(string nome, string CPF, string Disciplina)
    {
        Professor professor = new Professor(nome, CPF, Disciplina);
        Professores.Add(professor);

        Console.WriteLine("Professor cadastrado!");
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
            Console.WriteLine($"Professor: {(turma.professor != null ? turma.professor.GetNome() + " (" + turma.professor.Disciplina + ")" : "Não vinculado")}");

            if (turma.Alunos.Count == 0)
            {
                Console.WriteLine("  (sem alunos)");
                continue;
            }

            foreach (Aluno aluno in turma.Alunos)
            {
                Console.WriteLine($"  Aluno: {aluno.GetNome()} | CPF: {aluno.GetCPF()} | Nota: {aluno.Nota} | Faltas: {aluno.Faltas}");
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

        Turma? turmaDestino = BuscarTurma(novaTurma);
        if (turmaDestino == null)
        {
            Console.WriteLine("Turma de destino não encontrada!");
            return;
        }

        aluno.SetNome(novoNome);
        aluno.SetCPF(novoCpf);

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
                    if (nota.HasValue)
                        aluno.Nota = nota.Value;
                    if (faltas.HasValue)
                        aluno.Faltas = faltas.Value;
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

        professor.SetNome(novoNome);
        professor.SetCPF(novoCpf);
        professor.Disciplina = novaDisciplina;
        Console.WriteLine("Professor atualizado!");
    }
}