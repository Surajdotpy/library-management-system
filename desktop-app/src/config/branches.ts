export interface BranchOption {
  id: number;
  name: string;
}

export const BRANCH_OPTIONS: BranchOption[] = [
  { id: 1, name: 'Branch 1' },
  { id: 2, name: 'Branch 2' },
  { id: 3, name: 'Branch 3' },
  { id: 4, name: 'Branch 4' },
];

export function getBranchName(branchId: number | null | undefined): string {
  if (typeof branchId !== 'number') {
    return 'Unassigned Branch';
  }

  return BRANCH_OPTIONS.find((branch) => branch.id === branchId)?.name ?? `Branch ${branchId}`;
}

export function isKnownBranchId(branchId: number): boolean {
  return BRANCH_OPTIONS.some((branch) => branch.id === branchId);
}
