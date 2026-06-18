namespace Sistema_Gerenciamento_Escolar.Web.DTOs;

public class DadosEscolaDto
{
    public List<TurmaDto> Turmas { get; set; } = [];
    public List<ProfessorDto> Professores { get; set; } = [];
}
