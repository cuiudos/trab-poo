using Sistema_Gerenciamento_Escolar.Enums;
using Sistema_Gerenciamento_Escolar.Web.DTOs;
using Sistema_Gerenciamento_Escolar.Web.Helpers;
using Sistema_Gerenciamento_Escolar.Web.Services;

namespace Sistema_Gerenciamento_Escolar.Web.Endpoints;

public static class ProfessorEndpoints
{
    public static void MapProfessorEndpoints(this WebApplication app)
    {
        var escola = app.Services.GetRequiredService<GerenciadorEscolarService>();

        app.MapGet("/api/professor/turma", (HttpContext ctx) =>
        {
            if (!AutorizacaoHelper.Autorizado(ctx, TipoAcesso.Professor)) return AutorizacaoHelper.NaoAutorizado();
            var nome = ctx.Session.GetString(SessaoKeys.Nome)!;
            var turma = escola.ObterTurmaProfessor(nome);
            if (turma == null)
                return ApiResults.Json(new { ok = false, mensagem = "Sem turma vinculada pelo diretor." });
            return ApiResults.Json(new { ok = true, turma });
        });

        app.MapPost("/api/professor/nota", (HttpContext ctx, LancamentoRequest req) =>
        {
            if (!AutorizacaoHelper.Autorizado(ctx, TipoAcesso.Professor)) return AutorizacaoHelper.NaoAutorizado();
            var (ok, msg) = escola.LancarNota(ctx.Session.GetString(SessaoKeys.Nome)!, req.NomeAluno ?? "", req.Nota ?? 0);
            return ApiResults.Json(new { ok, mensagem = msg });
        });

        app.MapPost("/api/professor/falta", (HttpContext ctx, LancamentoRequest req) =>
        {
            if (!AutorizacaoHelper.Autorizado(ctx, TipoAcesso.Professor)) return AutorizacaoHelper.NaoAutorizado();
            var (ok, msg) = escola.LancarFalta(ctx.Session.GetString(SessaoKeys.Nome)!, req.NomeAluno ?? "");
            return ApiResults.Json(new { ok, mensagem = msg });
        });
    }
}
