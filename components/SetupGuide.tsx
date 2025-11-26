import React from 'react';
import { AlertTriangle, Database } from 'lucide-react';

export const SetupGuide: React.FC = () => {
  return (
    <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-6 rounded shadow-sm">
      <div className="flex">
        <div className="flex-shrink-0">
          <AlertTriangle className="h-5 w-5 text-amber-400" aria-hidden="true" />
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-amber-800">Configuração Obrigatória do Banco de Dados (Atualizado)</h3>
          <div className="mt-2 text-sm text-amber-700">
            <p className="mb-2">
              <strong>Atenção:</strong> Se o saldo não está atualizando, rode este script novamente! Ele recria as funções de pagamento.
              Copie e execute no <strong>SQL Editor</strong> do Supabase.
            </p>
            <div className="bg-slate-800 text-slate-100 p-3 rounded text-xs overflow-x-auto font-mono">
              <pre>{`-- 1. Habilitar extensão
create extension if not exists "uuid-ossp";

-- 2. Recriar tabela de Perfis se não existir
create table if not exists public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  is_member boolean default false,
  credits numeric default 0.00,
  member_code text,
  membership_expires_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Tabelas Auxiliares
create table if not exists public.coupons (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  type text check (type in ('standard', 'premium')),
  cost_credits numeric default 0,
  cost_monetary numeric default 0,
  value_real numeric not null,
  image_url text,
  created_at timestamp with time zone default now()
);

create table if not exists public.user_coupons (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id),
  coupon_id uuid references public.coupons(id),
  code text not null,
  status text default 'active' check (status in ('active', 'used')),
  created_at timestamp with time zone default now()
);

create table if not exists public.transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id),
  amount numeric not null,
  type text check (type in ('membership_fee', 'credit_usage', 'premium_purchase')),
  description text,
  created_at timestamp with time zone default now()
);

-- 4. Trigger de Cadastro
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email, is_member, credits)
  values (new.id, new.email, false, 0.00)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 5. RLS (Segurança)
alter table public.profiles enable row level security;
alter table public.user_coupons enable row level security;
alter table public.transactions enable row level security;
alter table public.coupons enable row level security;

-- Limpar politicas antigas para evitar duplicidade
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can view own coupons" on public.user_coupons;
drop policy if exists "Users can insert own coupons" on public.user_coupons;

create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can view own coupons" on public.user_coupons for select using (auth.uid() = user_id);
create policy "Users can insert own coupons" on public.user_coupons for insert with check (auth.uid() = user_id);
create policy "Users can view own transactions" on public.transactions for select using (auth.uid() = user_id);
create policy "Anyone can view coupons" on public.coupons for select using (true);

-- 6. DADOS DE EXEMPLO
insert into public.coupons (title, description, type, cost_credits, value_real, image_url) values
('Café Expresso', 'Válido na Padaria Central.', 'standard', 1.00, 6.50, 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=400&q=80'),
('Cinema 50% OFF', 'Válido para qualquer sessão 2D.', 'standard', 2.00, 25.00, 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=400&q=80'),
('Jantar Completo', 'Menu degustação no Bistro Vue.', 'premium', 0, 150.00, 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=400&q=80')
ON CONFLICT DO NOTHING;

-- 7. FUNÇÕES BLINDADAS (RPC) - DROP E CREATE PARA GARANTIR ATUALIZAÇÃO

DROP FUNCTION IF EXISTS public.buy_coupon;
create or replace function public.buy_coupon(
  p_user_id uuid,
  p_coupon_id uuid,
  p_cost numeric
) returns json as $$
declare
  v_current_credits numeric;
  v_coupon_code text;
begin
  select credits into v_current_credits from public.profiles where id = p_user_id;
  
  if v_current_credits is null then return json_build_object('success', false, 'message', 'Perfil não encontrado'); end if;
  if v_current_credits < p_cost then return json_build_object('success', false, 'message', 'Saldo insuficiente'); end if;

  update public.profiles set credits = credits - p_cost where id = p_user_id;
  v_coupon_code := substring(md5(random()::text), 1, 8);

  insert into public.user_coupons (user_id, coupon_id, code, status)
  values (p_user_id, p_coupon_id, upper(v_coupon_code), 'active');

  insert into public.transactions (user_id, amount, type, description)
  values (p_user_id, -p_cost, 'credit_usage', 'Resgate de Cupom');

  return json_build_object('success', true, 'message', 'Cupom resgatado!');
exception when others then
  return json_build_object('success', false, 'message', SQLERRM);
end;
$$ language plpgsql security definer;

DROP FUNCTION IF EXISTS public.activate_membership;
create or replace function public.activate_membership(
  p_user_id uuid,
  p_amount numeric,
  p_description text
) returns json as $$
declare
  v_member_code text;
  v_expires_at timestamp with time zone;
begin
  v_member_code := substring(md5(random()::text), 1, 8);
  v_expires_at := now() + interval '1 year';

  update public.profiles 
  set 
    is_member = true,
    credits = coalesce(credits, 0) + p_amount,
    membership_expires_at = v_expires_at,
    member_code = upper(v_member_code)
  where id = p_user_id;

  insert into public.transactions (user_id, amount, type, description)
  values (p_user_id, p_amount, 'membership_fee', p_description);

  return json_build_object('success', true, 'message', 'Assinatura ativada!');
exception when others then
  return json_build_object('success', false, 'message', SQLERRM);
end;
$$ language plpgsql security definer;
`}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};