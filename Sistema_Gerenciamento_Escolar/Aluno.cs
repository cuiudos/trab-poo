public class Aluno: DadosPessoais
{
    public double Nota { get; set; }
    public int Faltas { get; set; }

    public Aluno (string Nome, string CPF) : base(Nome, CPF)
    {
        
    }

    public void VisualizarNotaeFalta()
    {
        System.Console.WriteLine($"Sua nota é: {Nota}");

        System.Console.WriteLine($"Suas faltas são: {Faltas}");
    }
}