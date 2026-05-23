-- Rode no SQL Editor se quiser conferir se a escola existe
select * from public.escolas;

-- Se estiver vazio, insira manualmente:
insert into public.escolas (nome, slug)
values ('Colégio Jardim das Acácias', 'jardim-das-acacias')
on conflict (slug) do nothing;

select * from public.escolas;
