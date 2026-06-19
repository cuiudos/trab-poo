namespace Sistema_Gerenciamento_Escolar.Results;

public class ResultadoAutenticacao
{
    public bool Sucesso { get; init; }
    public string Mensagem { get; init; } = "";
    public CredencialUsuario? Credencial { get; init; }
}

public class CredencialUsuario
{
    public string Login { get; init; } = "";
    public string Nome { get; init; } = "";
    public string Cpf { get; init; } = "";
    public string? Disciplina { get; init; }
    public string? Turma { get; init; }
    public string? Matricula { get; init; }
    public string? ResponsavelNome { get; init; }
    public string? ResponsavelTelefone { get; init; }
}
