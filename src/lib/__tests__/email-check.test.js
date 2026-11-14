import { describe, expect, it } from 'vitest'

import { checkEmail, domainOf } from '../email-check'

/* Addresses that cannot be real are refused before a checklist is sent;
   a DNS hiccup never turns a real visitor away. */

const fail = (code) => async () => {
  throw Object.assign(new Error(code), { code })
}
const dns = ({
  mx = async () => [],
  a = fail('ENODATA'),
  aaaa = fail('ENODATA'),
} = {}) => ({
  resolveMx: mx,
  resolve4: a,
  resolve6: aaaa,
})

describe('checkEmail', () => {
  it('passes a domain with a mail server', async () => {
    const resolver = dns({ mx: async () => [{ exchange: 'mx.acme.co' }] })
    expect(await checkEmail('ada@acme.co', resolver)).toBe('ok')
  })

  it('passes a domain with only an address record (implicit MX)', async () => {
    const resolver = dns({ mx: fail('ENODATA'), a: async () => ['192.0.2.1'] })
    expect(await checkEmail('ada@small.biz', resolver)).toBe('ok')
  })

  it('refuses throwaway inbox services and their subdomains', async () => {
    expect(await checkEmail('x@Mailinator.com', dns())).toBe('disposable')
    expect(await checkEmail('x@inbox.yopmail.com', dns())).toBe('disposable')
  })

  it('refuses a domain that does not exist or takes no mail', async () => {
    expect(
      await checkEmail('x@nope.invalid', dns({ mx: fail('ENOTFOUND') }))
    ).toBe('no-mail')
    expect(await checkEmail('x@acme.co', dns({ mx: fail('ENODATA') }))).toBe(
      'no-mail'
    )
    expect(
      await checkEmail(
        'x@acme.co',
        dns({ mx: async () => [{ exchange: '.' }] })
      )
    ).toBe('no-mail')
    expect(await checkEmail('x@localhost', dns())).toBe('no-mail')
  })

  it('lets the address through when DNS is down or slow', async () => {
    expect(await checkEmail('x@acme.co', dns({ mx: fail('ESERVFAIL') }))).toBe(
      'ok'
    )
    const slow = dns({ mx: () => new Promise(() => {}) })
    expect(await checkEmail('x@acme.co', slow, 10)).toBe('ok')
  })

  it('reads the domain after the last @, in ASCII', () => {
    expect(domainOf('a@b@Acme.CO ')).toBe('acme.co')
    expect(domainOf('a@bücher.de')).toBe('xn--bcher-kva.de')
    expect(domainOf('nobody')).toBe('')
  })
})
