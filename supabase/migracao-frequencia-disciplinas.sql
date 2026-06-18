-- Frequência por disciplina (25% faltas máx. por lei) — execute no SQL Editor do Supabase

create table if not exists public.aulas_disciplinas (
  id uuid primary key default gen_random_uuid(),
  turma_id uuid not null references public.turmas (id) on delete cascade,
  disciplina text not null,
  total_aulas int not null check (total_aulas > 0),
  professor_id uuid not null references public.perfis (id) on delete cascade,
  updated_at timestamptz not null default now(),
  unique (turma_id, disciplina)
);

create table if not exists public.faltas_disciplinas (
  id uuid primary key default gen_random_uuid(),
  registro_aluno_id uuid not null references public.registros_alunos (id) on delete cascade,
  disciplina text not null,
  faltas int not null default 0 check (faltas >= 0),
  professor_id uuid not null references public.perfis (id) on delete cascade,
  updated_at timestamptz not null default now(),
  unique (registro_aluno_id, disciplina)
);

create index if not exists idx_aulas_turma on public.aulas_disciplinas (turma_id);
create index if not exists idx_faltas_registro on public.faltas_disciplinas (registro_aluno_id);

alter table public.aulas_disciplinas enable row level security;
alter table public.faltas_disciplinas enable row level security;

drop policy if exists "aulas_select_aluno" on public.aulas_disciplinas;
create policy "aulas_select_aluno" on public.aulas_disciplinas
  for select to authenticated using (
    exists (
      select 1 from public.registros_alunos ra
      where ra.turma_id = aulas_disciplinas.turma_id and ra.perfil_id = auth.uid()
    )
  );

drop policy if exists "aulas_select_professor" on public.aulas_disciplinas;
create policy "aulas_select_professor" on public.aulas_disciplinas
  for select to authenticated using (
    exists (
      select 1 from public.turmas t
      where t.id = aulas_disciplinas.turma_id and t.professor_id = auth.uid()
    )
  );

drop policy if exists "aulas_select_diretor" on public.aulas_disciplinas;
create policy "aulas_select_diretor" on public.aulas_disciplinas
  for select to authenticated using (
    public.meu_papel() = 'diretor'
    and exists (
      select 1 from public.turmas t
      where t.id = aulas_disciplinas.turma_id and t.escola_id = public.minha_escola_id()
    )
  );

drop policy if exists "aulas_upsert_professor" on public.aulas_disciplinas;
create policy "aulas_insert_professor" on public.aulas_disciplinas
  for insert to authenticated with check (
    professor_id = auth.uid()
    and exists (
      select 1 from public.turmas t
      where t.id = turma_id and t.professor_id = auth.uid()
    )
  );

drop policy if exists "aulas_update_professor" on public.aulas_disciplinas;
create policy "aulas_update_professor" on public.aulas_disciplinas
  for update to authenticated using (
    professor_id = auth.uid()
    and exists (
      select 1 from public.turmas t
      where t.id = aulas_disciplinas.turma_id and t.professor_id = auth.uid()
    )
  );

drop policy if exists "faltas_select_aluno" on public.faltas_disciplinas;
create policy "faltas_select_aluno" on public.faltas_disciplinas
  for select to authenticated using (
    exists (
      select 1 from public.registros_alunos ra
      where ra.id = faltas_disciplinas.registro_aluno_id and ra.perfil_id = auth.uid()
    )
  );

drop policy if exists "faltas_select_professor" on public.faltas_disciplinas;
create policy "faltas_select_professor" on public.faltas_disciplinas
  for select to authenticated using (
    exists (
      select 1 from public.registros_alunos ra
      join public.turmas t on t.id = ra.turma_id
      where ra.id = faltas_disciplinas.registro_aluno_id and t.professor_id = auth.uid()
    )
  );

drop policy if exists "faltas_select_diretor" on public.faltas_disciplinas;
create policy "faltas_select_diretor" on public.faltas_disciplinas
  for select to authenticated using (
    public.meu_papel() = 'diretor'
    and exists (
      select 1 from public.registros_alunos ra
      join public.turmas t on t.id = ra.turma_id
      where ra.id = faltas_disciplinas.registro_aluno_id and t.escola_id = public.minha_escola_id()
    )
  );

drop policy if exists "faltas_insert_professor" on public.faltas_disciplinas;
create policy "faltas_insert_professor" on public.faltas_disciplinas
  for insert to authenticated with check (
    professor_id = auth.uid()
    and exists (
      select 1 from public.registros_alunos ra
      join public.turmas t on t.id = ra.turma_id
      where ra.id = registro_aluno_id and t.professor_id = auth.uid()
    )
  );

drop policy if exists "faltas_update_professor" on public.faltas_disciplinas;
create policy "faltas_update_professor" on public.faltas_disciplinas
  for update to authenticated using (
    professor_id = auth.uid()
    and exists (
      select 1 from public.registros_alunos ra
      join public.turmas t on t.id = ra.turma_id
      where ra.id = faltas_disciplinas.registro_aluno_id and t.professor_id = auth.uid()
    )
  );
