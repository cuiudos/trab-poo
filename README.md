# Sistema de Gerenciamento Escolar — Colégio Jardim das Acácias

Projeto acadêmico de **Programação Orientada a Objetos em C#** — gestão de turmas, notas, frequência e login por perfil (Diretor, Professor, Aluno).

**Documentação completa (PDF):** entregue via Canvas pelo grupo (descrição, arquitetura, diagramas e padrões de projeto).

## Dois sistemas complementares

O repositório contém **duas implementações** do mesmo domínio escolar. Elas **não compartilham** banco de dados.

| | **Console C#** (entrega POO) | **Portal web** (extensão) |
|---|------------------------------|---------------------------|
| **Pasta** | `Sistema_Gerenciamento_Escolar/` | `public/` + `api/` |
| **Linguagem** | C# (.NET 9) | JavaScript (Node.js na Vercel) |
| **Persistência** | Arquivo local `usuarios.xml` | PostgreSQL no **Supabase** |
| **Autenticação** | Login/senha no XML | Supabase Auth (senha criptografada) |
| **Como rodar** | `dotnet run` | https://trab-poo.vercel.app/ |
| **Papel no trabalho** | Demonstra POO, herança, polimorfismo | Demonstração online com banco real |

O **console** grava turmas, notas e usuários em memória durante a execução e sincroniza logins no `usuarios.xml`.  
A **web** persiste tudo no Supabase (tabelas `perfis`, `turmas`, `notas_disciplinas`, etc.) — ver [SUPABASE.md](./SUPABASE.md).

Os dados **não são sincronizados** automaticamente entre console e web.

## Requisitos

- [.NET SDK 9.0](https://dotnet.microsoft.com/download)

## Compilar

```powershell
cd Sistema_Gerenciamento_Escolar
dotnet build
```

## Executar (entrega principal — console)

```powershell
cd Sistema_Gerenciamento_Escolar
dotnet run
```

Dados persistidos em `usuarios.xml` (mesma pasta do projeto).

### Funcionalidades do console

| Perfil | O que pode fazer |
|--------|------------------|
| **Diretor** | CRUD completo: turmas, alunos e professores (cadastrar, editar, **excluir**, vincular professor à turma, listar) |
| **Professor** | Lançar notas e faltas, visualizar turma vinculada |
| **Aluno** | Visualizar painel e boletim |

O terminal limpa a tela a cada menu/ação para exibir somente a etapa atual.

### Logins de teste (console)

| Perfil | Login | Senha |
|--------|-------|-------|
| Diretor | `diretor1` | `diretor123` |
| Professor | `professor2` | `profesor23` |
| Aluno | `alunos123` | `alunos123` |
| Aluno | `gustavin12` | `1234` |

## Estrutura do projeto C#

| Pasta | Conteúdo |
|-------|----------|
| `Models/` | Entidades: `Aluno`, `Professor`, `Diretor`, `Boletim`, `Turma`, etc. |
| `Interfaces/` | `IPerfilEscolar` (contrato dos perfis) |
| `Services/` | `ServicoAutenticacaoXml` (persistência e login) |
| `Helpers/` | `ValidadorCpf`, `ConsoleTerminal` (limpeza de tela no terminal integrado) |
| `Enums/` | `TipoAcesso` |
| `Results/` | `ResultadoAutenticacao` |

### Pilares da POO no código

| Pilar | Implementação |
|-------|----------------|
| **Encapsulamento** | `PessoaEscolar` (campos privados, getters/setters), `Boletim` |
| **Herança** | `Aluno`, `Professor`, `Diretor` → `PessoaEscolar` |
| **Abstração** | Classe abstrata `PessoaEscolar` + interface `IPerfilEscolar` |
| **Polimorfismo** | `ObterResumo()` e `ExibirPainel()` com `override` em cada perfil; uso via `IPerfilEscolar` em `Program.cs` |

## Extensão web (demonstração em produção)

Portal **separado** do console C# — usa Supabase, não `usuarios.xml`:

**URL:** https://trab-poo.vercel.app/

| Perfil | Usuário | Senha |
|--------|---------|-------|
| Diretor | `diretor1` | `diretor123` |
| Professor | `professor2` | `profesor23` |
| Aluno | `alunos123` | `alunos123` |

- Frontend + API: `public/` e `api/` (Vercel)
- Banco: `supabase/` — ver [SUPABASE.md](./SUPABASE.md)
- Bibliotecas externas (web): `@supabase/supabase-js` — referenciadas no PDF do grupo

## Membros

Álvaro Gonçalves de Carvalho, Danton Rodrigues Diniz, Eduardo Nobre de Oliveira Lino, Gustavo Almeida Reis, Matheus Augusto Alves Goveia Damião e Pedro Henrique Alves Emerick.
