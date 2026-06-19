namespace Sistema_Gerenciamento_Escolar.Models;

public class Usuario
{
    public string Login { get; set; }

    public Usuario(string login)
    {
        Login = login;
    }
}
