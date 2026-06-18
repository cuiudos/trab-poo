-- Permite professor editar e excluir atividades (notas) da própria turma — execute no SQL Editor do Supabase

drop policy if exists "notas_update_professor" on public.notas_disciplinas;
create policy "notas_update_professor" on public.notas_disciplinas
  for update to authenticated using (
    exists (
      select 1 from public.registros_alunos ra
      join public.turmas t on t.id = ra.turma_id
      where ra.id = notas_disciplinas.registro_aluno_id and t.professor_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.registros_alunos ra
      join public.turmas t on t.id = ra.turma_id
      where ra.id = registro_aluno_id and t.professor_id = auth.uid()
    )
  );

drop policy if exists "notas_delete_professor" on public.notas_disciplinas;
create policy "notas_delete_professor" on public.notas_disciplinas
  for delete to authenticated using (
    exists (
      select 1 from public.registros_alunos ra
      join public.turmas t on t.id = ra.turma_id
      where ra.id = notas_disciplinas.registro_aluno_id and t.professor_id = auth.uid()
    )
  );
