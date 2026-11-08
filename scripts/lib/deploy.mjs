// Small, clock-injectable polling primitive used by the variant publisher.

export async function waitUntilOnline({ check, now = Date.now, sleep = delay, budgetMs, intervalMs }) {
  const deadline = now() + budgetMs;
  while (true) {
    if (await check()) return true;
    const remaining = deadline - now();
    if (remaining <= 0) return false;
    await sleep(Math.min(intervalMs, remaining));
  }
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
