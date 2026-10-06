import { execFileSync } from 'node:child_process';

const files = [
  'index.js', 'auth.js', 'database.js', 'database-postgres.js',
  'database-provider.js', 'faceRecognice.js', 'src/http-errors.js', 'src/validators.js'
];

for (const file of files) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
}

console.log(`Syntax OK: ${files.length} backend files`);
