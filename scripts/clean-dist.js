import { existsSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptsDirectory = dirname(fileURLToPath(import.meta.url));
const projectDirectory = resolve(scriptsDirectory, '..');
const outputDirectory = resolve(projectDirectory, 'dist');

if (outputDirectory !== resolve(projectDirectory, 'dist')) {
  throw new Error('Refus de nettoyer un répertoire de sortie inattendu.');
}

if (existsSync(outputDirectory)) {
  rmSync(outputDirectory, { recursive: true, force: true });
}

if (existsSync(outputDirectory) && process.platform === 'win32') {
  const escapedDirectory = outputDirectory.replace(/'/g, "''");
  const cleanup = spawnSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      `Remove-Item -LiteralPath '${escapedDirectory}' -Recurse -Force`,
    ],
    { stdio: 'inherit' },
  );
  if (cleanup.error) throw cleanup.error;
}

if (existsSync(outputDirectory)) {
  throw new Error(`Le répertoire de build n'a pas pu être nettoyé : ${outputDirectory}`);
}
