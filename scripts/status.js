#!/usr/bin/env node
// Prints the project's safety report as JSON. Used by the /start and /ship skills.
'use strict';
const { inspect } = require('./lib/project');
const dir = process.argv[2] || process.cwd();
process.stdout.write(JSON.stringify(inspect(dir), null, 2) + '\n');
