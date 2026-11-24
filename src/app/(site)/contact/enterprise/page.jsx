import { withSocialImage } from '@/lib/social/metadata'
import { kitEnterpriseSubject } from '@/lib/contact-intents'
import { STACK_LABEL } from '@/lib/commerce/pricingTable'
import { kitName } from '@/lib/commerce/license'
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
      description: 'A quote for a team that needs more than Team covers.',
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
  const kitId = firstParam(query.kit)
  /* Standard is not a column on the pricing page, so it is not in
     STACK_LABEL; it is named here from the kit's own name. */
  const kit =
    kitId === 'standard' ? kitName('standard') : known(STACK_LABEL, kitId)
  const tier = known(TIER_LABEL, firstParam(query.tier))

  return (
    <ContactForm
      topic="enterprise"
      initialSubject={kit && tier ? kitEnterpriseSubject(kit, tier) : undefined}
    />
  )
}
