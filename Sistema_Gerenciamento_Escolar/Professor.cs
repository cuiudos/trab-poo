public class Professor : DadosPessoais
{
    public string Disciplina { get; set; }
    public Turma Turma { get; set; } // vínculo com a turma

    public Professor(string nome, string cpf, string disciplina) : base(nome, cpf)
    {
        Disciplina = disciplina;
    }

    public void LancarNota(string nomeAluno, double nota)
    {
        if (Turma == null)
        {
            Console.WriteLine("Professor não possui turma!");
            return;
        }
        foreach (Aluno aluno in Turma.Alunos)
        {
            if (aluno.GetNome() == nomeAluno)
            {
                aluno.Nota = nota;
                Console.WriteLine("Nota lançada!");
                return;
            }
        }

        Console.WriteLine("Aluno não encontrado!");
    }

    public void RegistrarFalta(string nomeAluno)
    {
        if (Turma == null)
        {
            Console.WriteLine("Professor não possui turma!");
            return;
        }

        foreach (Aluno aluno in Turma.Alunos)
        {
            if (aluno.GetNome() == nomeAluno)
            {
                aluno.Faltas++;
                Console.WriteLine("Falta registrada!");
                return;
            }
        }

        Console.WriteLine("Aluno não encontrado!");
    }

    public void VisualizarTurma()
    {
        if (Turma == null)
        {
            Console.WriteLine("Professor não possui turma vinculada.");
            return;
        }

        Console.WriteLine($"\n--- Turma: {Turma.Nome} ---");
        Console.WriteLine($"Disciplina: {Disciplina}");
        Console.WriteLine($"Professor: {GetNome()}");

        if (Turma.Alunos.Count == 0)
        {
            Console.WriteLine("Nenhum aluno cadastrado nesta turma.");
            return;
        }

        Console.WriteLine("\nAlunos:");
        foreach (Aluno aluno in Turma.Alunos)
        {
            Console.WriteLine($"  • {aluno.GetNome()} | CPF: {aluno.GetCPF()} | Nota: {aluno.Nota} | Faltas: {aluno.Faltas}");
        }
    }
}