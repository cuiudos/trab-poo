using Sistema_Gerenciamento_Escolar.Enums;
using Sistema_Gerenciamento_Escolar.Models;
using Sistema_Gerenciamento_Escolar.Results;
using Sistema_Gerenciamento_Escolar.Services;
using Sistema_Gerenciamento_Escolar.Web.DTOs;

namespace Sistema_Gerenciamento_Escolar.Web.Services;

public class GerenciadorEscolarService
{
    private readonly PersistenciaEscolar _persistencia;
    private readonly ServicoAutenticacaoXml _autenticacao = new();
    private Diretor? _diretor;

    public GerenciadorEscolarService(PersistenciaEscolar persistencia)
    {
        _persistencia = persistencia;
    }

    public void Inicializar()
    {
        _autenticacao.Carregar();
        var cred = _autenticacao.ObterDiretor()
            ?? throw new InvalidOperationException("Nenhum diretor em usuarios.xml.");

        _diretor = new Diretor(cred.Nome, cred.Cpf);

        var salvo = _persistencia.Carregar();
        if (salvo != null)
            RestaurarDados(salvo);
        else
            InicializarDadosExemplo();
    }

    private Diretor Diretor =>
        _diretor ?? throw new InvalidOperationException("Sistema não inicializado.");

    public ServicoAutenticacaoXml Autenticacao => _autenticacao;

    public ResultadoAutenticacao Login(TipoAcesso tipo, string usuario, string senha) =>
        _autenticacao.Autenticar(tipo, usuario, senha);

    public List<TurmaDto> ListarTurmas() =>
        Diretor.Turmas.Select(TurmaParaDto).ToList();

    public TurmaDto? ObterTurmaProfessor(string nomeProfessor)
    {
        var prof = Diretor.BuscarProfessor(nomeProfessor);
        if (prof?.Turma == null) return null;
        return TurmaParaDto(prof.Turma);
    }

    public AlunoDto? ObterDadosAluno(string nomeAluno)
    {
        foreach (var turma in Diretor.Turmas)
        {
            foreach (var aluno in turma.Alunos)
            {
                if (aluno.GetNome() == nomeAluno)
                    return AlunoParaDto(aluno);
            }
        }
        return null;
    }

    public (bool Ok, string Mensagem) CadastrarTurma(string nome)
    {
        if (string.IsNullOrWhiteSpace(nome))
            return (false, "Nome da turma é obrigatório.");
        if (Diretor.BuscarTurma(nome) != null)
            return (false, "Turma já existe.");

        Diretor.CadastrarTurmma(nome.Trim());
        Persistir();
        return (true, "Turma cadastrada!");
    }

    public (bool Ok, string Mensagem) CadastrarAluno(string nome, string cpf, string turma,
        string? usuario, string? senha)
    {
        if (Diretor.BuscarTurma(turma) == null)
            return (false, "Turma não encontrada.");

        var responsavel = new Responsavel("", "");
        var usuarioLogin = string.IsNullOrWhiteSpace(usuario) ? null : new Usuario(usuario);

        if (!Diretor.CadastrarAluno(nome, cpf, turma, null, responsavel, usuarioLogin, out var matriculaGerada))
            return (false, "Não foi possível cadastrar o aluno.");

        if (!string.IsNullOrWhiteSpace(usuario) && !string.IsNullOrWhiteSpace(senha))
            _autenticacao.SalvarNovoAluno(nome, cpf, turma, matriculaGerada, "", "", usuario, senha);

        Persistir();
        return (true, "Aluno cadastrado!");
    }

    public (bool Ok, string Mensagem) CadastrarProfessor(string nome, string cpf, string disciplina,
        string? usuario, string? senha)
    {
        Diretor.CadastrarProfessor(nome, cpf, disciplina);
        if (!string.IsNullOrWhiteSpace(usuario) && !string.IsNullOrWhiteSpace(senha))
            _autenticacao.SalvarNovoProfessor(nome, cpf, disciplina, usuario, senha);

        Persistir();
        return (true, "Professor cadastrado!");
    }

    public (bool Ok, string Mensagem) VincularProfessor(string nomeProfessor, string turma)
    {
        var prof = Diretor.BuscarProfessor(nomeProfessor);
        if (prof == null) return (false, "Professor não encontrado.");
        if (Diretor.BuscarTurma(turma) == null) return (false, "Turma não encontrada.");

        Diretor.VincularProfessorTurma(prof, turma);
        Persistir();
        return (true, "Professor vinculado à turma!");
    }

    public (bool Ok, string Mensagem) EditarTurma(string atual, string novo)
    {
        if (Diretor.BuscarTurma(atual) == null) return (false, "Turma não encontrada.");
        Diretor.EditarNomeTurma(atual, novo);
        Persistir();
        return (true, "Turma atualizada!");
    }

