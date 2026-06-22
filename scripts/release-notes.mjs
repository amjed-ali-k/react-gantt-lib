#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const repo =
  process.env.GITHUB_REPOSITORY ?? 'amjed-ali-k/react-gantt-lib';
const base = `https://github.com/${repo}`;

function getArg(name, fallback = '') {
  const index = process.argv.indexOf(name);
  return index !== -1 && process.argv[index + 1]
    ? process.argv[index + 1]
    : fallback;
}

const fromTag = getArg('--from');
const toRef = getArg('--to', 'HEAD');
const version = getArg('--version');
const outFile = getArg('--out');
const title = version || "What's Changed";

const range = fromTag ? `${fromTag}..${toRef}` : toRef;
const recordSeparator = '\x1e';
const fieldSeparator = '\x1f';

let log = '';
try {
  log = execSync(
    `git log ${range} --pretty=format:"%H${fieldSeparator}%h${fieldSeparator}%s${fieldSeparator}%b${recordSeparator}" --reverse`,
    { encoding: 'utf8' },
  ).trim();
} catch {
  log = '';
}

const commits = log
  ? log
      .split(recordSeparator)
      .filter(Boolean)
      .map((entry) => {
        const [hash, short, subject, body = ''] = entry.split(fieldSeparator);
        return {
          hash: hash.trim(),
          short: short.trim(),
          subject: subject.trim(),
          body: body.trim(),
        };
      })
  : [];

let notes = `## ${title}\n\n`;

if (commits.length === 0) {
  notes += '_No commits in this range._\n';
} else {
  for (const { hash, short, subject, body } of commits) {
    notes += `* [${subject}](${base}/commit/${hash}) ([${short}](${base}/commit/${hash}))`;
    if (body) {
      const bullets = body
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.startsWith('-'))
        .map((line) => line.replace(/^- /, ''));
      if (bullets.length > 0) {
        notes += '\n';
        for (const bullet of bullets) {
          notes += `  * ${bullet}\n`;
        }
      } else {
        notes += '\n';
      }
    } else {
      notes += '\n';
    }
  }
}

if (version) {
  const tag = version.startsWith('v') ? version : `v${version}`;
  if (fromTag) {
    notes += `\n**Full Changelog**: ${base}/compare/${fromTag}...${tag}\n`;
  } else {
    notes += `\n**Full Changelog**: ${base}/releases/tag/${tag}\n`;
  }
}

if (outFile) {
  writeFileSync(outFile, notes, 'utf8');
} else {
  process.stdout.write(notes);
}
