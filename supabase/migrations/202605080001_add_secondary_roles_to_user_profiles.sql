ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS secondary_roles JSONB DEFAULT '[]';

UPDATE user_profiles
SET secondary_roles = '[]'::jsonb
WHERE secondary_roles IS NULL;
