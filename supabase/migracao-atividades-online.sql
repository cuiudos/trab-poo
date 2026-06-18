-- Sistema de atividades online — execute no SQL Editor do Supabase

-- Banco de questões reutilizável
create table if not exists public.questoes (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid not null references public.perfis (id) on delete cascade,
  escola_id uuid not null references public.escolas (id) on delete cascade,
  disciplina text not null,
  tema text,
  assunto text,
  dificuldade text not null default 'medio' check (dificuldade in ('facil', 'medio', 'dificil')),
  tipo text not null check (tipo in ('multipla_escolha', 'verdadeiro_falso', 'discursiva', 'completar', 'associacao')),
  enunciado text not null,
  opcoes jsonb not null default '{}',
  pontuacao_padrao numeric(6, 2) not null default 1 check (pontuacao_padrao > 0),
  anexo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_questoes_professor on public.questoes (professor_id);
create index if not exists idx_questoes_disciplina on public.questoes (disciplina);

-- Avaliações / atividades online
create table if not exists public.avaliacoes_online (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid not null references public.perfis (id) on delete cascade,
  escola_id uuid not null references public.escolas (id) on delete cascade,
  titulo text not null,
  descricao text,
  instrucoes text,
  tipo text not null default 'questionario' check (tipo in ('lista', 'questionario', 'avaliacao', 'trabalho')),
  nota_maxima numeric(6, 2) not null default 10 check (nota_maxima > 0),
  data_inicio timestamptz,
  data_fim timestamptz,
  tempo_limite_min int check (tempo_limite_min is null or tempo_limite_min > 0),
  max_tentativas int check (max_tentativas is null or max_tentativas > 0),
  regra_nota text not null default 'melhor' check (regra_nota in ('melhor', 'ultima', 'media')),
  status text not null default 'rascunho' check (status in ('rascunho', 'publicada', 'encerrada')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_avaliacoes_professor on public.avaliacoes_online (professor_id);

-- Turmas vinculadas à avaliação
create table if not exists public.avaliacoes_turmas (
  avaliacao_id uuid not null references public.avaliacoes_online (id) on delete cascade,
  turma_id uuid not null references public.turmas (id) on delete cascade,
  primary key (avaliacao_id, turma_id)
);

-- Questões da avaliação (do banco ou personalizadas)
create table if not exists public.avaliacao_questoes (
  id uuid primary key default gen_random_uuid(),
  avaliacao_id uuid not null references public.avaliacoes_online (id) on delete cascade,
  questao_id uuid references public.questoes (id) on delete set null,
  ordem int not null default 0,
  pontuacao numeric(6, 2) not null default 1 check (pontuacao > 0),
  enunciado text not null,
  tipo text not null,
  opcoes jsonb not null default '{}'
);

create index if not exists idx_avaliacao_questoes_av on public.avaliacao_questoes (avaliacao_id);

-- Materiais de apoio (URL do Supabase Storage ou link)
create table if not exists public.avaliacao_materiais (
  id uuid primary key default gen_random_uuid(),
  avaliacao_id uuid not null references public.avaliacoes_online (id) on delete cascade,
  nome text not null,
  url text not null,
  tipo text not null default 'pdf'
);

-- Tentativas dos alunos
create table if not exists public.tentativas_avaliacao (
  id uuid primary key default gen_random_uuid(),
  avaliacao_id uuid not null references public.avaliacoes_online (id) on delete cascade,
  registro_aluno_id uuid not null references public.registros_alunos (id) on delete cascade,
  numero int not null default 1,
  status text not null default 'em_andamento' check (status in ('em_andamento', 'finalizada', 'expirada')),
  nota numeric(6, 2),
  iniciada_em timestamptz not null default now(),
  finalizada_em timestamptz,
  expira_em timestamptz,
  unique (avaliacao_id, registro_aluno_id, numero)
);

create index if not exists idx_tentativas_aluno on public.tentativas_avaliacao (registro_aluno_id);

-- Respostas por tentativa
create table if not exists public.respostas_avaliacao (
  id uuid primary key default gen_random_uuid(),
  tentativa_id uuid not null references public.tentativas_avaliacao (id) on delete cascade,
  avaliacao_questao_id uuid not null references public.avaliacao_questoes (id) on delete cascade,
  resposta jsonb not null default '{}',
  nota_atribuida numeric(6, 2),
  corrigida boolean not null default false,
  feedback text,
  updated_at timestamptz not null default now(),
  unique (tentativa_id, avaliacao_questao_id)
);

-- RLS
alter table public.questoes enable row level security;
alter table public.avaliacoes_online enable row level security;
alter table public.avaliacoes_turmas enable row level security;
alter table public.avaliacao_questoes enable row level security;
alter table public.avaliacao_materiais enable row level security;
alter table public.tentativas_avaliacao enable row level security;
alter table public.respostas_avaliacao enable row level security;

-- Questões: professor dono + diretor da escola
drop policy if exists "questoes_professor_all" on public.questoes;
create policy "questoes_professor_all" on public.questoes
  for all to authenticated using (professor_id = auth.uid()) with check (professor_id = auth.uid());

drop policy if exists "questoes_select_diretor" on public.questoes;
create policy "questoes_select_diretor" on public.questoes
  for select to authenticated using (
    public.meu_papel() = 'diretor' and escola_id = public.minha_escola_id()
  );

-- Avaliações
drop policy if exists "avaliacoes_professor_all" on public.avaliacoes_online;
create policy "avaliacoes_professor_all" on public.avaliacoes_online
  for all to authenticated using (professor_id = auth.uid()) with check (professor_id = auth.uid());

drop policy if exists "avaliacoes_select_aluno" on public.avaliacoes_online;
create policy "avaliacoes_select_aluno" on public.avaliacoes_online
  for select to authenticated using (
    status = 'publicada'
    and exists (
      select 1 from public.avaliacoes_turmas at
      join public.registros_alunos ra on ra.turma_id = at.turma_id
      where at.avaliacao_id = avaliacoes_online.id and ra.perfil_id = auth.uid()
    )
  );

-- Turmas da avaliação
drop policy if exists "av_turmas_professor" on public.avaliacoes_turmas;
create policy "av_turmas_professor" on public.avaliacoes_turmas
  for all to authenticated using (
    exists (select 1 from public.avaliacoes_online a where a.id = avaliacao_id and a.professor_id = auth.uid())
  );

drop policy if exists "av_turmas_select_aluno" on public.avaliacoes_turmas;
create policy "av_turmas_select_aluno" on public.avaliacoes_turmas
  for select to authenticated using (
    exists (
      select 1 from public.registros_alunos ra
      where ra.turma_id = avaliacoes_turmas.turma_id and ra.perfil_id = auth.uid()
    )
  );

-- Questões da avaliação
drop policy if exists "av_questoes_professor" on public.avaliacao_questoes;
create policy "av_questoes_professor" on public.avaliacao_questoes
  for all to authenticated using (
    exists (select 1 from public.avaliacoes_online a where a.id = avaliacao_id and a.professor_id = auth.uid())
  );

drop policy if exists "av_questoes_select_aluno" on public.avaliacao_questoes;
create policy "av_questoes_select_aluno" on public.avaliacao_questoes
  for select to authenticated using (
    exists (
      select 1 from public.avaliacoes_online a
      join public.avaliacoes_turmas at on at.avaliacao_id = a.id
      join public.registros_alunos ra on ra.turma_id = at.turma_id
      where a.id = avaliacao_questoes.avaliacao_id and ra.perfil_id = auth.uid() and a.status = 'publicada'
    )
  );

-- Materiais
drop policy if exists "av_materiais_professor" on public.avaliacao_materiais;
create policy "av_materiais_professor" on public.avaliacao_materiais
  for all to authenticated using (
    exists (select 1 from public.avaliacoes_online a where a.id = avaliacao_id and a.professor_id = auth.uid())
  );

drop policy if exists "av_materiais_select_aluno" on public.avaliacao_materiais;
create policy "av_materiais_select_aluno" on public.avaliacao_materiais
  for select to authenticated using (
    exists (
      select 1 from public.avaliacoes_online a
      join public.avaliacoes_turmas at on at.avaliacao_id = a.id
      join public.registros_alunos ra on ra.turma_id = at.turma_id
      where a.id = avaliacao_materiais.avaliacao_id and ra.perfil_id = auth.uid() and a.status = 'publicada'
    )
  );

-- Tentativas
drop policy if exists "tentativas_aluno_all" on public.tentativas_avaliacao;
create policy "tentativas_aluno_all" on public.tentativas_avaliacao
  for all to authenticated using (
    exists (select 1 from public.registros_alunos ra where ra.id = registro_aluno_id and ra.perfil_id = auth.uid())
  );

drop policy if exists "tentativas_professor_select" on public.tentativas_avaliacao;
create policy "tentativas_professor_select" on public.tentativas_avaliacao
  for select to authenticated using (
    exists (select 1 from public.avaliacoes_online a where a.id = avaliacao_id and a.professor_id = auth.uid())
  );

-- Respostas
drop policy if exists "respostas_aluno_all" on public.respostas_avaliacao;
create policy "respostas_aluno_all" on public.respostas_avaliacao
  for all to authenticated using (
    exists (
      select 1 from public.tentativas_avaliacao t
      join public.registros_alunos ra on ra.id = t.registro_aluno_id
      where t.id = tentativa_id and ra.perfil_id = auth.uid()
    )
  );

drop policy if exists "respostas_professor_select" on public.respostas_avaliacao;
create policy "respostas_professor_select" on public.respostas_avaliacao
  for select to authenticated using (
    exists (
      select 1 from public.tentativas_avaliacao t
      join public.avaliacoes_online a on a.id = t.avaliacao_id
      where t.id = tentativa_id and a.professor_id = auth.uid()
    )
  );

drop policy if exists "respostas_professor_update" on public.respostas_avaliacao;
create policy "respostas_professor_update" on public.respostas_avaliacao
  for update to authenticated using (
    exists (
      select 1 from public.tentativas_avaliacao t
      join public.avaliacoes_online a on a.id = t.avaliacao_id
      where t.id = tentativa_id and a.professor_id = auth.uid()
    )
  );
