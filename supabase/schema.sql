-- Colégio Jardim das Acácias — schema Supabase (pode rodar mais de uma vez)
-- Execute no SQL Editor do painel Supabase

create extension if not exists "pgcrypto";

do $$ begin
  create type app_role as enum ('diretor', 'professor', 'aluno');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.escolas (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  slug text not null unique,
  created_at timestamptz not null default now()
);

insert into public.escolas (nome, slug)
values ('Colégio Jardim das Acácias', 'jardim-das-acacias')
on conflict (slug) do nothing;

create table if not exists public.perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  escola_id uuid not null references public.escolas (id),
  nome text not null,
  cpf text,
  role app_role not null,
  disciplina text,
  created_at timestamptz not null default now()
);

create table if not exists public.turmas (
  id uuid primary key default gen_random_uuid(),
  escola_id uuid not null references public.escolas (id),
  nome text not null,
  professor_id uuid references public.perfis (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (escola_id, nome)
);

create table if not exists public.registros_alunos (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null unique references public.perfis (id) on delete cascade,
  turma_id uuid not null references public.turmas (id) on delete cascade,
  nota numeric(4, 1) not null default 0 check (nota >= 0 and nota <= 10),
  faltas int not null default 0 check (faltas >= 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_perfis_escola on public.perfis (escola_id);
create index if not exists idx_turmas_escola on public.turmas (escola_id);
create index if not exists idx_registros_turma on public.registros_alunos (turma_id);

create or replace function public.meu_perfil()
returns public.perfis
language sql stable security definer set search_path = public
as $$ select * from public.perfis where id = auth.uid() $$;

create or replace function public.meu_papel()
returns app_role
language sql stable security definer set search_path = public
as $$ select role from public.perfis where id = auth.uid() $$;

create or replace function public.minha_escola_id()
returns uuid
language sql stable security definer set search_path = public
as $$ select escola_id from public.perfis where id = auth.uid() $$;

alter table public.escolas enable row level security;
alter table public.perfis enable row level security;
alter table public.turmas enable row level security;
alter table public.registros_alunos enable row level security;

drop policy if exists "escolas_select" on public.escolas;
create policy "escolas_select" on public.escolas
  for select to authenticated using (id = public.minha_escola_id());

drop policy if exists "perfis_select_own" on public.perfis;
create policy "perfis_select_own" on public.perfis
  for select to authenticated using (id = auth.uid());

drop policy if exists "perfis_select_diretor" on public.perfis;
create policy "perfis_select_diretor" on public.perfis
  for select to authenticated using (
    public.meu_papel() = 'diretor' and escola_id = public.minha_escola_id()
  );

drop policy if exists "perfis_insert_diretor" on public.perfis;
create policy "perfis_insert_diretor" on public.perfis
  for insert to authenticated with check (
    public.meu_papel() = 'diretor' and escola_id = public.minha_escola_id()
  );

drop policy if exists "perfis_update_diretor" on public.perfis;
create policy "perfis_update_diretor" on public.perfis
  for update to authenticated using (
    public.meu_papel() = 'diretor' and escola_id = public.minha_escola_id()
  );

drop policy if exists "turmas_select_escola" on public.turmas;
create policy "turmas_select_escola" on public.turmas
  for select to authenticated using (escola_id = public.minha_escola_id());

drop policy if exists "turmas_insert_diretor" on public.turmas;
create policy "turmas_insert_diretor" on public.turmas
  for insert to authenticated with check (
    public.meu_papel() = 'diretor' and escola_id = public.minha_escola_id()
  );

drop policy if exists "turmas_update_diretor" on public.turmas;
create policy "turmas_update_diretor" on public.turmas
  for update to authenticated using (
    public.meu_papel() = 'diretor' and escola_id = public.minha_escola_id()
  );

drop policy if exists "registros_select_own" on public.registros_alunos;
create policy "registros_select_own" on public.registros_alunos
  for select to authenticated using (perfil_id = auth.uid());

drop policy if exists "registros_select_diretor" on public.registros_alunos;
create policy "registros_select_diretor" on public.registros_alunos
  for select to authenticated using (
    exists (
      select 1 from public.turmas t
      where t.id = registros_alunos.turma_id
        and t.escola_id = public.minha_escola_id()
        and public.meu_papel() = 'diretor'
    )
  );

drop policy if exists "registros_select_professor" on public.registros_alunos;
create policy "registros_select_professor" on public.registros_alunos
  for select to authenticated using (
    exists (
      select 1 from public.turmas t
      where t.id = registros_alunos.turma_id and t.professor_id = auth.uid()
    )
  );

drop policy if exists "registros_insert_diretor" on public.registros_alunos;
create policy "registros_insert_diretor" on public.registros_alunos
  for insert to authenticated with check (
    public.meu_papel() = 'diretor'
    and exists (
      select 1 from public.turmas t
      where t.id = turma_id and t.escola_id = public.minha_escola_id()
    )
  );

drop policy if exists "registros_update_diretor" on public.registros_alunos;
create policy "registros_update_diretor" on public.registros_alunos
  for update to authenticated using (
    public.meu_papel() = 'diretor'
    and exists (
      select 1 from public.turmas t
      where t.id = registros_alunos.turma_id and t.escola_id = public.minha_escola_id()
    )
  );

drop policy if exists "registros_update_professor" on public.registros_alunos;
create policy "registros_update_professor" on public.registros_alunos
  for update to authenticated using (
    exists (
      select 1 from public.turmas t
      where t.id = registros_alunos.turma_id and t.professor_id = auth.uid()
    )
  );

drop policy if exists "perfis_delete_diretor" on public.perfis;
create policy "perfis_delete_diretor" on public.perfis
  for delete to authenticated using (
    public.meu_papel() = 'diretor'
    and escola_id = public.minha_escola_id()
    and id != auth.uid()
  );

drop policy if exists "turmas_delete_diretor" on public.turmas;
create policy "turmas_delete_diretor" on public.turmas
  for delete to authenticated using (
    public.meu_papel() = 'diretor' and escola_id = public.minha_escola_id()
  );

drop policy if exists "registros_delete_diretor" on public.registros_alunos;
create policy "registros_delete_diretor" on public.registros_alunos
  for delete to authenticated using (
    public.meu_papel() = 'diretor'
    and exists (
      select 1 from public.turmas t
      where t.id = registros_alunos.turma_id and t.escola_id = public.minha_escola_id()
    )
  );
