-- Script 003: Crear tabla de planes de usuario
-- DDL idempotente para implementar sistema de planes STARTER vs PRO por usuario
-- Patrón: Multi-tenant por user_id + RLS (auth.uid() = user_id)

-- Crear tabla si no existe
create table if not exists user_plans (
  user_id uuid primary key,
  plan text not null check (plan in ('STARTER', 'PRO')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Habilitar RLS
alter table user_plans enable row level security;

-- Policy: cada usuario puede ver su propio plan
drop policy if exists "users_can_view_own_plan" on user_plans;
create policy "users_can_view_own_plan" on user_plans
  for select using (auth.uid() = user_id);

-- Policy: usuarios pueden insertar su propio plan (para upgrade/downgrade)
drop policy if exists "users_can_insert_own_plan" on user_plans;
create policy "users_can_insert_own_plan" on user_plans
  for insert with check (auth.uid() = user_id);

-- Policy: usuarios pueden actualizar su propio plan
drop policy if exists "users_can_update_own_plan" on user_plans;
create policy "users_can_update_own_plan" on user_plans
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Policy: usuarios pueden eliminar su propio plan (revertir a default PRO)
drop policy if exists "users_can_delete_own_plan" on user_plans;
create policy "users_can_delete_own_plan" on user_plans
  for delete using (auth.uid() = user_id);

-- Trigger para actualizar updated_at automáticamente
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_user_plans_updated_at on user_plans;
create trigger update_user_plans_updated_at
  before update on user_plans
  for each row execute function update_updated_at_column();

-- Comentario para documentar el propósito
comment on table user_plans is 'Almacena el plan (STARTER/PRO) por usuario. Default PRO si no existe fila.';
comment on column user_plans.user_id is 'PK - UUID del usuario (relación con auth.users)';
comment on column user_plans.plan is 'STARTER: solo dominios core. PRO: todos los módulos incluyendo analytics';