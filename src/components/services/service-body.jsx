import { RichText } from '@/components/site/RichText'

/*
 * A service card's body, from its Payload `description` (Lexical rich text).
 *
 * The board draws each card's body as a short check-list. The owner is
 * re-authoring every description as a bulleted list in the admin (F3), and a
 * list renders as it is: `.amw-service-body ul` draws the check marks.
 *
 * Until then the descriptions are paragraphs, three to a card, which would
 * stack a wall of text under every price. So a paragraphs-only description
 * shows its first paragraph, the summary of the tier, and keeps the rest one
 * click away under "Details": minimal at rest, nothing lost, and all of it
 * still in the HTML. A description that has a list is shown in full.
 */

const isList = (node) => node?.type === 'list'

/** Split a Lexical document into what shows at rest and what is folded. */
export function splitDescription(data) {
  const children = data?.root?.children
  if (!Array.isArray(children) || children.length === 0) {
    return { lead: null, rest: null }
  }
  if (children.some(isList) || children.length === 1) {
    return { lead: data, rest: null }
  }
  const withChildren = (list) => ({
    ...data,
    root: { ...data.root, children: list },
  })
  return {
    lead: withChildren(children.slice(0, 1)),
    rest: withChildren(children.slice(1)),
  }
}

export function ServiceBody({ data }) {
  const { lead, rest } = splitDescription(data)
  if (!lead) return null
  return (
    <>
      <RichText data={lead} className="prose-sm" />
      {rest ? (
        <details className="svc-more">
          <summary>Details</summary>
          <RichText data={rest} className="prose-sm" />
        </details>
      ) : null}
    </>
  )
}
