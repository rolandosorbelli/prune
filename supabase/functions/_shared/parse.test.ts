import { assertEquals } from 'jsr:@std/assert@1'
import {
  categoryFromLabels,
  isOneClickSupported,
  parseFromHeader,
  parseListUnsubscribe,
} from './parse.ts'

Deno.test('parseFromHeader - name and email', () => {
  assertEquals(parseFromHeader('Acme Deals <deals@acme.com>'), {
    name: 'Acme Deals',
    email: 'deals@acme.com',
  })
})

Deno.test('parseFromHeader - quoted display name', () => {
  assertEquals(parseFromHeader('"Acme, Inc." <hello@acme.com>'), {
    name: 'Acme, Inc.',
    email: 'hello@acme.com',
  })
})

Deno.test('parseFromHeader - bare email address', () => {
  assertEquals(parseFromHeader('deals@acme.com'), {
    name: null,
    email: 'deals@acme.com',
  })
})

Deno.test('parseFromHeader - lowercases the email', () => {
  assertEquals(parseFromHeader('Acme <Deals@ACME.com>').email, 'deals@acme.com')
})

Deno.test('parseListUnsubscribe - prefers https link over mailto', () => {
  assertEquals(
    parseListUnsubscribe(
      '<mailto:unsub@acme.com>, <https://acme.com/unsubscribe?u=123>',
    ),
    { method: 'link', target: 'https://acme.com/unsubscribe?u=123' },
  )
})

Deno.test('parseListUnsubscribe - falls back to mailto only', () => {
  assertEquals(parseListUnsubscribe('<mailto:unsub@acme.com>'), {
    method: 'mailto',
    target: 'mailto:unsub@acme.com',
  })
})

Deno.test('parseListUnsubscribe - no recognizable links', () => {
  assertEquals(parseListUnsubscribe('no angle brackets here'), {
    method: null,
    target: null,
  })
})

Deno.test('categoryFromLabels - maps known Gmail categories', () => {
  assertEquals(categoryFromLabels(['INBOX', 'CATEGORY_PROMOTIONS']), 'promotions')
  assertEquals(categoryFromLabels(['CATEGORY_SOCIAL']), 'social')
  assertEquals(categoryFromLabels(['CATEGORY_UPDATES']), 'updates')
  assertEquals(categoryFromLabels(['CATEGORY_FORUMS']), 'forums')
})

Deno.test('categoryFromLabels - defaults to other', () => {
  assertEquals(categoryFromLabels(['INBOX', 'UNREAD']), 'other')
})

Deno.test('isOneClickSupported - true only for link + RFC 8058 header', () => {
  assertEquals(isOneClickSupported('link', 'List-Unsubscribe=One-Click'), true)
})

Deno.test('isOneClickSupported - false without the header', () => {
  assertEquals(isOneClickSupported('link', undefined), false)
})

Deno.test('isOneClickSupported - false for mailto even with the header', () => {
  assertEquals(
    isOneClickSupported('mailto', 'List-Unsubscribe=One-Click'),
    false,
  )
})
