import { withSocialImage } from '@/lib/social/metadata'
import StoryWorld from '@/components/story/story-world'

export const metadata = withSocialImage(
  {
    title: 'The AMWARE Story',
    description:
      'A Masterpiece Will Always Require Effort. Explore the AMWARE story: from the midnight grind to shipped products, and the playbook that gets you there faster.',
  },
  'story'
)

export default function StoryPage() {
  return <StoryWorld />
}
