-- Atividades por turma (professor cria para a turma; notas ficam por aluno) — execute no SQL Editor do Supabase

create table if not exists public.atividades_turma (
  id uuid primary key default gen_random_uuid(),
  turma_id uuid not null references public.turmas (id) on delete cascade,
  disciplina text not null,
  descricao text not null,
  valor_atividade numeric(5, 1) not null check (valor_atividade > 0 and valor_atividade <= 100),
  professor_id uuid not null references public.perfis (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists idx_atividades_turma on public.atividades_turma (turma_id);
create index if not exists idx_atividades_disciplina on public.atividades_turma (turma_id, disciplina);

alter table public.atividades_turma enable row level security;

drop policy if exists "atividades_select_aluno" on public.atividades_turma;
create policy "atividades_select_aluno" on public.atividades_turma
  for select to authenticated using (
    exists (
      select 1 from public.registros_alunos ra
      where ra.turma_id = atividades_turma.turma_id and ra.perfil_id = auth.uid()
    )
  );

drop policy if exists "atividades_select_professor" on public.atividades_turma;
create policy "atividades_select_professor" on public.atividades_turma
  for select to authenticated using (
    exists (
      select 1 from public.turmas t
      where t.id = atividades_turma.turma_id and t.professor_id = auth.uid()
    )
  );

drop policy if exists "atividades_select_diretor" on public.atividades_turma;
create policy "atividades_select_diretor" on public.atividades_turma
  for select to authenticated using (
    public.meu_papel() = 'diretor'
    and exists (
      select 1 from public.turmas t
      where t.id = atividades_turma.turma_id and t.escola_id = public.minha_escola_id()
    )
  );

drop policy if exists "atividades_insert_professor" on public.atividades_turma;
create policy "atividades_insert_professor" on public.atividades_turma
  for insert to authenticated with check (
    professor_id = auth.uid()
    and exists (
      select 1 from public.turmas t
      where t.id = turma_id and t.professor_id = auth.uid()
    )
  );

drop policy if exists "atividades_update_professor" on public.atividades_turma;
create policy "atividades_update_professor" on public.atividades_turma
  for update to authenticated using (
    exists (
      select 1 from public.turmas t
      where t.id = atividades_turma.turma_id and t.professor_id = auth.uid()
    )
  );

drop policy if exists "atividades_delete_professor" on public.atividades_turma;
create policy "atividades_delete_professor" on public.atividades_turma
  for delete to authenticated using (
    exists (
      select 1 from public.turmas t
      where t.id = atividades_turma.turma_id and t.professor_id = auth.uid()
    )
  );

alter table public.notas_disciplinas
  add column if not exists atividade_id uuid references public.atividades_turma (id) on delete cascade;

create unique index if not exists idx_notas_aluno_atividade
  on public.notas_disciplinas (registro_aluno_id, atividade_id)
  where atividade_id is not null;
