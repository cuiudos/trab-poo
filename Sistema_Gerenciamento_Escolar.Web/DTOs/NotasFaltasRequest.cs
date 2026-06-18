namespace Sistema_Gerenciamento_Escolar.Web.DTOs;

public class NotasFaltasRequest
{
    public string? NomeAluno { get; set; }
    public double? Nota { get; set; }
    public int? Faltas { get; set; }
}
