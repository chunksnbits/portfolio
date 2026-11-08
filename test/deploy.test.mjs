import { test } from 'node:test';
import assert from 'node:assert/strict';
import { waitUntilOnline } from '../scripts/lib/deploy.mjs';

function clock() {
  let time = 0;
  return {
    now: () => time,
    sleep: async (milliseconds) => {
      time += milliseconds;
    },
  };
}

test('waitUntilOnline returns when the check succeeds within the budget', async () => {
  const time = clock();
  let checks = 0;

  const result = await waitUntilOnline({
    check: async () => ++checks === 3,
    now: time.now,
    sleep: time.sleep,
    budgetMs: 100,
    intervalMs: 10,
  });

  assert.equal(result, true);
  assert.equal(checks, 3);
});

test('waitUntilOnline retries and reports a failed check after the budget', async () => {
  const time = clock();
  let checks = 0;

  const result = await waitUntilOnline({
    check: async () => {
      checks += 1;
      return false;
    },
    now: time.now,
    sleep: time.sleep,
    budgetMs: 25,
    intervalMs: 10,
  });

  assert.equal(result, false);
  assert.equal(checks, 4);
});

test('waitUntilOnline can succeed after transient failures', async () => {
  const time = clock();
  const results = [false, false, true];

  const result = await waitUntilOnline({
    check: async () => results.shift(),
    now: time.now,
    sleep: time.sleep,
    budgetMs: 20,
    intervalMs: 10,
  });

  assert.equal(result, true);
});
