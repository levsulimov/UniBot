import process from 'node:process';
import { loadEnvFile } from 'node:process';

// Node's built-in loader keeps secrets outside source control and needs no dependency.
try { loadEnvFile('.env'); } catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

/** Loads the configuration from the process environment without exposing secrets. */
export function getConfig(env = process.env) {
  const port = Number(env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be a valid TCP port.');
  }

  return {
    port,
    databasePath: env.DATABASE_PATH ?? './data/unibot.sqlite',
    maxToken: env.MAX_BOT_TOKEN ?? '',
    maxApiBaseUrl: env.MAX_API_BASE_URL ?? 'https://platform-api2.max.ru',
  };
}
