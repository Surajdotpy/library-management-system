# Student Plan And Form Guide

This guide is for changing student plans and student form fields without needing
to understand the whole project at once.

If you feel lost, start with this simple rule:

1. Frontend shows the form and sends data.
2. Backend validates the data and prepares values to save.
3. Database stores the final values and enforces safety rules.

For most student-related changes, you only need to think about those 3 layers.

Line numbers below are correct for the current version of the repo. If they
move later, use `Ctrl + F` with the exact function or field name.

## 1. The Main Connection

When you add or edit a student, the data flows like this:

1. The student form is shown in the desktop app.
2. The frontend builds a request object.
3. The backend controller checks whether the request is valid.
4. The backend service calculates values like fee and daily hour limit.
5. PostgreSQL stores the student row.

For study plans, the key flow is:

1. The frontend plan list comes from `desktop-app/src/types/student.types.ts`.
2. The selected plan is sent to the backend.
3. The backend plan rules come from `backend/src/modules/students/study-plans.ts`.
4. The backend saves:
   - `study_plan`
   - `monthly_fee`
   - `daily_hours_limit`
5. The database allows only valid combinations through constraints.

## 2. The Most Important Files

These are the main files you need to remember.

### Study plans

- `backend/src/modules/students/study-plans.ts`
  - Current important lines:
    - line 1: `STUDY_PLAN_VALUES`
    - line 8: `StudyPlan`
    - line 10: `STUDY_PLAN_CONFIG`
  - This is the backend source of truth for plans, fees, and hour limits.

- `desktop-app/src/types/student.types.ts`
  - Current important lines:
    - line 1: frontend `StudyPlan` type
    - line 100: `STUDY_PLANS`
  - This is the frontend source of truth for plan labels, prices, and options shown in the app.

- `backend/src/modules/students/students.controller.ts`
  - Current important lines:
    - line 12: `VALID_STUDY_PLANS`
    - line 155: `createStudent`
    - line 198: invalid plan check in create
    - line 311: `updateStudent`
    - line 326: invalid plan check in update
  - This file validates what is allowed from the request.

- `backend/src/modules/students/students.service.ts`
  - Current important lines:
    - line 115: reads `STUDY_PLAN_CONFIG`
    - line 139: inserts `study_plan`, `daily_hours_limit`, `monthly_fee`
    - line 200: recalculates values when plan changes
  - This file actually saves student data.

- `backend/src/database/migrations/20260604_001_study_plan_pricing.sql`
  - Current important lines:
    - line 20: drops old `check_plan_fee`
    - line 23: drops old `students_study_plan_check`
    - line 26: recreates allowed study plan list
    - line 32: recreates fee + limit rule
  - This shows how database plan rules are updated.

### Student form fields

- `desktop-app/src/components/features/students/AddStudentWizard.tsx`
  - Current important lines:
    - line 43: `createInitialFormValues`
    - line 116: `validateStep`
    - line 221: `buildStudentPayload`
    - line 545: plan list UI
    - line 725: emergency contact inputs

- `desktop-app/src/components/features/students/EditStudentWizard.tsx`
  - Current important lines:
    - line 76: `createFormValuesFromStudent`
    - line 109: `validateStep`
    - line 169: `buildUpdatePayload`
    - line 699: emergency contact inputs

- `backend/src/modules/students/students.types.ts`
  - Current important lines:
    - line 14: backend `Student` emergency fields
    - line 45: backend `CreateStudentDTO` emergency fields
    - line 68: backend `UpdateStudentDTO` emergency fields

- `desktop-app/src/types/student.types.ts`
  - Current important lines:
    - line 24: frontend `Student` emergency fields
    - line 51: frontend `CreateStudentRequest` emergency fields
    - line 73: frontend `UpdateStudentRequest` emergency fields

## 3. Quick Mental Model Before Any Change

Before editing anything, ask:

1. Am I changing only what the user sees?
2. Am I changing what data gets saved?
3. Am I changing database rules too?

Use this table:

- Only label or placeholder change:
  - frontend only
- Required to optional field change:
  - frontend + backend + database
- Plan price change for new students only:
  - frontend + backend
- Plan price change for both new and old students:
  - frontend + backend + database
- New plan:
  - frontend + backend + database

## 4. How To Change An Existing Plan

Example: change `4_hours` from `400` to `450`.

### Step 1: change backend rule

Open `backend/src/modules/students/study-plans.ts`

Current line to edit:

