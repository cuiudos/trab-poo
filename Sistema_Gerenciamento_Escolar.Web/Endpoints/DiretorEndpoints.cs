using Sistema_Gerenciamento_Escolar.Enums;
using Sistema_Gerenciamento_Escolar.Web.DTOs;
using Sistema_Gerenciamento_Escolar.Web.Helpers;
using Sistema_Gerenciamento_Escolar.Web.Services;

namespace Sistema_Gerenciamento_Escolar.Web.Endpoints;

public static class DiretorEndpoints
{
    public static void MapDiretorEndpoints(this WebApplication app)
    {
        var escola = app.Services.GetRequiredService<GerenciadorEscolarService>();

        app.MapGet("/api/diretor/turmas", (HttpContext ctx) =>
        {
            if (!AutorizacaoHelper.Autorizado(ctx, TipoAcesso.Diretor)) return AutorizacaoHelper.NaoAutorizado();
            return ApiResults.Json(new { ok = true, turmas = escola.ListarTurmas() });
        });

        app.MapPost("/api/diretor/turmas", (HttpContext ctx, NomeRequest req) =>
        {
            if (!AutorizacaoHelper.Autorizado(ctx, TipoAcesso.Diretor)) return AutorizacaoHelper.NaoAutorizado();
            var (ok, msg) = escola.CadastrarTurma(req.Nome ?? "");
            return ApiResults.Json(new { ok, mensagem = msg });
        });

        app.MapPost("/api/diretor/alunos", (HttpContext ctx, CadastroAlunoRequest req) =>
        {
            if (!AutorizacaoHelper.Autorizado(ctx, TipoAcesso.Diretor)) return AutorizacaoHelper.NaoAutorizado();
            var (ok, msg) = escola.CadastrarAluno(req.Nome ?? "", req.Cpf ?? "", req.Turma ?? "",
                req.Usuario, req.Senha);
            return ApiResults.Json(new { ok, mensagem = msg });
        });

        app.MapPost("/api/diretor/professores", (HttpContext ctx, CadastroProfessorRequest req) =>
        {
            if (!AutorizacaoHelper.Autorizado(ctx, TipoAcesso.Diretor)) return AutorizacaoHelper.NaoAutorizado();
            var (ok, msg) = escola.CadastrarProfessor(req.Nome ?? "", req.Cpf ?? "", req.Disciplina ?? "",
                req.Usuario, req.Senha);
            return ApiResults.Json(new { ok, mensagem = msg });
        });

        app.MapPost("/api/diretor/vincular", (HttpContext ctx, VincularRequest req) =>
        {
            if (!AutorizacaoHelper.Autorizado(ctx, TipoAcesso.Diretor)) return AutorizacaoHelper.NaoAutorizado();
            var (ok, msg) = escola.VincularProfessor(req.Professor ?? "", req.Turma ?? "");
            return ApiResults.Json(new { ok, mensagem = msg });
        });

        app.MapPut("/api/diretor/turmas", (HttpContext ctx, EditarTurmaRequest req) =>
        {
            if (!AutorizacaoHelper.Autorizado(ctx, TipoAcesso.Diretor)) return AutorizacaoHelper.NaoAutorizado();
            var (ok, msg) = escola.EditarTurma(req.Atual ?? "", req.Novo ?? "");
            return ApiResults.Json(new { ok, mensagem = msg });
        });

        app.MapPut("/api/diretor/notas-faltas", (HttpContext ctx, NotasFaltasRequest req) =>
        {
            if (!AutorizacaoHelper.Autorizado(ctx, TipoAcesso.Diretor)) return AutorizacaoHelper.NaoAutorizado();
            var (ok, msg) = escola.EditarNotasFaltas(req.NomeAluno ?? "", req.Nota, req.Faltas);
            return ApiResults.Json(new { ok, mensagem = msg });
        });

        app.MapGet("/api/diretor/professores", (HttpContext ctx) =>
        {
            if (!AutorizacaoHelper.Autorizado(ctx, TipoAcesso.Diretor)) return AutorizacaoHelper.NaoAutorizado();
            return ApiResults.Json(new { ok = true, professores = escola.ListarNomesProfessores(), turmas = escola.ListarNomesTurmas() });
        });
    }
}
