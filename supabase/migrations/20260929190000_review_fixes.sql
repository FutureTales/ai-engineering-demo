-- Fixes from the agentic code review (paso-08).

-- 1. Staff may only change a request's status, not its content or price range.
revoke update on public.requests from authenticated;
grant update (status) on public.requests to authenticated;

-- 2. One source of truth for "is this user staff?": the page gate calls the same
--    check that RLS uses (private.staff_allowlist), instead of an env var.
create or replace function public.am_i_staff()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.is_staff();
$$;
revoke execute on function public.am_i_staff() from public, anon;
grant execute on function public.am_i_staff() to authenticated;
