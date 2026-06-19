namespace Sistema_Gerenciamento_Escolar.Models;

public class Professor : PessoaEscolar
{
    public Disciplina Disciplina { get; set; }
    public Turma Turma { get; set; }
    public Usuario? UsuarioLogin { get; set; }

    public Professor(string nome, string cpf, string disciplina) : base(nome, cpf)
    {
        Disciplina = new Disciplina(disciplina);
        Turma = null!;
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
                aluno.Boletim.LancarNota(Disciplina.Nome, nota);
                Console.WriteLine($"Nota lançada em {Disciplina.Nome}!");
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
                aluno.Boletim.RegistrarFalta(Disciplina.Nome);
                Console.WriteLine($"Falta registrada em {Disciplina.Nome}!");
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
        Console.WriteLine($"Disciplina: {Disciplina.Nome}");
        Console.WriteLine($"Professor: {GetNome()}");

        if (Turma.Alunos.Count == 0)
        {
            Console.WriteLine("Nenhum aluno cadastrado nesta turma.");
            return;
        }

        Console.WriteLine("\nAlunos:");
        foreach (Aluno aluno in Turma.Alunos)
        {
            var registro = aluno.Boletim.ObterRegistro(Disciplina.Nome);
            double nota = registro?.Nota.Valor ?? 0;
            int faltas = registro?.Falta.Quantidade ?? 0;
            Console.WriteLine($"  • {aluno.GetNome()} | Matrícula: {aluno.Matricula} | Nota: {nota} | Faltas: {faltas}");
        }
    }

    public override string ObterResumo() =>
        $"{base.ObterResumo()} | Professor de {Disciplina.Nome}";

    public override void ExibirPainel()
    {
        Console.WriteLine("\n=== Painel do Professor ===");
        Console.WriteLine(ObterResumo());
        if (Turma == null)
            Console.WriteLine("Nenhuma turma vinculada.");
        else
            VisualizarTurma();
    }
}
