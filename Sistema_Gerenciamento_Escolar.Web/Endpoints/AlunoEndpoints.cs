using Sistema_Gerenciamento_Escolar.Enums;
using Sistema_Gerenciamento_Escolar.Web.Helpers;
using Sistema_Gerenciamento_Escolar.Web.Services;

namespace Sistema_Gerenciamento_Escolar.Web.Endpoints;

public static class AlunoEndpoints
{
    public static void MapAlunoEndpoints(this WebApplication app)
    {
        var escola = app.Services.GetRequiredService<GerenciadorEscolarService>();

        app.MapGet("/api/aluno/me", (HttpContext ctx) =>
        {
            if (!AutorizacaoHelper.Autorizado(ctx, TipoAcesso.Aluno)) return AutorizacaoHelper.NaoAutorizado();
            var dados = escola.ObterDadosAluno(ctx.Session.GetString(SessaoKeys.Nome)!);
            if (dados == null)
                return ApiResults.Json(new { ok = false, mensagem = "Aluno não encontrado em turma." });
            return ApiResults.Json(new { ok = true, aluno = dados, nome = ctx.Session.GetString(SessaoKeys.Nome) });
        });
    }
}