    public (bool Ok, string Mensagem) EditarNotasFaltas(string nomeAluno, double? nota, int? faltas)
    {
        bool achou = false;
        foreach (var turma in Diretor.Turmas)
        {
            foreach (var aluno in turma.Alunos)
            {
                if (aluno.GetNome() == nomeAluno)
                {
                    if (nota.HasValue) aluno.Nota = nota.Value;
                    if (faltas.HasValue) aluno.Faltas = faltas.Value;
                    achou = true;
                    break;
                }
            }
        }
        if (!achou) return (false, "Aluno não encontrado.");
        Persistir();
        return (true, "Dados atualizados!");
    }

    public (bool Ok, string Mensagem) LancarNota(string nomeProfessor, string nomeAluno, double nota)
    {
        var prof = Diretor.BuscarProfessor(nomeProfessor);
        if (prof?.Turma == null) return (false, "Professor sem turma vinculada.");

        prof.LancarNota(nomeAluno, nota);
        Persistir();
        return (true, "Nota lançada!");
    }

    public (bool Ok, string Mensagem) LancarFalta(string nomeProfessor, string nomeAluno)
    {
        var prof = Diretor.BuscarProfessor(nomeProfessor);
        if (prof?.Turma == null) return (false, "Professor sem turma vinculada.");

        prof.RegistrarFalta(nomeAluno);
        Persistir();
        return (true, "Falta registrada!");
    }

    public List<string> ListarNomesProfessores() =>
        Diretor.Professores.Select(p => p.GetNome()).ToList();

    public List<string> ListarNomesTurmas() =>
        Diretor.Turmas.Select(t => t.Nome).ToList();

    private void InicializarDadosExemplo()
    {
        if (Diretor.Turmas.Count > 0) return;

        Diretor.CadastrarTurmma("3º Ano A");

        foreach (var profXml in _autenticacao.ObterProfessoresXml())
        {
            if (profXml.Disciplina != null &&
                Diretor.Professores.All(p => p.GetNome() != profXml.Nome))
                Diretor.CadastrarProfessor(profXml.Nome, profXml.Cpf, profXml.Disciplina);
        }

        if (Diretor.Professores.Count > 0)
            Diretor.VincularProfessorTurma(Diretor.Professores[0], "3º Ano A");

        foreach (var alunoXml in _autenticacao.ObterAlunosXml())
        {
            if (!string.IsNullOrEmpty(alunoXml.Turma))
            {
                var responsavel = new Responsavel(
                    alunoXml.ResponsavelNome ?? "",
                    alunoXml.ResponsavelTelefone ?? "");
                var usuario = string.IsNullOrWhiteSpace(alunoXml.Login) ? null : new Usuario(alunoXml.Login);
                Diretor.CadastrarAluno(alunoXml.Nome, alunoXml.Cpf, alunoXml.Turma, alunoXml.Matricula,
                    responsavel, usuario, out _);
            }
        }

        Persistir();
    }

    private void RestaurarDados(DadosEscolaDto dto)
    {
        foreach (var p in dto.Professores)
            if (Diretor.BuscarProfessor(p.Nome) == null)
                Diretor.CadastrarProfessor(p.Nome, p.Cpf, p.Disciplina);

        foreach (var t in dto.Turmas)
        {
            if (Diretor.BuscarTurma(t.Nome) == null)
                Diretor.CadastrarTurmma(t.Nome);

            var turma = Diretor.BuscarTurma(t.Nome)!;

            if (!string.IsNullOrEmpty(t.ProfessorNome))
            {
                var prof = Diretor.BuscarProfessor(t.ProfessorNome);
                if (prof != null)
                    Diretor.VincularProfessorTurma(prof, t.Nome);
            }

            foreach (var a in t.Alunos)
            {
                var turmaRef = Diretor.BuscarTurma(t.Nome)!;
                if (!turmaRef.Alunos.Any(x => x.GetNome() == a.Nome))
                {
                    Diretor.CadastrarAluno(a.Nome, a.Cpf, t.Nome, null, new Responsavel("", ""), null, out _);
                }

                var aluno = turmaRef.Alunos.First(x => x.GetNome() == a.Nome);
                aluno.Nota = a.Nota;
                aluno.Faltas = a.Faltas;
            }
        }
    }

    private void Persistir()
    {
        var dto = new DadosEscolaDto
        {
            Turmas = Diretor.Turmas.Select(TurmaParaDto).ToList(),
            Professores = Diretor.Professores.Select(p => new ProfessorDto
            {
                Nome = p.GetNome(),
                Cpf = p.GetCPF(),
                Disciplina = p.Disciplina,
                TurmaNome = p.Turma?.Nome
            }).ToList()
        };
        _persistencia.Salvar(dto);
    }

    private static TurmaDto TurmaParaDto(Turma turma) => new()
    {
        Nome = turma.Nome,
        ProfessorNome = turma.professor?.GetNome(),
        Alunos = turma.Alunos.Select(AlunoParaDto).ToList()
    };

    private static AlunoDto AlunoParaDto(Aluno aluno) => new()
    {
        Nome = aluno.GetNome(),
        Cpf = aluno.GetCPF(),
        Nota = aluno.Nota,
        Faltas = aluno.Faltas
    };
}
