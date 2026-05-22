using System.Text.Json.Serialization;
using Sistema_Gerenciamento_Escolar.Web.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton<PersistenciaEscolar>();
builder.Services.AddSingleton<GerenciadorEscolarService>();
builder.Services.AddDistributedMemoryCache();
builder.Services.AddSession(o =>
{
    o.Cookie.Name = ".Escolar.Session";
    o.IdleTimeout = TimeSpan.FromHours(2);
});

builder.Services.ConfigureHttpJsonOptions(o =>
    o.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));

var app = builder.Build();

var escola = app.Services.GetRequiredService<GerenciadorEscolarService>();
escola.Inicializar();

app.UseDefaultFiles();
app.UseStaticFiles();
app.UseSession();

static bool Autorizado(HttpContext ctx, params TipoAcesso[] perfis)
{
    var p = ctx.Session.GetString("Perfil");
    return p != null && perfis.Any(x => x.ToString().Equals(p, StringComparison.OrdinalIgnoreCase));
}

static IResult NaoAutorizado() => Results.Json(new { ok = false, mensagem = "Acesso negado." }, statusCode: 401);
app.MapPost("/api/auth/login", (HttpContext ctx, LoginRequest req) =>
{
    if (!Enum.TryParse<TipoAcesso>(req.Tipo, true, out var tipo))
        return Results.BadRequest(new { ok = false, mensagem = "Perfil inválido." });

    var resultado = escola.Login(tipo, req.Usuario ?? "", req.Senha ?? "");
    if (!resultado.Sucesso)
        return Results.Json(new { ok = false, mensagem = resultado.Mensagem });

    ctx.Session.SetString("Perfil", tipo.ToString());
    ctx.Session.SetString("Nome", resultado.Credencial!.Nome);
    ctx.Session.SetString("Login", resultado.Credencial.Login);

    return Results.Json(new
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
    return Results.Json(new { ok = true });
});

app.MapGet("/api/auth/me", (HttpContext ctx) =>
{
    var perfil = ctx.Session.GetString("Perfil");
    if (perfil == null) return Results.Json(new { autenticado = false });

    return Results.Json(new
    {
        autenticado = true,
        perfil = perfil.ToLower(),
        nome = ctx.Session.GetString("Nome"),
        login = ctx.Session.GetString("Login")
    });
});

app.MapGet("/api/diretor/turmas", (HttpContext ctx) =>
{
    if (!Autorizado(ctx, TipoAcesso.Diretor)) return NaoAutorizado();
    return Results.Json(new { ok = true, turmas = escola.ListarTurmas() });
});

app.MapPost("/api/diretor/turmas", (HttpContext ctx, NomeRequest req) =>
{
    if (!Autorizado(ctx, TipoAcesso.Diretor)) return NaoAutorizado();
    var (ok, msg) = escola.CadastrarTurma(req.Nome ?? "");
    return Results.Json(new { ok, mensagem = msg });
});

app.MapPost("/api/diretor/alunos", (HttpContext ctx, CadastroAlunoRequest req) =>
{
    if (!Autorizado(ctx, TipoAcesso.Diretor)) return NaoAutorizado();
    var (ok, msg) = escola.CadastrarAluno(req.Nome ?? "", req.Cpf ?? "", req.Turma ?? "",
        req.Usuario, req.Senha);
    return Results.Json(new { ok, mensagem = msg });
});

app.MapPost("/api/diretor/professores", (HttpContext ctx, CadastroProfessorRequest req) =>
{
    if (!Autorizado(ctx, TipoAcesso.Diretor)) return NaoAutorizado();
    var (ok, msg) = escola.CadastrarProfessor(req.Nome ?? "", req.Cpf ?? "", req.Disciplina ?? "",
        req.Usuario, req.Senha);
    return Results.Json(new { ok, mensagem = msg });
});

app.MapPost("/api/diretor/vincular", (HttpContext ctx, VincularRequest req) =>
{
    if (!Autorizado(ctx, TipoAcesso.Diretor)) return NaoAutorizado();
    var (ok, msg) = escola.VincularProfessor(req.Professor ?? "", req.Turma ?? "");
    return Results.Json(new { ok, mensagem = msg });
});

app.MapPut("/api/diretor/turmas", (HttpContext ctx, EditarTurmaRequest req) =>
{
    if (!Autorizado(ctx, TipoAcesso.Diretor)) return NaoAutorizado();
    var (ok, msg) = escola.EditarTurma(req.Atual ?? "", req.Novo ?? "");
    return Results.Json(new { ok, mensagem = msg });
});

app.MapPut("/api/diretor/notas-faltas", (HttpContext ctx, NotasFaltasRequest req) =>
{
    if (!Autorizado(ctx, TipoAcesso.Diretor)) return NaoAutorizado();
    var (ok, msg) = escola.EditarNotasFaltas(req.NomeAluno ?? "", req.Nota, req.Faltas);
    return Results.Json(new { ok, mensagem = msg });
});

app.MapGet("/api/diretor/professores", (HttpContext ctx) =>
{
    if (!Autorizado(ctx, TipoAcesso.Diretor)) return NaoAutorizado();
    return Results.Json(new { ok = true, professores = escola.ListarNomesProfessores(), turmas = escola.ListarNomesTurmas() });
});

app.MapGet("/api/professor/turma", (HttpContext ctx) =>
{
    if (!Autorizado(ctx, TipoAcesso.Professor)) return NaoAutorizado();
    var nome = ctx.Session.GetString("Nome")!;
    var turma = escola.ObterTurmaProfessor(nome);
    if (turma == null)
        return Results.Json(new { ok = false, mensagem = "Sem turma vinculada pelo diretor." });
    return Results.Json(new { ok = true, turma });
});

app.MapPost("/api/professor/nota", (HttpContext ctx, LancamentoRequest req) =>
{
    if (!Autorizado(ctx, TipoAcesso.Professor)) return NaoAutorizado();
    var (ok, msg) = escola.LancarNota(ctx.Session.GetString("Nome")!, req.NomeAluno ?? "", req.Nota ?? 0);
    return Results.Json(new { ok, mensagem = msg });
});

app.MapPost("/api/professor/falta", (HttpContext ctx, LancamentoRequest req) =>
{
    if (!Autorizado(ctx, TipoAcesso.Professor)) return NaoAutorizado();
    var (ok, msg) = escola.LancarFalta(ctx.Session.GetString("Nome")!, req.NomeAluno ?? "");
    return Results.Json(new { ok, mensagem = msg });
});

app.MapGet("/api/aluno/me", (HttpContext ctx) =>
{
    if (!Autorizado(ctx, TipoAcesso.Aluno)) return NaoAutorizado();
    var dados = escola.ObterDadosAluno(ctx.Session.GetString("Nome")!);
    if (dados == null)
        return Results.Json(new { ok = false, mensagem = "Aluno não encontrado em turma." });
    return Results.Json(new { ok = true, aluno = dados, nome = ctx.Session.GetString("Nome") });
});

app.MapFallbackToFile("index.html");

app.Run("http://localhost:5180");

record LoginRequest(string? Tipo, string? Usuario, string? Senha);
record NomeRequest(string? Nome);
record CadastroAlunoRequest(string? Nome, string? Cpf, string? Turma, string? Usuario, string? Senha);
record CadastroProfessorRequest(string? Nome, string? Cpf, string? Disciplina, string? Usuario, string? Senha);
record VincularRequest(string? Professor, string? Turma);
record EditarTurmaRequest(string? Atual, string? Novo);
record NotasFaltasRequest(string? NomeAluno, double? Nota, int? Faltas);
record LancamentoRequest(string? NomeAluno, double? Nota);
