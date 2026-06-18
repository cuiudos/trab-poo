using System.Text.Json.Serialization;
using Sistema_Gerenciamento_Escolar.Web.Endpoints;
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

app.MapAuthEndpoints();
app.MapDiretorEndpoints();
app.MapProfessorEndpoints();
app.MapAlunoEndpoints();

app.MapFallbackToFile("index.html");

app.Run("http://localhost:5180");
