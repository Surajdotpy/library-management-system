UPDATE students
SET
  daily_hours_limit = CASE
    WHEN study_plan = '1_hour' THEN 1
    WHEN study_plan = '2_hours' THEN 2
    WHEN study_plan = '4_hours' THEN 4
    WHEN study_plan = 'unlimited' THEN NULL
    ELSE daily_hours_limit
  END,
  monthly_fee = CASE
    WHEN study_plan = '1_hour' THEN 100
    WHEN study_plan = '2_hours' THEN 250
    WHEN study_plan = '4_hours' THEN 400
    WHEN study_plan = 'unlimited' THEN 600
    ELSE monthly_fee
  END
WHERE study_plan IN ('1_hour', '2_hours', '4_hours', 'unlimited');

ALTER TABLE students
  DROP CONSTRAINT IF EXISTS check_plan_fee;

ALTER TABLE students
  DROP CONSTRAINT IF EXISTS students_study_plan_check;

ALTER TABLE students
  ADD CONSTRAINT students_study_plan_check
  CHECK (
    study_plan IN ('1_hour', '2_hours', '4_hours', 'unlimited')
  );

ALTER TABLE students
  ADD CONSTRAINT check_plan_fee
  CHECK (
    (
      study_plan = '1_hour'
      AND monthly_fee = 100
      AND daily_hours_limit = 1
    ) OR (
      study_plan = '2_hours'
      AND monthly_fee = 250
      AND daily_hours_limit = 2
    ) OR (
      study_plan = '4_hours'
      AND monthly_fee = 400
      AND daily_hours_limit = 4
    ) OR (
      study_plan = 'unlimited'
      AND monthly_fee = 600
      AND daily_hours_limit IS NULL
    )
  );
