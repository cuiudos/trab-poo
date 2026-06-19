-- Matrícula e responsável do aluno — execute no SQL Editor do Supabase

alter table public.registros_alunos
  add column if not exists matricula text,
  add column if not exists responsavel_nome text,
  add column if not exists responsavel_telefone text;

create unique index if not exists idx_registros_matricula_escola
  on public.registros_alunos (matricula)
  where matricula is not null and matricula <> '';
