using Sistema_Gerenciamento_Escolar.Enums;
using Sistema_Gerenciamento_Escolar.Helpers;
using Sistema_Gerenciamento_Escolar.Models;
using Sistema_Gerenciamento_Escolar.Results;
using Sistema_Gerenciamento_Escolar.Services;

class Program
{
    static void Main()
    {
        try
        {
            var autenticacao = new ServicoAutenticacaoXml();

            if (!autenticacao.TentarCarregar(out string erroCarregar))
            {
                Console.WriteLine(erroCarregar);
                return;
            }

            var credencialDiretor = autenticacao.ObterDiretor();
            if (credencialDiretor == null)
            {
                Console.WriteLine("Nenhum diretor cadastrado no arquivo usuarios.xml.");
                return;
            }

            Diretor diretor = new Diretor(credencialDiretor.Nome, credencialDiretor.Cpf);
            InicializarDadosExemplo(diretor, autenticacao);

            Console.WriteLine($"\nInstituição: {diretor.Instituicao.Nome}");

            int funcao;

            do
            {
                try
                {
                    Console.WriteLine("\n=== Sistema de Gerenciamento Escolar ===");
                    Console.WriteLine("Qual seu perfil de acesso?");
                    Console.WriteLine("1 - Diretor");
                    Console.WriteLine("2 - Professor");
                    Console.WriteLine("3 - Aluno");
                    Console.WriteLine("4 - Sair");
                    Console.Write("\nOpção: ");

                    if (!int.TryParse(Console.ReadLine(), out funcao))
                    {
                        Console.WriteLine("Opção inválida.");
                        continue;
                    }

                    switch (funcao)
                    {
                        case 1:
                            MenuDiretor(diretor, autenticacao);
                            break;
                        case 2:
                            MenuProfessor(diretor, autenticacao);
                            break;
                        case 3:
                            MenuAluno(diretor, autenticacao);
                            break;
                        case 4:
                            Console.WriteLine("Encerrando o sistema...");
                            break;
                        default:
                            Console.WriteLine("Opção inválida.");
                            break;
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Erro durante a operação: {ex.Message}");
                    funcao = 0;
                }

            } while (funcao != 4);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Erro fatal ao iniciar o sistema: {ex.Message}");
        }
    }

    static bool RealizarLogin(ServicoAutenticacaoXml autenticacao, TipoAcesso tipo, out ResultadoAutenticacao? resultado)
    {
        resultado = null;

        try
        {
            Console.WriteLine("\n--- Login (credenciais em usuarios.xml) ---");
            Console.Write("Usuário: ");
            string usuario = Console.ReadLine() ?? "";
            Console.Write("Senha: ");
            string senha = Console.ReadLine() ?? "";

            resultado = autenticacao.Autenticar(tipo, usuario, senha);

            if (!resultado.Sucesso)
            {
                Console.WriteLine(resultado.Mensagem);
                return false;
            }

            Console.WriteLine(resultado.Mensagem);
            return true;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Erro no login: {ex.Message}");
            return false;
        }
    }

    static void MenuDiretor(Diretor diretor, ServicoAutenticacaoXml autenticacao)
    {
        if (!RealizarLogin(autenticacao, TipoAcesso.Diretor, out _))
            return;

        int opcao;

        do
        {
            Console.WriteLine("\n--- Menu Diretor (acesso completo) ---");
            Console.WriteLine("1 - Cadastrar Turma");
            Console.WriteLine("2 - Cadastrar Aluno");
            Console.WriteLine("3 - Cadastrar Professor");
            Console.WriteLine("4 - Vincular turma ao Professor");
            Console.WriteLine("5 - Visualizar todas as turmas e dados");
            Console.WriteLine("6 - Editar nome da turma");
            Console.WriteLine("7 - Editar dados do aluno");
            Console.WriteLine("8 - Editar notas/faltas do aluno");
            Console.WriteLine("9 - Editar dados do professor");
            Console.WriteLine("10 - Sair");
            Console.Write("\nOpção: ");

            if (!int.TryParse(Console.ReadLine(), out opcao))
            {
                Console.WriteLine("Opção inválida.");
                continue;
            }

            string nome, cpf, turma;

            switch (opcao)
            {
                case 1:
                    try
                    {
                        Console.Write("Nome da turma: ");
                        string nomeTurma = Console.ReadLine() ?? "";
                        diretor.CadastrarTurmma(nomeTurma);
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Erro ao cadastrar turma: {ex.Message}");
                    }
                    break;

                case 2:
                    try
                    {
                        Console.Write("Nome do aluno: ");
                        nome = Console.ReadLine() ?? "";
                        cpf = LerCpf("CPF do aluno (11 números): ");
                        Console.Write("Matrícula: ");
                        string matricula = Console.ReadLine() ?? "";
                        Console.Write("Nome do responsável: ");
                        string responsavelNome = Console.ReadLine() ?? "";
                        Console.Write("Telefone do responsável: ");
                        string responsavelTelefone = Console.ReadLine() ?? "";
                        Console.Write("Turma: ");
                        turma = Console.ReadLine() ?? "";
                        Console.Write("Usuário de login: ");
                        string usuarioAluno = Console.ReadLine() ?? "";
                        Console.Write("Senha de login: ");
                        string senhaAluno = Console.ReadLine() ?? "";

                        if (string.IsNullOrWhiteSpace(usuarioAluno) || string.IsNullOrWhiteSpace(senhaAluno))
                        {
                            Console.WriteLine("Usuário e senha são obrigatórios para salvar no usuarios.xml.");
                            break;
                        }

                        var responsavel = new Responsavel(responsavelNome, responsavelTelefone);
                        var usuario = new Usuario(usuarioAluno);

                        if (diretor.CadastrarAluno(nome, cpf, turma, matricula, responsavel, usuario))
                            autenticacao.SalvarNovoAluno(nome, cpf, turma, matricula, responsavelNome,
                                responsavelTelefone, usuarioAluno, senhaAluno);
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Erro ao cadastrar aluno: {ex.Message}");
                    }
                    break;

                case 3:
                    try
                    {
                        Console.Write("Nome do professor: ");
                        nome = Console.ReadLine() ?? "";
                        cpf = LerCpf("CPF do professor (11 números): ");
                        Console.Write("Disciplina: ");
                        string disciplina = Console.ReadLine() ?? "";
                        Console.Write("Usuário de login: ");
                        string usuarioProf = Console.ReadLine() ?? "";
                        Console.Write("Senha de login: ");
                        string senhaProf = Console.ReadLine() ?? "";

                        if (string.IsNullOrWhiteSpace(usuarioProf) || string.IsNullOrWhiteSpace(senhaProf))
                        {
                            Console.WriteLine("Usuário e senha são obrigatórios para salvar no usuarios.xml.");
                            break;
                        }

                        if (diretor.CadastrarProfessor(nome, cpf, disciplina))
                            autenticacao.SalvarNovoProfessor(nome, cpf, disciplina, usuarioProf, senhaProf);
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Erro ao cadastrar professor: {ex.Message}");
                    }
                    break;

                case 4:
                    Console.Write("Nome do professor: ");
                    nome = Console.ReadLine() ?? "";
                    Console.Write("Turma: ");
                    turma = Console.ReadLine() ?? "";

                    bool encontrado = false;
                    foreach (Professor professor in diretor.Professores)
                    {
                        if (nome == professor.GetNome())
                        {
                            diretor.VincularProfessorTurma(professor, turma);
                            encontrado = true;
                            break;
                        }
                    }
                    if (!encontrado)
                        Console.WriteLine("Professor não encontrado!");
                    break;

                case 5:
                    diretor.ListarTodasTurmas();
                    break;

                case 6:
                    Console.Write("Nome atual da turma: ");
                    string turmaAtual = Console.ReadLine() ?? "";
                    Console.Write("Novo nome da turma: ");
                    string turmaNova = Console.ReadLine() ?? "";
                    diretor.EditarNomeTurma(turmaAtual, turmaNova);
                    break;

                case 7:
                    Console.Write("Nome atual do aluno: ");
                    string alunoAtual = Console.ReadLine() ?? "";
                    Console.Write("Novo nome: ");
                    string alunoNovo = Console.ReadLine() ?? "";
                    string cpfNovo = LerCpf("Novo CPF (11 números): ");
                    Console.Write("Nova turma: ");
                    string turmaAluno = Console.ReadLine() ?? "";
                    diretor.EditarAluno(alunoAtual, alunoNovo, cpfNovo, turmaAluno);
                    break;

                case 8:
                    Console.Write("Nome do aluno: ");
                    alunoAtual = Console.ReadLine() ?? "";
                    Console.Write("Nova nota (Enter para manter): ");
                    string entradaNota = Console.ReadLine();
                    Console.Write("Novas faltas (Enter para manter): ");
                    string entradaFaltas = Console.ReadLine();

                    double? notaEdit = double.TryParse(entradaNota, out double n) ? n : null;
                    int? faltasEdit = int.TryParse(entradaFaltas, out int f) ? f : null;
                    diretor.EditarNotasFaltasAluno(alunoAtual, notaEdit, faltasEdit);
                    break;

                case 9:
                    Console.Write("Nome atual do professor: ");
                    string profAtual = Console.ReadLine() ?? "";
                    Console.Write("Novo nome: ");
                    string profNovo = Console.ReadLine() ?? "";
                    string cpfProf = LerCpf("Novo CPF (11 números): ");
                    Console.Write("Nova disciplina: ");
                    string discNova = Console.ReadLine() ?? "";
                    diretor.EditarProfessor(profAtual, profNovo, cpfProf, discNova);
                    break;

                case 10:
                    break;

                default:
                    Console.WriteLine("Opção inválida.");
                    break;
            }

        } while (opcao != 10);
    }

    static void MenuProfessor(Diretor diretor, ServicoAutenticacaoXml autenticacao)
    {
        if (!RealizarLogin(autenticacao, TipoAcesso.Professor, out ResultadoAutenticacao? login))
            return;

        Professor? professorLogado = null;

        foreach (Professor professor in diretor.Professores)
        {
            if (professor.GetNome() == login!.Credencial!.Nome)
            {
                professorLogado = professor;
                break;
            }
        }

        if (professorLogado == null)
        {
            Console.WriteLine("Professor autenticado, mas ainda não cadastrado pelo diretor.");
            return;
        }

        if (professorLogado.Turma == null)
        {
            Console.WriteLine("Você ainda não possui turma vinculada pelo diretor. Acesso negado.");
            return;
        }

        int opcao;

        do
        {
            Console.WriteLine($"\n--- Menu Professor (turma: {professorLogado.Turma.Nome}) ---");
            Console.WriteLine("1 - Lançar Nota");
            Console.WriteLine("2 - Lançar Falta");
            Console.WriteLine("3 - Visualizar minha turma");
            Console.WriteLine("4 - Sair");
            Console.Write("\nOpção: ");

            if (!int.TryParse(Console.ReadLine(), out opcao))
            {
                Console.WriteLine("Opção inválida.");
                continue;
            }

            switch (opcao)
            {
                case 1:
                    Console.Write("Nome do aluno: ");
                    string nomeAluno = Console.ReadLine() ?? "";
                    Console.Write("Nota: ");
                    if (double.TryParse(Console.ReadLine(), out double nota))
                        professorLogado.LancarNota(nomeAluno, nota);
                    else
                        Console.WriteLine("Nota inválida.");
                    break;

                case 2:
                    Console.Write("Nome do aluno: ");
                    nomeAluno = Console.ReadLine() ?? "";
                    professorLogado.RegistrarFalta(nomeAluno);
                    break;

                case 3:
                    professorLogado.VisualizarTurma();
                    break;

                case 4:
                    break;

                default:
                    Console.WriteLine("Opção inválida.");
                    break;
            }

        } while (opcao != 4);
    }

    static void MenuAluno(Diretor diretor, ServicoAutenticacaoXml autenticacao)
    {
        if (!RealizarLogin(autenticacao, TipoAcesso.Aluno, out ResultadoAutenticacao? login))
            return;

        Aluno? alunoLogado = null;

        foreach (Turma turma in diretor.Turmas)
        {
            foreach (Aluno aluno in turma.Alunos)
            {
                if (aluno.GetNome() == login!.Credencial!.Nome)
                {
                    alunoLogado = aluno;
                    break;
                }
            }
            if (alunoLogado != null)
                break;
        }

        if (alunoLogado == null)
        {
            Console.WriteLine("Aluno autenticado no XML, mas ainda não cadastrado em uma turma pelo diretor.");
            return;
        }

        Console.WriteLine("\n--- Suas informações (somente leitura) ---");
        Console.WriteLine($"Instituição: {diretor.Instituicao.Nome}");
        Console.WriteLine($"Nome: {alunoLogado.GetNome()}");
        Console.WriteLine($"CPF: {alunoLogado.GetCPF()}");
        Console.WriteLine($"Matrícula: {alunoLogado.Matricula}");
        Console.WriteLine($"Usuário: {alunoLogado.UsuarioLogin?.Login ?? login!.Credencial!.Login}");
        Console.WriteLine($"Responsável: {alunoLogado.Responsavel.Nome} ({alunoLogado.Responsavel.Telefone})");
        alunoLogado.VisualizarBoletim(diretor.Instituicao.Nome);
        Console.WriteLine("\nPressione Enter para voltar...");
        Console.ReadLine();
    }

    static void InicializarDadosExemplo(Diretor diretor, ServicoAutenticacaoXml autenticacao)
    {
        try
        {
            if (diretor.Turmas.Count > 0)
                return;

            diretor.CadastrarTurmma("3º Ano A");

            foreach (var profXml in autenticacao.ObterProfessoresXml())
            {
                if (profXml.Disciplina != null &&
                    !diretor.Professores.Any(p => p.GetNome() == profXml.Nome))
                {
                    diretor.CadastrarProfessor(profXml.Nome, profXml.Cpf, profXml.Disciplina);
                }
            }

            if (diretor.Professores.Count > 0)
                diretor.VincularProfessorTurma(diretor.Professores[0], "3º Ano A");

            foreach (var alunoXml in autenticacao.ObterAlunosXml())
            {
                if (!string.IsNullOrEmpty(alunoXml.Turma))
                {
                    var responsavel = new Responsavel(
                        alunoXml.ResponsavelNome ?? "",
                        alunoXml.ResponsavelTelefone ?? "");
                    var usuario = string.IsNullOrWhiteSpace(alunoXml.Login)
                        ? null
                        : new Usuario(alunoXml.Login);

                    diretor.CadastrarAluno(
                        alunoXml.Nome,
                        alunoXml.Cpf,
                        alunoXml.Turma,
                        alunoXml.Matricula ?? $"MAT-{alunoXml.Cpf[^4..]}",
                        responsavel,
                        usuario);
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Erro ao carregar dados iniciais: {ex.Message}");
        }
    }

    static string LerCpf(string rotulo)
    {
        while (true)
        {
            Console.Write(rotulo);
            string entrada = Console.ReadLine() ?? "";

            if (ValidadorCpf.TentarNormalizar(entrada, out string cpf, out string erro))
                return cpf;

            Console.WriteLine(erro);
        }
    }
}