- line 19:

```ts
'4_hours': { fee: 400, dailyHoursLimit: 4 },
```

Change it to:

```ts
'4_hours': { fee: 450, dailyHoursLimit: 4 },
```

This makes the backend save `450` for newly created students and for students
whose plan is updated to `4_hours`.

### Step 2: change frontend display

Open `desktop-app/src/types/student.types.ts`

Current line to edit:

- around line 113:

```ts
{
  value: '4_hours',
  label: '4 Hours Plan',
  fee: 400,
  description: 'Study for 4 hours daily',
}
```

Change `fee: 400` to `fee: 450`.

This updates what the user sees in the app.

### Step 3: decide whether old students should change too

Important:

- If you change only code, existing students in the database keep their old `monthly_fee`.
- Only new students or updated students use the new value.

If you want old students to also become `450`, create a new SQL migration.

Example:

```sql
UPDATE students
SET monthly_fee = 450, daily_hours_limit = 4
WHERE study_plan = '4_hours';
```

If your constraint checks exact fee values, update the constraint too in the
same migration.

### Step 4: build

Run:

```bash
cd backend
npm run build

cd ../desktop-app
npm run build
```

## 5. How To Add A New Plan

Example: add `3_hours`.

### Step 1: add it in backend

Open `backend/src/modules/students/study-plans.ts`

#### 1A. Add it to `STUDY_PLAN_VALUES`

Current list:

```ts
export const STUDY_PLAN_VALUES = [
  '1_hour',
  '2_hours',
  '4_hours',
  'unlimited',
] as const;
```

Change to:

```ts
export const STUDY_PLAN_VALUES = [
  '1_hour',
  '2_hours',
  '3_hours',
  '4_hours',
  'unlimited',
] as const;
```

#### 1B. Add it to `STUDY_PLAN_CONFIG`

Add a new entry:

```ts
'3_hours': { fee: 300, dailyHoursLimit: 3 },
```

Example final result:

```ts
export const STUDY_PLAN_CONFIG = {
  '1_hour': { fee: 100, dailyHoursLimit: 1 },
  '2_hours': { fee: 250, dailyHoursLimit: 2 },
  '3_hours': { fee: 300, dailyHoursLimit: 3 },
  '4_hours': { fee: 400, dailyHoursLimit: 4 },
  unlimited: { fee: 600, dailyHoursLimit: null },
};
```

After this:

- backend validation will allow it
- backend save logic will use it
- attendance logic will work because it reads `daily_hours_limit`

### Step 2: add it in frontend

Open `desktop-app/src/types/student.types.ts`

#### 2A. Add it to the frontend `StudyPlan` type

Change:

```ts
export type StudyPlan = '1_hour' | '2_hours' | '4_hours' | 'unlimited';
```

To:

```ts
export type StudyPlan = '1_hour' | '2_hours' | '3_hours' | '4_hours' | 'unlimited';
```

#### 2B. Add it to `STUDY_PLANS`

Add:

```ts
{
  value: '3_hours',
  label: '3 Hours Plan',
  fee: 300,
  description: 'Study for 3 hours daily',
},
```

After this:

- Add Student plan radio list updates automatically
- Edit Student plan radio list updates automatically
- Students page plan filter updates automatically

### Step 3: change default plan if needed

If you want new students to start with `3_hours`, open:

- `desktop-app/src/components/features/students/AddStudentWizard.tsx`
- current line 52: `study_plan: '1_hour'`

Change it to:

```ts
study_plan: '3_hours',
```

### Step 4: update the database

Create a new migration in:

- `backend/src/database/migrations/`

Use `20260604_001_study_plan_pricing.sql` as your example.

You must update:

1. existing rows if needed
2. allowed study plan list
3. fee + limit check constraint

Example migration pattern:

```sql
UPDATE students
SET
  daily_hours_limit = CASE
    WHEN study_plan = '1_hour' THEN 1
    WHEN study_plan = '2_hours' THEN 2
    WHEN study_plan = '3_hours' THEN 3
    WHEN study_plan = '4_hours' THEN 4
    WHEN study_plan = 'unlimited' THEN NULL
    ELSE daily_hours_limit
  END,
  monthly_fee = CASE
    WHEN study_plan = '1_hour' THEN 100
    WHEN study_plan = '2_hours' THEN 250
    WHEN study_plan = '3_hours' THEN 300
    WHEN study_plan = '4_hours' THEN 400
    WHEN study_plan = 'unlimited' THEN 600
    ELSE monthly_fee
  END
WHERE study_plan IN ('1_hour', '2_hours', '3_hours', '4_hours', 'unlimited');
```

