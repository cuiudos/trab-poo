namespace Sistema_Gerenciamento_Escolar.Helpers;

public static class ValidadorCpf
{
    public const int Tamanho = 11;

    public static bool TentarNormalizar(string? entrada, out string cpfNormalizado, out string mensagemErro)
    {
        cpfNormalizado = "";
        mensagemErro = "";

        if (string.IsNullOrWhiteSpace(entrada))
        {
            mensagemErro = "CPF é obrigatório.";
            return false;
        }

        entrada = entrada.Trim();

        if (entrada.Any(char.IsLetter))
        {
            mensagemErro = "CPF não pode conter letras.";
            return false;
        }

        cpfNormalizado = new string(entrada.Where(char.IsDigit).ToArray());

        if (cpfNormalizado.Length != Tamanho)
        {
            mensagemErro = $"CPF deve ter exatamente {Tamanho} números.";
            return false;
        }

        return true;
    }
}
