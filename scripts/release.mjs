#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = join(scriptDir, '..');

function getArg(name, fallback = '') {
  const index = process.argv.indexOf(name);
  return index !== -1 && process.argv[index + 1]
    ? process.argv[index + 1]
    : fallback;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

const bump =
  ['patch', 'minor', 'major'].find((level) => process.argv.includes(level)) ??
  getArg('--bump', 'patch');

const dryRun = hasFlag('--dry-run');
const skipPublish = hasFlag('--skip-publish');
const skipGh = hasFlag('--skip-gh');
const skipPush = hasFlag('--skip-push');
const branch = getArg('--branch') || git('branch --show-current') || 'main';

function git(command) {
  return execSync(`git ${command}`, { cwd: root, encoding: 'utf8' }).trim();
}

function readVersion() {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  return pkg.version;
}

function run(command, { inherit = true } = {}) {
  console.log(`\n> ${command}`);
  if (dryRun) return '';
  return execSync(command, {
    cwd: root,
    encoding: 'utf8',
    stdio: inherit ? 'inherit' : 'pipe',
  });
}

const oldVersion = readVersion();
const oldTag = `v${oldVersion}`;

console.log(`Releasing ${oldVersion} -> npm version ${bump}`);
if (dryRun) {
  console.log('(dry run — commands are printed but not executed)');
}

run(`npm version ${bump}`);

const newVersion = readVersion();
const newTag = `v${newVersion}`;


run(
  `node scripts/release-notes.mjs --from ${oldTag} --to HEAD --version ${newTag} --out RELEASE_NOTES.md`,
  { inherit: !dryRun },
);

run(`git add RELEASE_NOTES.md`);
run(`git commit -m "Release ${newTag}"`);

if (!skipPush) {
  run(`git push origin ${branch} --tags`);
} else {
  console.log('\n> skip git push (--skip-push)');
}

if (!skipGh) {
  const ghTarget = skipPush ? ' --target HEAD' : '';
  run(
    `gh release create ${newTag}${ghTarget} --title "${newTag}" --notes-file RELEASE_NOTES.md`,
  );
} else {
  console.log('\n> skip gh release (--skip-gh)');
}

if (!skipPublish) {
  run('npm publish');
} else {
  console.log('\n> skip npm publish (--skip-publish)');
}

console.log(`\nDone. Released ${newTag}.`);