Then recreate the constraints with `3_hours` included.

### Step 5: run migration and build

```bash
cd backend
npm run db:migrate
npm run build

cd ../desktop-app
npm run build
```

## 6. How To Change Only The Plan Label

Example: change `1 Hour Plan` to `Quick Plan`.

You only need:

- `desktop-app/src/types/student.types.ts`

Change:

```ts
label: '1 Hour Plan',
```

To:

```ts
label: 'Quick Plan',
```

This does not change database values. The stored value stays `1_hour`.

That is usually good, because code values should stay stable.

## 7. How To Change The Default Plan In Add Student Form

Open:

- `desktop-app/src/components/features/students/AddStudentWizard.tsx`
- current line 52

Current:

```ts
study_plan: '1_hour',
```

Change it to whichever plan you want:

```ts
study_plan: '2_hours',
```

This only changes the default selected radio option when the Add Student form opens.

## 8. How To Make Emergency Contact Optional

This is the most important example, because it teaches the pattern for making
any field optional.

Right now emergency contact is required in 3 places:

1. frontend validation
2. backend validation
3. database schema

If you change only one of those 3, the feature will still behave as required
somewhere else.

### 8A. Frontend: make it optional in types

Open:

- `desktop-app/src/types/student.types.ts`

Current frontend `Student` type:

- lines 24 to 26

```ts
emergency_contact_name: string;
emergency_contact_phone: string;
emergency_contact_relation: string;
```

If database will store `NULL`, change to:

```ts
emergency_contact_name: string | null;
emergency_contact_phone: string | null;
emergency_contact_relation: string | null;
```

Current frontend `CreateStudentRequest`:

- lines 51 to 53

```ts
emergency_contact_name: string;
emergency_contact_phone: string;
emergency_contact_relation: string;
```

Change to:

```ts
emergency_contact_name?: string;
emergency_contact_phone?: string;
emergency_contact_relation?: string;
```

The frontend `UpdateStudentRequest` is already optional at lines 73 to 75.

### 8B. Backend: make it optional in types

Open:

- `backend/src/modules/students/students.types.ts`

Current backend `Student` type:

- lines 14 to 16

```ts
emergency_contact_name: string;
emergency_contact_phone: string;
emergency_contact_relation: string;
```

If database will store `NULL`, change to:

```ts
emergency_contact_name?: string | null;
emergency_contact_phone?: string | null;
emergency_contact_relation?: string | null;
```

Current backend `CreateStudentDTO`:

- lines 45 to 47

```ts
emergency_contact_name: string;
emergency_contact_phone: string;
emergency_contact_relation: string;
```

Change to:

```ts
emergency_contact_name?: string | null;
emergency_contact_phone?: string | null;
emergency_contact_relation?: string | null;
```

Backend `UpdateStudentDTO` is already optional at lines 68 to 70.

### 8C. Frontend Add Student form: stop requiring it

Open:

- `desktop-app/src/components/features/students/AddStudentWizard.tsx`

#### Remove required validation

In `validateStep`:

- lines 170 to 179 currently require emergency contact fields

Current code:

```ts
if (!values.emergency_contact_name.trim()) {
  errors.emergency_contact_name = 'Emergency contact name is required.';
}

if (!isFixedLengthNumeric(values.emergency_contact_phone, 10)) {
  errors.emergency_contact_phone = 'Enter a valid 10-digit emergency phone number.';
}

if (!values.emergency_contact_relation.trim()) {
  errors.emergency_contact_relation = 'Relationship is required.';
}
```

Change it to optional validation:

```ts
if (
  values.emergency_contact_phone.trim()
  && !isFixedLengthNumeric(values.emergency_contact_phone, 10)
) {
  errors.emergency_contact_phone = 'Enter a valid 10-digit emergency phone number.';
}
```

That means:

- blank is allowed
- if user types a phone number, it must be valid

#### Change the payload builder

Current payload lines:

- lines 221 to 223

```ts
emergency_contact_name: values.emergency_contact_name.trim(),
emergency_contact_phone: values.emergency_contact_phone,
emergency_contact_relation: values.emergency_contact_relation.trim(),
```

Change to:

