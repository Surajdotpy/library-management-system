import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

declare global {
  var __libraryManagementEnvLoaded: boolean | undefined;
}

const configDirectory = path.dirname(fileURLToPath(import.meta.url));
const backendRootDirectory = path.resolve(configDirectory, '../..');

if (!globalThis.__libraryManagementEnvLoaded) {
  if (process.env.NODE_ENV === 'test') {
    dotenv.config({ path: path.join(backendRootDirectory, '.env.test') });
  } else {
    dotenv.config({ path: path.join(backendRootDirectory, '.env') });
  }

  globalThis.__libraryManagementEnvLoaded = true;
}

export {};
