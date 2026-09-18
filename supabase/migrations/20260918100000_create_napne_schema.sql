create table if not exists public.profissionais (
  id text primary key,
  nome text not null,
  cpf text not null unique,
  email text not null,
  telefone text not null,
  status text not null default 'Completo',
  criado_em timestamptz not null default now(),
  dados jsonb not null
);

create index if not exists profissionais_nome_idx
  on public.profissionais using btree (nome);

create table if not exists public.alunos (
  id text primary key,
  codigo_escola text not null,
  cpf text null unique,
  nome text not null,
  turma text not null,
  criado_em timestamptz not null default now(),
  dados jsonb not null
);

create index if not exists alunos_nome_idx
  on public.alunos using btree (nome);

alter table public.profissionais enable row level security;
alter table public.alunos enable row level security;

-- Sem políticas públicas: somente o backend com a service role acessa os dados.
