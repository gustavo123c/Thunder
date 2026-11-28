-- Terms of Use acceptance: own rows only, one per version, immutable, explicit consents.

insert into auth.users (id) values
  ('aaaaaaaa-0000-0000-0000-000000000001'),
  ('bbbbbbbb-0000-0000-0000-000000000002');

set role authenticated;
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');

insert into public.terms_acceptances (user_id, terms_version, health_data_consent, age_statement, birth_date)
values ('aaaaaaaa-0000-0000-0000-000000000001', '2026-11-28', true, true, '1990-05-10');
select pg_temp.check(
  (select accepted_at from public.terms_acceptances where terms_version = '2026-11-28') is not null,
  'user records acceptance with a server timestamp');

select pg_temp.expect_error(
  $$insert into public.terms_acceptances (user_id, terms_version, health_data_consent, age_statement, birth_date)
    values ('aaaaaaaa-0000-0000-0000-000000000001', '2026-11-28', true, true, '1990-05-10')$$, '23505');
select pg_temp.check(true, 'one acceptance per user and version');

insert into public.terms_acceptances (user_id, terms_version, health_data_consent, age_statement, birth_date)
values ('aaaaaaaa-0000-0000-0000-000000000001', '2027-01-01', false, true, '1990-05-10');
select pg_temp.check(true, 'terms can be accepted without health data consent');

select pg_temp.expect_error(
  $$insert into public.terms_acceptances (user_id, terms_version, health_data_consent, age_statement)
    values ('bbbbbbbb-0000-0000-0000-000000000002', '2026-11-28', true, true)$$, '42501');
select pg_temp.check(true, 'cannot record acceptance for someone else');

select pg_temp.expect_error(
  $$insert into public.terms_acceptances (user_id, terms_version, health_data_consent, age_statement, accepted_at)
    values ('aaaaaaaa-0000-0000-0000-000000000001', '2027-02-01', true, true, '2020-01-01')$$, '42501');
select pg_temp.check(true, 'acceptance time is set by the server');

select pg_temp.expect_error($$update public.terms_acceptances set terms_version = 'x'$$, '42501');
select pg_temp.check(true, 'acceptances cannot be edited');
select pg_temp.expect_error($$delete from public.terms_acceptances$$, '42501');
select pg_temp.check(true, 'acceptances cannot be deleted by the user');

-- Minimum age 12; 12–17 need a parent or guardian.
select pg_temp.expect_error(
  $$insert into public.terms_acceptances (user_id, terms_version, health_data_consent, age_statement)
    values ('aaaaaaaa-0000-0000-0000-000000000001', '2027-03-01', true, true)$$, '23514');
select pg_temp.check(true, 'birth date is required');
select pg_temp.expect_error(
  format($$insert into public.terms_acceptances (user_id, terms_version, health_data_consent, age_statement, birth_date)
    values ('aaaaaaaa-0000-0000-0000-000000000001', '2027-03-02', true, true, %L)$$,
    current_date - interval '11 years'), '23514');
select pg_temp.check(true, 'under 12 cannot accept');
select pg_temp.expect_error(
  format($$insert into public.terms_acceptances (user_id, terms_version, health_data_consent, age_statement, birth_date)
    values ('aaaaaaaa-0000-0000-0000-000000000001', '2027-03-03', true, true, %L)$$,
    current_date - interval '15 years'), '23514');
select pg_temp.check(true, 'a minor needs guardian name and e-mail');
insert into public.terms_acceptances
  (user_id, terms_version, health_data_consent, age_statement, birth_date, guardian_name, guardian_email)
values ('aaaaaaaa-0000-0000-0000-000000000001', '2027-03-04', true, true,
        current_date - interval '15 years', 'Maria Souza', 'maria@exemplo.com');
select pg_temp.check(true, 'a minor with a guardian can accept');

select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000002');
select pg_temp.check(
  (select count(*) from public.terms_acceptances) = 0,
  'users do not see other users'' acceptances');
