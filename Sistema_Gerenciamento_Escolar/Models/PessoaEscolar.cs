namespace Sistema_Gerenciamento_Escolar.Models;

using Sistema_Gerenciamento_Escolar.Interfaces;

public abstract class PessoaEscolar : IPerfilEscolar
{
    private string _nome;
    private string _cpf;

    protected PessoaEscolar(string nome, string cpf)
    {
        _nome = nome;
        _cpf = cpf;
    }

    public string GetNome() => _nome;

    public string GetCPF() => _cpf;

    public void SetNome(string nome) => _nome = nome;

    public void SetCPF(string cpf) => _cpf = cpf;

    public virtual string ObterResumo() => $"{GetNome()} — CPF {GetCPF()}";

    public abstract void ExibirPainel();
}
