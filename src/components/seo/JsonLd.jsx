/* Server-rendered JSON-LD. `<` is escaped so a value containing
   "</script>" can never close the tag early. */
export function JsonLd({ data }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  )
}
