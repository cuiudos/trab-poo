using System.Xml.Linq;
using Sistema_Gerenciamento_Escolar.Enums;
using Sistema_Gerenciamento_Escolar.Results;

namespace Sistema_Gerenciamento_Escolar.Services;

public class ServicoAutenticacaoXml
{
    private const string NomeArquivo = "usuarios.xml";
    private XDocument _documento = new();
    private string _caminhoArquivo = "";

    public void Carregar()
    {
        _caminhoArquivo = Path.Combine(AppContext.BaseDirectory, NomeArquivo);

        if (!File.Exists(_caminhoArquivo))
        {
            string caminhoProjeto = Path.Combine(Directory.GetCurrentDirectory(), NomeArquivo);
            if (File.Exists(caminhoProjeto))
                _caminhoArquivo = caminhoProjeto;
        }

        if (!File.Exists(_caminhoArquivo))
            throw new FileNotFoundException($"Arquivo {NomeArquivo} não encontrado.", _caminhoArquivo);

        _documento = XDocument.Load(_caminhoArquivo);
    }

    public CredencialUsuario? ObterDiretor()
    {
        var elemento = _documento.Root?
            .Element("Diretor")?
            .Element("Usuario");

        if (elemento == null)
            return null;

        return new CredencialUsuario
        {
            Login = (string?)elemento.Attribute("login") ?? "",
            Nome = elemento.Element("Nome")?.Value ?? "",
            Cpf = elemento.Element("Cpf")?.Value ?? ""
        };
    }

    public IEnumerable<CredencialUsuario> ObterProfessoresXml()
    {
        var professores = _documento.Root?.Element("Professores")?.Elements("Professor");
        if (professores == null)
            yield break;

        foreach (var prof in professores)
        {
            yield return new CredencialUsuario
            {
                Login = (string?)prof.Attribute("login") ?? "",
                Nome = prof.Element("Nome")?.Value ?? "",
                Cpf = prof.Element("Cpf")?.Value ?? "",
                Disciplina = prof.Element("Disciplina")?.Value
            };
        }
    }

    public IEnumerable<CredencialUsuario> ObterAlunosXml()
    {
        var alunos = _documento.Root?.Element("Alunos")?.Elements("Aluno");
        if (alunos == null)
            yield break;

        foreach (var aluno in alunos)
        {
            yield return new CredencialUsuario
            {
                Login = (string?)aluno.Attribute("login") ?? "",
                Nome = aluno.Element("Nome")?.Value ?? "",
                Cpf = aluno.Element("Cpf")?.Value ?? "",
                Turma = aluno.Element("Turma")?.Value
            };
        }
    }

    public ResultadoAutenticacao Autenticar(TipoAcesso tipo, string usuario, string senha)
    {
        usuario = usuario.Trim();
        senha = senha.Trim();

        if (string.IsNullOrEmpty(usuario) || string.IsNullOrEmpty(senha))
            return Falha("Usuário e senha são obrigatórios.");

        XElement? elemento = tipo switch
        {
            TipoAcesso.Diretor => _documento.Root?
                .Element("Diretor")?
                .Elements("Usuario")
                .FirstOrDefault(u => LoginIgual(u, usuario) && SenhaIgual(u, senha)),

            TipoAcesso.Professor => _documento.Root?
                .Element("Professores")?
                .Elements("Professor")
                .FirstOrDefault(u => LoginIgual(u, usuario) && SenhaIgual(u, senha)),

            TipoAcesso.Aluno => _documento.Root?
                .Element("Alunos")?
                .Elements("Aluno")
                .FirstOrDefault(u => LoginIgual(u, usuario) && SenhaIgual(u, senha)),

            _ => null
        };

        if (elemento == null)
            return Falha("Usuário ou senha incorretos.");

        var credencial = new CredencialUsuario
        {
            Login = (string?)elemento.Attribute("login") ?? usuario,
            Nome = elemento.Element("Nome")?.Value ?? "",
            Cpf = elemento.Element("Cpf")?.Value ?? "",
            Disciplina = elemento.Element("Disciplina")?.Value,
            Turma = elemento.Element("Turma")?.Value
        };

        return new ResultadoAutenticacao
        {
            Sucesso = true,
            Mensagem = $"Login realizado com sucesso. Bem-vindo(a), {credencial.Nome}!",
            Credencial = credencial
        };
    }

    public void SalvarNovoProfessor(string nome, string cpf, string disciplina, string usuario, string senha)
    {
        var raiz = ObterOuCriarRaiz();
        var container = raiz.Element("Professores") ?? new XElement("Professores");
        if (container.Parent == null)
            raiz.Add(container);

        if (container.Elements("Professor").Any(p => LoginIgual(p, usuario)))
        {
            Console.WriteLine("Usuário de login já existe no XML.");
            return;
        }

        container.Add(new XElement("Professor",
            new XAttribute("login", usuario),
            new XAttribute("senha", senha),
            new XElement("Nome", nome),
            new XElement("Cpf", cpf),
            new XElement("Disciplina", disciplina)));

        Persistir();
        Console.WriteLine("Credenciais do professor salvas em usuarios.xml.");
    }

    public void SalvarNovoAluno(string nome, string cpf, string turma, string usuario, string senha)
    {
        var raiz = ObterOuCriarRaiz();
        var container = raiz.Element("Alunos") ?? new XElement("Alunos");
        if (container.Parent == null)
            raiz.Add(container);

        if (container.Elements("Aluno").Any(a => LoginIgual(a, usuario)))
        {
            Console.WriteLine("Usuário de login já existe no XML.");
            return;
        }

        container.Add(new XElement("Aluno",
            new XAttribute("login", usuario),
            new XAttribute("senha", senha),
            new XElement("Nome", nome),
            new XElement("Cpf", cpf),
            new XElement("Turma", turma)));

        Persistir();
        Console.WriteLine("Credenciais do aluno salvas em usuarios.xml.");
    }

    private XElement ObterOuCriarRaiz()
    {
        if (_documento.Root == null)
        {
            _documento = new XDocument(
                new XDeclaration("1.0", "utf-8", "yes"),
                new XElement("SistemaGerenciamentoEscolar"));
        }
        return _documento.Root!;
    }

    private void Persistir()
    {
        _documento.Save(_caminhoArquivo);
        Carregar();
    }

    private static bool LoginIgual(XElement elemento, string usuario) =>
        string.Equals((string?)elemento.Attribute("login"), usuario, StringComparison.OrdinalIgnoreCase);

    private static bool SenhaIgual(XElement elemento, string senha) =>
        (string?)elemento.Attribute("senha") == senha;

    private static ResultadoAutenticacao Falha(string mensagem) =>
        new() { Sucesso = false, Mensagem = mensagem };
}
