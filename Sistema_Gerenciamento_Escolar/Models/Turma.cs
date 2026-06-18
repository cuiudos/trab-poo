namespace Sistema_Gerenciamento_Escolar.Models;

public class Turma
{
    public string Nome { get; set; }
    public Professor professor { get; set; }
    public List<Aluno> Alunos { get; set; }

    public Turma(string Nome)
    {
        this.Nome = Nome;
        Alunos = new List<Aluno>();
    }
}
