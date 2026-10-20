-- Every new auth user gets a reader profile. Promote the owner by hand (see docs/runbook/owner-account.md).
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, role) values (new.id, 'reader') on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
