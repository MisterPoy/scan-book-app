import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const localConfigDirectory = resolve('.local', 'firebase-config');
mkdirSync(localConfigDirectory, { recursive: true });

const firebaseCli = resolve('node_modules', 'firebase-tools', 'lib', 'bin', 'firebase.js');
const result = spawnSync(
  process.execPath,
  [
    firebaseCli,
    'emulators:exec',
    '--project',
    'kodeks-test',
    '--only',
    'firestore,storage',
    'vitest run tests/rules',
  ],
  {
    env: {
      ...process.env,
      XDG_CONFIG_HOME: localConfigDirectory,
    },
    stdio: 'inherit',
  },
);

if (result.error) throw result.error;
process.exit(result.status ?? 1);
