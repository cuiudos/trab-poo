namespace Sistema_Gerenciamento_Escolar.Models;

public class Aluno : DadosPessoais
{
    public double Nota { get; set; }
    public int Faltas { get; set; }

    public Aluno(string Nome, string CPF) : base(Nome, CPF)
    {
    }

    public void VisualizarNotaeFalta()
    {
        Console.WriteLine($"Sua nota é: {Nota}");
        Console.WriteLine($"Suas faltas são: {Faltas}");
    }
}
