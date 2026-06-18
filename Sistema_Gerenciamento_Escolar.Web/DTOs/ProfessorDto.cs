namespace Sistema_Gerenciamento_Escolar.Web.DTOs;

public class ProfessorDto
{
    public string Nome { get; set; } = "";
    public string Cpf { get; set; } = "";
    public string Disciplina { get; set; } = "";
    public string? TurmaNome { get; set; }
}
