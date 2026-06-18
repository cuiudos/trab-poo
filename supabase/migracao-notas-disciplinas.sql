-- Notas por disciplina (0 a 100) com descrição — execute no SQL Editor do Supabase

create table if not exists public.notas_disciplinas (
  id uuid primary key default gen_random_uuid(),
  registro_aluno_id uuid not null references public.registros_alunos (id) on delete cascade,
  disciplina text not null,
  nota numeric(5, 1) not null check (nota >= 0 and nota <= 100),
  descricao text,
  professor_id uuid not null references public.perfis (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists idx_notas_registro on public.notas_disciplinas (registro_aluno_id);
create index if not exists idx_notas_professor on public.notas_disciplinas (professor_id);

alter table public.notas_disciplinas enable row level security;

drop policy if exists "notas_select_aluno" on public.notas_disciplinas;
create policy "notas_select_aluno" on public.notas_disciplinas
  for select to authenticated using (
    exists (
      select 1 from public.registros_alunos ra
      where ra.id = notas_disciplinas.registro_aluno_id and ra.perfil_id = auth.uid()
    )
  );

drop policy if exists "notas_select_professor" on public.notas_disciplinas;
create policy "notas_select_professor" on public.notas_disciplinas
  for select to authenticated using (
    exists (
      select 1 from public.registros_alunos ra
      join public.turmas t on t.id = ra.turma_id
      where ra.id = notas_disciplinas.registro_aluno_id and t.professor_id = auth.uid()
    )
  );

drop policy if exists "notas_select_diretor" on public.notas_disciplinas;
create policy "notas_select_diretor" on public.notas_disciplinas
  for select to authenticated using (
    public.meu_papel() = 'diretor'
    and exists (
      select 1 from public.registros_alunos ra
      join public.turmas t on t.id = ra.turma_id
      where ra.id = notas_disciplinas.registro_aluno_id and t.escola_id = public.minha_escola_id()
    )
  );

drop policy if exists "notas_insert_professor" on public.notas_disciplinas;
create policy "notas_insert_professor" on public.notas_disciplinas
  for insert to authenticated with check (
    professor_id = auth.uid()
    and exists (
      select 1 from public.registros_alunos ra
      join public.turmas t on t.id = ra.turma_id
      where ra.id = registro_aluno_id and t.professor_id = auth.uid()
    )
  );

drop policy if exists "notas_delete_diretor" on public.notas_disciplinas;
create policy "notas_delete_diretor" on public.notas_disciplinas
  for delete to authenticated using (
    public.meu_papel() = 'diretor'
    and exists (
      select 1 from public.registros_alunos ra
      join public.turmas t on t.id = ra.turma_id
      where ra.id = notas_disciplinas.registro_aluno_id and t.escola_id = public.minha_escola_id()
    )
  );
