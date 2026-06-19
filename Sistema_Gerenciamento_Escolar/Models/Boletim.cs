namespace Sistema_Gerenciamento_Escolar.Models;

public class Boletim
{
    public List<RegistroDisciplinar> Registros { get; } = [];

    public void LancarNota(string nomeDisciplina, double valor)
    {
        var registro = ObterOuCriarRegistro(nomeDisciplina);
        registro.Nota.Valor = valor;
    }

    public void RegistrarFalta(string nomeDisciplina)
    {
        var registro = ObterOuCriarRegistro(nomeDisciplina);
        registro.Falta.Quantidade++;
    }

    public void DefinirFaltas(string nomeDisciplina, int quantidade)
    {
        var registro = ObterOuCriarRegistro(nomeDisciplina);
        registro.Falta.Quantidade = quantidade;
    }

    public RegistroDisciplinar? ObterRegistro(string nomeDisciplina)
    {
        return Registros.FirstOrDefault(r =>
            r.Disciplina.Nome.Equals(nomeDisciplina, StringComparison.OrdinalIgnoreCase));
    }

    public void Exibir(string nomeInstituicao, string nomeAluno, string matricula)
    {
        Console.WriteLine($"\n=== Boletim — {nomeInstituicao} ===");
        Console.WriteLine($"Aluno: {nomeAluno}");
        Console.WriteLine($"Matrícula: {matricula}");

        if (Registros.Count == 0)
        {
            Console.WriteLine("Nenhum registro de disciplina ainda.");
            return;
        }

        Console.WriteLine("\nDisciplina          | Nota   | Faltas");
        Console.WriteLine("--------------------|--------|-------");
        foreach (var registro in Registros)
        {
            Console.WriteLine($"{registro.Disciplina.Nome,-19} | {registro.Nota.Valor,6:F1} | {registro.Falta.Quantidade,5}");
        }
    }

    private RegistroDisciplinar ObterOuCriarRegistro(string nomeDisciplina)
    {
        var existente = ObterRegistro(nomeDisciplina);
        if (existente != null)
            return existente;

        var novo = new RegistroDisciplinar(new Disciplina(nomeDisciplina));
        Registros.Add(novo);
        return novo;
    }
}
