using System.Text.Json;
using System.Text.Json.Serialization;
using Sistema_Gerenciamento_Escolar.Web.DTOs;

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
