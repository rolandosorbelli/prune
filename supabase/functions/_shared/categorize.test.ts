import { assertEquals } from 'jsr:@std/assert@1'
import { categorizeByHeuristic } from './categorize.ts'

Deno.test('categorizeByHeuristic - promotions keyword in domain', () => {
  assertEquals(categorizeByHeuristic('deals@retailer-deals.com'), 'promotions')
})

Deno.test('categorizeByHeuristic - updates keyword in domain', () => {
  assertEquals(categorizeByHeuristic('team@status.example.com'), 'updates')
})

Deno.test('categorizeByHeuristic - social platform domain', () => {
  assertEquals(categorizeByHeuristic('notify@linkedin.com'), 'social')
})

Deno.test('categorizeByHeuristic - social keyword only in local part', () => {
  assertEquals(categorizeByHeuristic('facebook@mail.example.com'), 'social')
})

Deno.test('categorizeByHeuristic - noreply local part maps to updates', () => {
  assertEquals(categorizeByHeuristic('noreply@somecompany.com'), 'updates')
})

Deno.test('categorizeByHeuristic - mailing list domain maps to forums', () => {
  assertEquals(categorizeByHeuristic('digest@lists.example.org'), 'forums')
})

Deno.test('categorizeByHeuristic - no keyword match falls back to other', () => {
  assertEquals(categorizeByHeuristic('hello@acme.com'), 'other')
})