```ts
emergency_contact_name: values.emergency_contact_name.trim() || undefined,
emergency_contact_phone: values.emergency_contact_phone.trim() || undefined,
emergency_contact_relation: values.emergency_contact_relation.trim() || undefined,
```

#### Change the form UI

Current inputs:

- line 725: contact name input
- line 739: contact phone input
- line 758: relationship select

Make these UI changes:

1. Remove `required` from the two `Input` components.
2. Remove the red `*` from the Relationship label.
3. Optionally change placeholder text to show it is optional.

Example:

```ts
label="Contact Person Name"
```

can become:

```ts
label="Contact Person Name (Optional)"
```

### 8D. Frontend Edit Student form: stop requiring it

Open:

- `desktop-app/src/components/features/students/EditStudentWizard.tsx`

#### Handle null values from database

In `createFormValuesFromStudent`:

- lines 100 to 102 currently assume strings

Current:

```ts
emergency_contact_name: student.emergency_contact_name,
emergency_contact_phone: student.emergency_contact_phone,
emergency_contact_relation: student.emergency_contact_relation,
```

Change to:

```ts
emergency_contact_name: student.emergency_contact_name || '',
emergency_contact_phone: student.emergency_contact_phone || '',
emergency_contact_relation: student.emergency_contact_relation || '',
```

#### Remove required validation

In `validateStep`:

- lines 157 to 166

Replace the required checks with optional validation, same idea as Add Student:

```ts
if (
  values.emergency_contact_phone.trim()
  && !isFixedLengthNumeric(values.emergency_contact_phone, 10)
) {
  errors.emergency_contact_phone = 'Enter a valid 10-digit emergency phone number.';
}
```

#### Change update payload

Current payload lines:

- lines 205 to 207

```ts
emergency_contact_name: values.emergency_contact_name.trim(),
emergency_contact_phone: values.emergency_contact_phone,
emergency_contact_relation: values.emergency_contact_relation.trim(),
```

Change to:

```ts
emergency_contact_name: values.emergency_contact_name.trim() || undefined,
emergency_contact_phone: values.emergency_contact_phone.trim() || undefined,
emergency_contact_relation: values.emergency_contact_relation.trim() || undefined,
```

#### Change the UI

Current UI lines:

- line 699: contact name input
- line 713: contact phone input
- line 732: relationship select

Do the same UI cleanup as Add Student:

1. remove `required`
2. remove red `*`
3. optionally add `(Optional)` to labels

### 8E. Backend controller: stop requiring it

Open:

- `backend/src/modules/students/students.controller.ts`

Current validation lines:

- lines 250 to 261

Current code:

```ts
if (!emergency_contact_name?.trim()) {
  return badRequest(res, 'Emergency contact name is required');
}

if (
  !emergency_contact_phone?.trim() ||
  !/^\d{10}$/.test(emergency_contact_phone.trim())
) {
  return badRequest(res, 'Valid emergency phone is required');
}

if (!emergency_contact_relation?.trim()) {
  return badRequest(res, 'Relationship is required');
}
```

Change it to:

```ts
if (
  emergency_contact_phone?.trim()
  && !/^\d{10}$/.test(emergency_contact_phone.trim())
) {
  return badRequest(res, 'Emergency phone must be 10 digits when provided');
}
```

This means:

- blank is allowed
- if a phone is sent, it must be valid

#### Change what gets passed to the service

Current lines:

- 282 to 284

```ts
emergency_contact_name: emergency_contact_name.trim(),
emergency_contact_phone: emergency_contact_phone.trim(),
emergency_contact_relation: emergency_contact_relation.trim(),
```

Change to:

```ts
emergency_contact_name: emergency_contact_name?.trim() || null,
emergency_contact_phone: emergency_contact_phone?.trim() || null,
emergency_contact_relation: emergency_contact_relation?.trim() || null,
```

### 8F. Backend service: confirm it can save null

Open:

- `backend/src/modules/students/students.service.ts`

This file already passes values directly into the INSERT and UPDATE queries.

Important current places:

- lines 162 to 164: create insert values
- lines 218 to 220: update `COALESCE(...)`

For create:

- `null` values are okay if the database column allows null.

For update:

- the current `COALESCE($11, emergency_contact_name)` style means `null` keeps the old value
- this is useful if you want "no change" behavior

If you want an edit form to clear an old value and save it as `NULL`, the update
query needs a different pattern than `COALESCE(...)`.

So decide which behavior you want:

1. Blank field means "leave old value as is"
2. Blank field means "erase old value and save NULL"

