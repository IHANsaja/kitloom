-- The unique index on profiles evaluates private.display_name_key() as the role doing the
-- update, so signed-in members must be able to execute it. It is a pure text function
-- (lowercase, strip punctuation); the private schema is still not exposed through the API.
grant execute on function private.display_name_key(text) to authenticated;
