#!/usr/bin/env node
// Called by /brainam-shield:ship only after tests, review and the student's own check pass.
// Leaves a short-lived note inside .git so the push guard lets the next push to main through
// without asking again. The note expires after 15 minutes and works for one push only.
'use strict';
const fs = require('fs');
const path = require('path');
const { git } = require('./lib/project');
const cwd = process.argv[2] || process.cwd();
const gd = git(cwd, ['rev-parse', '--git-dir']);
if (!gd) {
  console.error('Not a git repository.');
  process.exit(1);
}
fs.writeFileSync(path.resolve(cwd, gd.trim(), 'shield-ship-ok'), new Date().toISOString());
console.log('Ship checks recorded. The next push to main will not ask again (valid 15 minutes).');