Current update behavior is closer to option 1.

### 8G. Database: allow null values

The current schema in `library_backup.sql` shows:

- line 775: `emergency_contact_name ... NOT NULL`
- line 776: `emergency_contact_phone ... NOT NULL`
- line 777: `emergency_contact_relation ... NOT NULL`

So the database still requires them.

To make them truly optional, create a new migration in:

- `backend/src/database/migrations/`

Example:

```sql
ALTER TABLE students
  ALTER COLUMN emergency_contact_name DROP NOT NULL;

ALTER TABLE students
  ALTER COLUMN emergency_contact_phone DROP NOT NULL;

ALTER TABLE students
  ALTER COLUMN emergency_contact_relation DROP NOT NULL;
```

If you want to clean old empty strings too, add:

```sql
UPDATE students
SET
  emergency_contact_name = NULLIF(TRIM(emergency_contact_name), ''),
  emergency_contact_phone = NULLIF(TRIM(emergency_contact_phone), ''),
  emergency_contact_relation = NULLIF(TRIM(emergency_contact_relation), '');
```

### 8H. Student details page: handle null safely

Open:

- `desktop-app/src/pages/StudentsPage.tsx`

Current usage:

- line 808: `studentToView.emergency_contact_name`
- line 814: `studentToView.emergency_contact_phone`
- line 820: `studentToView.emergency_contact_relation`

If the database can now return `null`, display a fallback like:

```ts
{formatOptionalValue(studentToView.emergency_contact_name)}
```

Do the same for phone and relation if you want the UI to say `Not provided`.

### 8I. Build and migrate

After all optional-field changes:

```bash
cd backend
npm run db:migrate
npm run build

cd ../desktop-app
npm run build
```

## 9. General Pattern For Any Student Form Field

If you want to change any student field, use this checklist.

### If you are only changing text

Examples:

- label text
- placeholder
- helper text
- button text

Usually edit only:

- `AddStudentWizard.tsx`
- `EditStudentWizard.tsx`

### If you are changing required vs optional

Check these in order:

1. frontend types
2. Add Student validation
3. Add Student payload builder
4. Add Student input UI
5. Edit Student form value mapping
6. Edit Student validation
7. Edit Student payload builder
8. Edit Student input UI
9. backend DTO types
10. backend controller validation
11. database null / not null rules
12. detail page rendering

### If you are adding a completely new stored field

Check these in order:

1. database column
2. backend types
3. backend controller validation
4. backend service insert/update query
5. frontend types
6. Add Student form UI
7. Edit Student form UI
8. detail page / list page if needed

## 10. How To Search Without Panic

When you want to change something, do this:

1. Search the field name with `Ctrl + Shift + F`
2. Start with the form file first
3. Then check the backend controller
4. Then check the backend service
5. Then check whether the database column or constraint also needs changes

Good search words:

- `study_plan`
- `monthly_fee`
- `daily_hours_limit`
- `emergency_contact_name`
- `emergency_contact_phone`
- `emergency_contact_relation`

## 11. Safe Beginner Workflow

When changing code yourself, use this order:

1. Change one file
2. Save
3. Read the code again
4. Change the next connected file
5. Run build
6. Fix any error shown by the build

Do not try to edit 10 files at once.

For plan changes, always start with:

- `backend/src/modules/students/study-plans.ts`
- `desktop-app/src/types/student.types.ts`

For student form field changes, always start with:

- `desktop-app/src/components/features/students/AddStudentWizard.tsx`

Then follow the field into the backend and database.

## 12. Quick Commands

### Build backend

```bash
cd backend
npm run build
```

### Run backend migrations

```bash
cd backend
npm run db:migrate
```

### Build desktop app

```bash
cd desktop-app
npm run build
```

## 13. Final Cheat Sheet

### Change existing plan price

Edit:

- `backend/src/modules/students/study-plans.ts`
- `desktop-app/src/types/student.types.ts`
- new SQL migration if old student records should also change

### Add new plan

Edit:

- `backend/src/modules/students/study-plans.ts`
- `desktop-app/src/types/student.types.ts`
- optional default in `AddStudentWizard.tsx`
- new SQL migration

### Make a field optional

Edit:

- frontend types
- add form validation
- add form payload
- edit form validation
- edit form payload
- backend types
- backend controller validation
- database `NOT NULL` rule
- display page fallback text

If you are unsure, change one file and build before changing the next one.
