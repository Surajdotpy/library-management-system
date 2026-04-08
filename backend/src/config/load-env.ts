import dotenv from 'dotenv';

declare global {
  var __libraryManagementEnvLoaded: boolean | undefined;
}

if (!globalThis.__libraryManagementEnvLoaded) {
  if (process.env.NODE_ENV === 'test') {
    dotenv.config({ path: '.env.test' });
  } else {
    dotenv.config();
  }

  globalThis.__libraryManagementEnvLoaded = true;
}

export {};
