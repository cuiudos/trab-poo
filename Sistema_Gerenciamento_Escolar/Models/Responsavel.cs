namespace Sistema_Gerenciamento_Escolar.Models;

public class Responsavel
{
    public string Nome { get; set; }
    public string Telefone { get; set; }

    public Responsavel(string nome, string telefone = "")
    {
        Nome = nome;
        Telefone = telefone;
    }
}
