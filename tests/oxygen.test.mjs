import test from 'node:test';
import assert from 'node:assert/strict';
import { runIsolatedPython, runIsolatedSql, validatePythonSafety } from '../server/sandbox.ts';
import { cleanDatasetRows, parseTabularBuffer, profileDataset, SAMPLE_ENGINEERING_CSV } from '../server/dataLab.ts';

test('Sandbox blocks restricted system/network imports', async () => {
  const blocked = validatePythonSafety('import os\nprint(os.listdir("/"))');
  assert.ok(blocked, 'Expected os import to be blocked');

  const res = await runIsolatedPython('import subprocess\nsubprocess.run(["ls"])');
  assert.equal(res.success, false);
  assert.ok(res.blockedReason);
});

test('Sandbox executes safe Python algorithms and captures stdout', async () => {
  const res = await runIsolatedPython('import statistics\nprint(statistics.mean([10, 20, 30]))');
  assert.equal(res.success, true);
  assert.equal(res.stdout.trim(), '20');
});

test('Sandbox executes isolated SQLite SQL queries', () => {
  const res = runIsolatedSql('SELECT COUNT(*) AS cnt FROM inference_logs;');
  assert.equal(res.success, true);
  assert.equal(res.sqlRows?.[0]?.cnt, 6);
});

test('Data Lab parses, profiles, and cleans CSV telemetry data', () => {
  const rows = parseTabularBuffer('sample.csv', Buffer.from(SAMPLE_ENGINEERING_CSV, 'utf8'));
  assert.equal(rows.length, 12);

  const profile = profileDataset('ds-test', 'sample.csv', rows);
  assert.equal(profile.duplicateRowCount, 1);
  assert.equal(profile.totalMissingCells, 1);

  const cleaned = cleanDatasetRows(rows, profile, ['drop_duplicates', 'impute_missing', 'trim_whitespace']);
  const cleanedProfile = profileDataset('ds-test-clean', 'sample.csv', cleaned);
  assert.equal(cleanedProfile.duplicateRowCount, 0);
  assert.equal(cleanedProfile.totalMissingCells, 0);
});
