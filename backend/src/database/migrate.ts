import { runPendingMigrations } from './migration-runner.ts';

async function main(): Promise<void> {
  const appliedMigrations = await runPendingMigrations();

  if (appliedMigrations.length === 0) {
    console.log('Database schema is already up to date.');
    return;
  }

  console.log('Applied migrations:');

  for (const migration of appliedMigrations) {
    console.log(`- ${migration}`);
  }
}

main().catch((error) => {
  console.error('Database migration failed:', error);
  process.exitCode = 1;
});
