// Runs `fn` over `items` with at most `concurrency` in flight at once —
// shared by every scan-* function fetching per-message metadata.
export async function mapWithConcurrency<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  let index = 0
  async function worker() {
    while (index < items.length) {
      const item = items[index++]
      await fn(item)
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, worker),
  )
}
