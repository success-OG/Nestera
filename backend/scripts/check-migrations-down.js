const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, '..', 'src', 'migrations');

function findTsFiles(dir) {
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.ts'))
    .map((f) => path.join(dir, f));
}

const files = findTsFiles(migrationsDir);
const missing = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  if (!/public\s+async\s+down\s*\(/.test(content)) {
    missing.push(path.basename(file));
  }
}

if (missing.length > 0) {
  console.error('Migrations missing down() methods:');
  missing.forEach((m) => console.error(`  - ${m}`));
  process.exitCode = 2;
} else {
  console.log('All migrations have down() methods.');
}
