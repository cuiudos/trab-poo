using Sistema_Gerenciamento_Escolar.Enums;

namespace Sistema_Gerenciamento_Escolar.Web.Helpers;

public static class AutorizacaoHelper
{
    public static bool Autorizado(HttpContext ctx, params TipoAcesso[] perfis)
    {
        var p = ctx.Session.GetString(SessaoKeys.Perfil);
        return p != null && perfis.Any(x => x.ToString().Equals(p, StringComparison.OrdinalIgnoreCase));
    }

    public static IResult NaoAutorizado() =>
        ApiResults.Json(new { ok = false, mensagem = "Acesso negado." }, statusCode: 401);
}
