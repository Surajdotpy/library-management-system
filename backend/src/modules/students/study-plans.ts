export const STUDY_PLAN_VALUES = [
  '1_hour',
  '2_hours',
  '4_hours',
  'unlimited',
] as const;

export type StudyPlan = (typeof STUDY_PLAN_VALUES)[number];

export const STUDY_PLAN_CONFIG: Record<
  StudyPlan,
  {
    fee: number;
    dailyHoursLimit: number | null;
  }
> = {
  '1_hour': { fee: 100, dailyHoursLimit: 1 },
  '2_hours': { fee: 250, dailyHoursLimit: 2 },
  '4_hours': { fee: 400, dailyHoursLimit: 4 },
  unlimited: { fee: 600, dailyHoursLimit: null },
};
