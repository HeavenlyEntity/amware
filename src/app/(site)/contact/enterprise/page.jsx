import { withSocialImage } from '@/lib/social/metadata'
import { kitEnterpriseSubject } from '@/lib/contact-intents'
import { STACK_LABEL } from '@/lib/commerce/pricingTable'
import ContactForm from '../ContactForm'

/* Where "Talk to me about Enterprise" on the license page lands.

   A real route of its own, so /contact stays static: this one reads its query,
   which makes only this page dynamic. The query carries a kit and a tier as
   short ids, never as words. They are looked up in the lists below and only a
   match becomes part of the subject, so a hand-made link cannot put its own
   text in front of the person who reads the message. The visitor can still
   edit the subject before sending. */

export const metadata = {
  ...withSocialImage(
    {
      title: 'Talk about Enterprise',
      description:
        'Ask about WareKit Enterprise: more developers or NetSuite accounts than Team covers.',
    },
    'contact'
  ),
  robots: { index: false },
}

const TIER_LABEL = {
  lite: 'Lite',
  pro: 'Pro',
  team: 'Team',
}

const firstParam = (value) => (Array.isArray(value) ? value[0] : value)

const known = (labels, id) =>
  typeof id === 'string' && Object.hasOwn(labels, id) ? labels[id] : null

export default async function EnterpriseContactPage({ searchParams }) {
  const query = (await searchParams) ?? {}
  const kit = known(STACK_LABEL, firstParam(query.kit))
  const tier = known(TIER_LABEL, firstParam(query.tier))

  return (
    <ContactForm
      topic="enterprise"
      initialSubject={kit && tier ? kitEnterpriseSubject(kit, tier) : undefined}
    />
  )
}
