using Sistema_Gerenciamento_Escolar.Enums;
using Sistema_Gerenciamento_Escolar.Web.DTOs;
using Sistema_Gerenciamento_Escolar.Web.Helpers;
using Sistema_Gerenciamento_Escolar.Web.Services;

namespace Sistema_Gerenciamento_Escolar.Web.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this WebApplication app)
    {
        var escola = app.Services.GetRequiredService<GerenciadorEscolarService>();

        app.MapGet("/api/env", () =>
        {
            var url = Environment.GetEnvironmentVariable("SUPABASE_URL")?.Trim();
            var anonKey = Environment.GetEnvironmentVariable("SUPABASE_ANON_KEY")?.Trim();

            if (string.IsNullOrEmpty(url) || string.IsNullOrEmpty(anonKey))
            {
                return ApiResults.Json(new
                {
                    ok = false,
                    mensagem = "Configure SUPABASE_URL e SUPABASE_ANON_KEY nas variáveis de ambiente do sistema."
                }, statusCode: 500);
            }

            return ApiResults.Json(new { ok = true, url, anonKey });
        });

        app.MapPost("/api/auth/login", (HttpContext ctx, LoginRequest req) =>
        {
            if (!Enum.TryParse<TipoAcesso>(req.Tipo, true, out var tipo))
                return ApiResults.BadRequest(new { ok = false, mensagem = "Perfil inválido." });

            var resultado = escola.Login(tipo, req.Usuario ?? "", req.Senha ?? "");
            if (!resultado.Sucesso)
                return ApiResults.Json(new { ok = false, mensagem = resultado.Mensagem });

            ctx.Session.SetString(SessaoKeys.Perfil, tipo.ToString());
            ctx.Session.SetString(SessaoKeys.Nome, resultado.Credencial!.Nome);
            ctx.Session.SetString(SessaoKeys.Login, resultado.Credencial.Login);

            return ApiResults.Json(new
            {
                ok = true,
                mensagem = resultado.Mensagem,
                perfil = tipo.ToString().ToLower(),
                nome = resultado.Credencial.Nome
            });
        });

        app.MapPost("/api/auth/logout", (HttpContext ctx) =>
        {
            ctx.Session.Clear();
            return ApiResults.Json(new { ok = true });
        });

        app.MapGet("/api/auth/me", (HttpContext ctx) =>
        {
            var perfil = ctx.Session.GetString(SessaoKeys.Perfil);
            if (perfil == null) return ApiResults.Json(new { autenticado = false });

            return ApiResults.Json(new
            {
                autenticado = true,
                perfil = perfil.ToLower(),
                nome = ctx.Session.GetString(SessaoKeys.Nome),
                login = ctx.Session.GetString(SessaoKeys.Login)
            });
        });
    }
}
