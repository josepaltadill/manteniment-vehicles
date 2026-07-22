insert into validation.concurrency_barrier (session_id) values ('b');
do $$
declare deadline timestamptz := clock_timestamp() + interval '10 seconds';
begin
  while (select count(*) from validation.concurrency_barrier) < 2 loop
    if clock_timestamp() >= deadline then
      raise exception 'concurrency barrier timed out';
    end if;
    perform pg_sleep(0.05);
  end loop;
end;
$$;
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a2', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
do $$
begin
  begin
    delete from public.fam_miembros_hogar
    where household_id = '10000000-0000-0000-0000-00000000000a'
      and user_id = '00000000-0000-0000-0000-0000000000a2';
    raise notice 'CASE|concurrency.session-b|delete-or-23514|delete|PASS';
  exception when check_violation then
    raise notice 'CASE|concurrency.session-b|delete-or-23514|23514|PASS';
  end;
end;
$$;
commit;
