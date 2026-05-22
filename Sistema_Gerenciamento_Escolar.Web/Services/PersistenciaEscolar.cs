using System.Text.Json;
using System.Text.Json.Serialization;

namespace Sistema_Gerenciamento_Escolar.Web.Services;

public class PersistenciaEscolar
{
    private readonly string _caminho;
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        WriteIndented = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public PersistenciaEscolar(IHostEnvironment env)
    {
        _caminho = Path.Combine(env.ContentRootPath, "dados_escola.json");
    }

    public DadosEscolaDto? Carregar()
    {
        if (!File.Exists(_caminho))
            return null;

        var json = File.ReadAllText(_caminho);
        return JsonSerializer.Deserialize<DadosEscolaDto>(json, JsonOpts);
    }

    public void Salvar(DadosEscolaDto dados) =>
        File.WriteAllText(_caminho, JsonSerializer.Serialize(dados, JsonOpts));
}

public class DadosEscolaDto
{
    public List<TurmaDto> Turmas { get; set; } = [];
    public List<ProfessorDto> Professores { get; set; } = [];
}

public class TurmaDto
{
    public string Nome { get; set; } = "";
    public string? ProfessorNome { get; set; }
    public List<AlunoDto> Alunos { get; set; } = [];
}

public class ProfessorDto
{
    public string Nome { get; set; } = "";
    public string Cpf { get; set; } = "";
    public string Disciplina { get; set; } = "";
    public string? TurmaNome { get; set; }
}

public class AlunoDto
{
    public string Nome { get; set; } = "";
    public string Cpf { get; set; } = "";
    public double Nota { get; set; }
    public int Faltas { get; set; }
}
