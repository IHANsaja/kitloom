-- Reverts 20261015092000_profile_name_key_grant.sql.
revoke execute on function private.display_name_key(text) from authenticated;
