import { withSocialImage } from '@/lib/social/metadata'
import { loadProjectsForPage } from '@/lib/projects/load'
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
   rolls it over at New Year without a deploy. Admin edits don't wait for
   it: the Projects collection revalidates this page on every change. */
export const revalidate = 86400

export default async function ProjectsPage() {
  const { projects, benchCount } = await loadProjectsForPage()
  return (
    <ProjectsContent
      projects={projects}
      benchCount={benchCount}
      currentYear={new Date().getFullYear()}
    />
  )
}
