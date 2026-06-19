# Sistema de Gerenciamento Escolar — Colégio Jardim das Acácias

Projeto acadêmico de **Programação Orientada a Objetos em C#** — gestão de turmas, notas, frequência e login por perfil (Diretor, Professor, Aluno).

**Documentação completa (PDF):** entregue via Canvas pelo grupo (descrição, arquitetura, diagramas e padrões de projeto).

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
| `Helpers/` | `ValidadorCpf` |
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

Portal complementar (não substitui a entrega C#):

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
