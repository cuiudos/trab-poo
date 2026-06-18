namespace Sistema_Gerenciamento_Escolar.Web.DTOs;

public class TurmaDto
{
    public string Nome { get; set; } = "";
    public string? ProfessorNome { get; set; }
    public List<AlunoDto> Alunos { get; set; } = [];
}
