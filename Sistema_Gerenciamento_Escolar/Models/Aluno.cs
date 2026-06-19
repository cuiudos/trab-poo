namespace Sistema_Gerenciamento_Escolar.Models;

public class Aluno : PessoaEscolar
{
    public string Matricula { get; set; } = "";
    public Usuario? UsuarioLogin { get; set; }
    public Responsavel Responsavel { get; set; } = new Responsavel("");
    public Boletim Boletim { get; set; } = new();

    public double Nota
    {
        get => Boletim.Registros.FirstOrDefault()?.Nota.Valor ?? 0;
        set
        {
            var disciplina = Boletim.Registros.FirstOrDefault()?.Disciplina.Nome ?? "Geral";
            Boletim.LancarNota(disciplina, value);
        }
    }

    public int Faltas
    {
        get => Boletim.Registros.FirstOrDefault()?.Falta.Quantidade ?? 0;
        set
        {
            var disciplina = Boletim.Registros.FirstOrDefault()?.Disciplina.Nome ?? "Geral";
            Boletim.DefinirFaltas(disciplina, value);
        }
    }

    public Aluno(string nome, string cpf) : base(nome, cpf)
    {
    }

    public Aluno(string nome, string cpf, string matricula, Responsavel responsavel, Usuario? usuario)
        : base(nome, cpf)
    {
        Matricula = matricula;
        Responsavel = responsavel;
        UsuarioLogin = usuario;
    }

    public void VisualizarNotaeFalta()
    {
        if (Boletim.Registros.Count == 0)
        {
            Console.WriteLine("Nenhuma nota ou falta registrada ainda.");
            return;
        }

        foreach (var registro in Boletim.Registros)
        {
            Console.WriteLine($"Disciplina: {registro.Disciplina.Nome}");
            Console.WriteLine($"  Nota: {registro.Nota.Valor}");
            Console.WriteLine($"  Faltas: {registro.Falta.Quantidade}");
        }
    }

    public void VisualizarBoletim(string nomeInstituicao) =>
        Boletim.Exibir(nomeInstituicao, GetNome(), Matricula);

    public override string ObterResumo() =>
        $"{base.ObterResumo()} | Matrícula {Matricula}";

    public override void ExibirPainel()
    {
        Console.WriteLine("\n=== Painel do Aluno ===");
        Console.WriteLine(ObterResumo());
        Console.WriteLine($"Responsável: {Responsavel.Nome} ({Responsavel.Telefone})");
        VisualizarNotaeFalta();
    }
}
