import { assertEquals } from 'jsr:@std/assert@1'
import {
  findUnsubscribeLinkInHtml,
  findUnsubscribeLinkInText,
} from './body-unsubscribe.ts'

Deno.test('findUnsubscribeLinkInHtml - anchor text says unsubscribe', () => {
  const html =
    '<p>Thanks for reading!</p><a href="https://acme.com/u/123">Unsubscribe</a>'
  assertEquals(findUnsubscribeLinkInHtml(html), 'https://acme.com/u/123')
})

Deno.test('findUnsubscribeLinkInHtml - href contains unsubscribe but text does not', () => {
  const html = '<a href="https://acme.com/unsubscribe?id=9">Click here</a>'
  assertEquals(
    findUnsubscribeLinkInHtml(html),
    'https://acme.com/unsubscribe?id=9',
  )
})

Deno.test('findUnsubscribeLinkInHtml - ignores unrelated links', () => {
  const html =
    '<a href="https://acme.com/shop">Shop now</a><a href="https://acme.com/about">About us</a>'
  assertEquals(findUnsubscribeLinkInHtml(html), null)
})

Deno.test('findUnsubscribeLinkInHtml - nested tags inside the anchor text', () => {
  const html =
    '<a href="https://acme.com/u/42"><span>Unsubscribe</span> from this list</a>'
  assertEquals(findUnsubscribeLinkInHtml(html), 'https://acme.com/u/42')
})

Deno.test('findUnsubscribeLinkInText - url on the same line as "unsubscribe"', () => {
  const text = 'Thanks for reading.\nTo unsubscribe visit https://acme.com/u/7\nBye.'
  assertEquals(findUnsubscribeLinkInText(text), 'https://acme.com/u/7')
})

Deno.test('findUnsubscribeLinkInText - no unsubscribe mention', () => {
  assertEquals(findUnsubscribeLinkInText('Just a newsletter, nothing here.'), null)
})
