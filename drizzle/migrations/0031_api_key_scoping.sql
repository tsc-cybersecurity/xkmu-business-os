-- Migrate api_keys permissions from legacy format to module:action format.
-- All existing rows receive ['*'] for backward compatibility.
-- New keys created via Admin UI will receive explicit scope arrays.
UPDATE api_keys
SET permissions = '["*"]'::jsonb
WHERE permissions IS NULL
   OR (permissions != '["*"]'::jsonb AND permissions::text NOT LIKE '%:%');
