-- Execute no SQL Editor do Supabase (se excluir turma/usuário der erro de permissão)

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
