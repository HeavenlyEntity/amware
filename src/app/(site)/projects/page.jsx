import { withSocialImage } from '@/lib/social/metadata'
import ProjectsContent from './ProjectsContent'
import '@/styles/portfolio.css'
import '@/styles/projects.css'

export const metadata = withSocialImage(
  {
    title: 'Projects',
    description: "Things I've made trying to put my dent in the universe.",
  },
  'projects'
)

/* The hero counts years through the current year. It is read here, on
   the server, so the client hydrates the same number; a daily revalidate
   rolls it over at New Year without a deploy. */
export const revalidate = 86400

export default function ProjectsPage() {
  return <ProjectsContent currentYear={new Date().getFullYear()} />
}
