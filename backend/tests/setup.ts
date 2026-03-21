import { runPendingMigrations } from '../src/database/migration-runner.ts';

await runPendingMigrations();
