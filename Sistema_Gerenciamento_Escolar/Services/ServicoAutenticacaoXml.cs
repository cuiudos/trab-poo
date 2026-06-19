using System.Xml.Linq;
using Sistema_Gerenciamento_Escolar.Enums;
using Sistema_Gerenciamento_Escolar.Helpers;
using Sistema_Gerenciamento_Escolar.Results;

namespace Sistema_Gerenciamento_Escolar.Services;

public class ServicoAutenticacaoXml
{
    private const string NomeArquivo = "usuarios.xml";
    private XDocument _documento = new();
    private string _caminhoArquivo = "";

    public void Carregar()
    {
        if (!TentarCarregar(out string mensagemErro))
            throw new InvalidOperationException(mensagemErro);
    }

    public bool TentarCarregar(out string mensagemErro)
    {
        mensagemErro = "";

        try
        {
            _caminhoArquivo = ResolverCaminhoArquivo();

            if (!File.Exists(_caminhoArquivo))
            {
                mensagemErro = $"Arquivo {NomeArquivo} não encontrado.";
                return false;
            }

            _documento = XDocument.Load(_caminhoArquivo);
            return true;
        }
        catch (System.Xml.XmlException ex)
        {
            mensagemErro = $"Arquivo {NomeArquivo} inválido ou corrompido: {ex.Message}";
            return false;
        }
        catch (IOException ex)
        {
            mensagemErro = $"Erro ao ler {NomeArquivo}: {ex.Message}";
            return false;
        }
        catch (UnauthorizedAccessException ex)
        {
            mensagemErro = $"Sem permissão para ler {NomeArquivo}: {ex.Message}";
            return false;
        }
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
                Turma = aluno.Element("Turma")?.Value,
                Matricula = aluno.Element("Matricula")?.Value,
                ResponsavelNome = aluno.Element("Responsavel")?.Element("Nome")?.Value,
                ResponsavelTelefone = aluno.Element("Responsavel")?.Element("Telefone")?.Value
            };
        }
    }

    public ResultadoAutenticacao Autenticar(TipoAcesso tipo, string usuario, string senha)
    {
        try
        {
            usuario = usuario.Trim();
            senha = senha.Trim();

            if (string.IsNullOrEmpty(usuario) || string.IsNullOrEmpty(senha))
                return Falha("Usuário e senha são obrigatórios.");

            if (_documento.Root == null)
                return Falha("Arquivo de usuários não foi carregado corretamente.");

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
        catch (Exception ex)
        {
            return Falha($"Erro ao autenticar: {ex.Message}");
        }
    }

    public void SalvarNovoProfessor(string nome, string cpf, string disciplina, string usuario, string senha)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(usuario) || string.IsNullOrWhiteSpace(senha))
            {
                Console.WriteLine("Usuário e senha de login são obrigatórios.");
                return;
            }

            if (!ValidadorCpf.TentarNormalizar(cpf, out string cpfNormalizado, out string erroCpf))
            {
                Console.WriteLine(erroCpf);
                return;
            }

            if (CpfExisteNoXml(cpfNormalizado))
            {
                Console.WriteLine("CPF já cadastrado no sistema.");
                return;
            }

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
                new XElement("Cpf", cpfNormalizado),
                new XElement("Disciplina", disciplina)));

            if (!TentarPersistir(out string erro))
            {
                Console.WriteLine(erro);
                return;
            }

            Console.WriteLine("Credenciais do professor salvas em usuarios.xml.");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Erro ao salvar professor: {ex.Message}");
        }
    }

    public void SalvarNovoAluno(string nome, string cpf, string turma, string matricula,
        string responsavelNome, string responsavelTelefone, string usuario, string senha)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(usuario) || string.IsNullOrWhiteSpace(senha))
            {
                Console.WriteLine("Usuário e senha de login são obrigatórios.");
                return;
            }

            if (!ValidadorCpf.TentarNormalizar(cpf, out string cpfNormalizado, out string erroCpf))
            {
                Console.WriteLine(erroCpf);
                return;
            }

            if (CpfExisteNoXml(cpfNormalizado))
            {
                Console.WriteLine("CPF já cadastrado no sistema.");
                return;
            }

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
                new XElement("Cpf", cpfNormalizado),
                new XElement("Matricula", matricula.Trim()),
                new XElement("Turma", turma),
                new XElement("Responsavel",
                    new XElement("Nome", responsavelNome),
                    new XElement("Telefone", responsavelTelefone))));

            if (!TentarPersistir(out string erro))
            {
                Console.WriteLine(erro);
                return;
            }

            Console.WriteLine("Credenciais do aluno salvas em usuarios.xml.");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Erro ao salvar aluno: {ex.Message}");
        }
    }

    public bool RemoverAlunoDoXml(string nomeOuLogin)
    {
        try
        {
            var container = _documento.Root?.Element("Alunos");
            if (container == null)
                return false;

            var aluno = container.Elements("Aluno").FirstOrDefault(a =>
                LoginIgual(a, nomeOuLogin) ||
                string.Equals(a.Element("Nome")?.Value, nomeOuLogin, StringComparison.OrdinalIgnoreCase));

            if (aluno == null)
                return false;

            aluno.Remove();

            if (!TentarPersistir(out string erro))
            {
                Console.WriteLine(erro);
                return false;
            }

            Console.WriteLine("Aluno removido de usuarios.xml.");
            return true;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Erro ao remover aluno do XML: {ex.Message}");
            return false;
        }
    }

    public bool RemoverProfessorDoXml(string nomeOuLogin)
    {
        try
        {
            var container = _documento.Root?.Element("Professores");
            if (container == null)
                return false;

            var professor = container.Elements("Professor").FirstOrDefault(p =>
                LoginIgual(p, nomeOuLogin) ||
                string.Equals(p.Element("Nome")?.Value, nomeOuLogin, StringComparison.OrdinalIgnoreCase));

            if (professor == null)
                return false;

            professor.Remove();

            if (!TentarPersistir(out string erro))
            {
                Console.WriteLine(erro);
                return false;
            }

            Console.WriteLine("Professor removido de usuarios.xml.");
            return true;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Erro ao remover professor do XML: {ex.Message}");
            return false;
        }
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
        if (!TentarPersistir(out string erro))
            throw new InvalidOperationException(erro);
    }

    private bool TentarPersistir(out string mensagemErro)
    {
        mensagemErro = "";

        try
        {
            if (string.IsNullOrEmpty(_caminhoArquivo))
            {
                mensagemErro = "Caminho do arquivo de usuários não definido.";
                return false;
            }

            _documento.Save(_caminhoArquivo);
            SincronizarCopiaBin();

            return TentarCarregar(out mensagemErro);
        }
        catch (IOException ex)
        {
            mensagemErro = $"Erro ao salvar {NomeArquivo}: {ex.Message}";
            return false;
        }
        catch (UnauthorizedAccessException ex)
        {
            mensagemErro = $"Sem permissão para salvar {NomeArquivo}: {ex.Message}";
            return false;
        }
        catch (System.Xml.XmlException ex)
        {
            mensagemErro = $"Erro ao gravar XML: {ex.Message}";
            return false;
        }
    }

    private static string ResolverCaminhoArquivo()
    {
        string caminhoProjeto = Path.Combine(Directory.GetCurrentDirectory(), NomeArquivo);
        string caminhoBin = Path.Combine(AppContext.BaseDirectory, NomeArquivo);

        if (File.Exists(caminhoProjeto))
            return caminhoProjeto;

        if (File.Exists(caminhoBin))
            return caminhoBin;

        return caminhoProjeto;
    }

    private void SincronizarCopiaBin()
    {
        string caminhoBin = Path.Combine(AppContext.BaseDirectory, NomeArquivo);
        if (string.Equals(_caminhoArquivo, caminhoBin, StringComparison.OrdinalIgnoreCase))
            return;

        if (!File.Exists(_caminhoArquivo))
            return;

        try
        {
            Directory.CreateDirectory(AppContext.BaseDirectory);
            File.Copy(_caminhoArquivo, caminhoBin, overwrite: true);
        }
        catch (IOException ex)
        {
            Console.WriteLine($"Aviso: não foi possível sincronizar cópia em bin: {ex.Message}");
        }
    }

    private static bool LoginIgual(XElement elemento, string usuario) =>
        string.Equals((string?)elemento.Attribute("login"), usuario, StringComparison.OrdinalIgnoreCase);

    private static bool SenhaIgual(XElement elemento, string senha) =>
        (string?)elemento.Attribute("senha") == senha;

    private bool CpfExisteNoXml(string cpf)
    {
        var raiz = _documento.Root;
        if (raiz == null)
            return false;

        var cpfDiretor = raiz.Element("Diretor")?.Element("Usuario")?.Element("Cpf")?.Value;
        if (cpfDiretor == cpf)
            return true;

        foreach (var prof in raiz.Element("Professores")?.Elements("Professor") ?? Enumerable.Empty<XElement>())
        {
            if (prof.Element("Cpf")?.Value == cpf)
                return true;
        }

        foreach (var aluno in raiz.Element("Alunos")?.Elements("Aluno") ?? Enumerable.Empty<XElement>())
        {
            if (aluno.Element("Cpf")?.Value == cpf)
                return true;
        }

        return false;
    }

    private static ResultadoAutenticacao Falha(string mensagem) =>
        new() { Sucesso = false, Mensagem = mensagem };
}
