namespace Sistema_Gerenciamento_Escolar.Web.DTOs;

public class AlunoDto
{
    public string Nome { get; set; } = "";
    public string Cpf { get; set; } = "";
    public double Nota { get; set; }
    public int Faltas { get; set; }
}
