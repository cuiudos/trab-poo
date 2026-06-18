namespace Sistema_Gerenciamento_Escolar.Models;

public class DadosPessoais
{
    private string Nome;
    private string CPF;

    public string GetNome()
    {
        return Nome;
    }

    public string GetCPF()
    {
        return CPF;
    }

    public void SetNome(string Nome)
    {
        this.Nome = Nome;
    }

    public void SetCPF(string CPF)
    {
        this.CPF = CPF;
    }

    public DadosPessoais(string Nome, string CPF)
    {
        this.Nome = Nome;
        this.CPF = CPF;
    }
}
