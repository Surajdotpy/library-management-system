ALTER TABLE students
  ALTER COLUMN emergency_contact_name DROP NOT NULL;

ALTER TABLE students
  ALTER COLUMN emergency_contact_phone DROP NOT NULL;

ALTER TABLE students
  ALTER COLUMN emergency_contact_relation DROP NOT NULL;

UPDATE students
SET
  emergency_contact_name = NULLIF(TRIM(emergency_contact_name), ''),
  emergency_contact_phone = NULLIF(TRIM(emergency_contact_phone), ''),
  emergency_contact_relation = NULLIF(TRIM(emergency_contact_relation), '');
