-- Permite professor ver nome/CPF dos alunos da sua turma (necessário para lançar notas)

drop policy if exists "perfis_select_professor" on public.perfis;
create policy "perfis_select_professor" on public.perfis
  for select to authenticated using (
    exists (
      select 1 from public.registros_alunos ra
      join public.turmas t on t.id = ra.turma_id
      where ra.perfil_id = perfis.id and t.professor_id = auth.uid()
    )
  );
