-- Corrige CPFs com mais de 11 dígitos (ex.: UUID colado por engano).
-- Execute no SQL Editor do Supabase e revise antes de confirmar.

-- Ver usuários com CPF inválido:
select id, nome, cpf, length(regexp_replace(cpf, '\D', '', 'g')) as digitos
from public.perfis
where cpf is not null
  and length(regexp_replace(cpf, '\D', '', 'g')) <> 11;

-- Exemplo: corrigir Eduardo (substitua pelos 11 números corretos):
-- update public.perfis
-- set cpf = '33333333333'
-- where nome ilike '%Eduardo%';
