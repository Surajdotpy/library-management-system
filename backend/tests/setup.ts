import { runPendingMigrations } from '../src/database/migration-runner.js';

await runPendingMigrations();
