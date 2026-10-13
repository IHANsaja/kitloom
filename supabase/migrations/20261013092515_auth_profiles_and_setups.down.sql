-- Reverses 20261013092515_auth_profiles_and_setups.sql. Deletes all community listings.
drop trigger if exists on_auth_user_created on auth.users;
drop table if exists public.setups;
drop table if exists public.profiles;
drop function if exists public.setups_before_write();
drop function if exists public.handle_new_user();
