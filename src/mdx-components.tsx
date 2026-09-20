import type { ComponentType, ReactNode } from 'react'

type MDXComponents = Record<string, ComponentType<Record<string, unknown>>>

// Required by @next/mdx for the App Router. Article typography comes from the
// `Prose`/`prose` wrapper in ArticleLayout, so keep element mapping minimal here.
const components: MDXComponents = {
  // ArticleLayout supplies the page's h1; authored headings belong below it.
  h1: ({ children, ...props }) => <h2 {...props}>{children as ReactNode}</h2>,
}

export function useMDXComponents(inherited: MDXComponents = {}): MDXComponents {
  return { ...components, ...inherited }
}
