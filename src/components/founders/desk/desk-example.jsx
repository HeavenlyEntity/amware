import { DeskLadder } from '@/components/founders/desk/desk-ladder'
import { GapExplorer } from '@/components/founders/desk/gap-explorer'
import { Reveal } from '@/components/founders/desk/reveal'

/*
 * "Try the example": the desk's two outputs for the same worked example, in
 * one panel. 01 is the equity gap, to play with; 02 is the ask that gap
 * supports, to copy. One panel, because the desk is one path with two stops;
 * the rule between them is the join, not a border around a second card.
 *
 * Server component. Everything arrives as plain data from `deskLanding()`;
 * the two client islands are the slider and the copy buttons.
 */
export function DeskExample({ data }) {
  const { example, rungs, note, sources, cashSource } = data
  return (
    <section
      className="amw-dk-wrap amw-dk-example"
      aria-labelledby="example-title"
    >
      <Reveal className="amw-dk-panel">
        <div className="amw-dk-hatch" aria-hidden="true" data-print="hide">
          <span className="amw-dk-hatch-a" />
          <span className="amw-dk-hatch-b" />
        </div>
        <div className="amw-dk-head">
          <h2 id="example-title" className="amw-dk-h3">
            Try the example
          </h2>
          <p className="amw-kicker amw-dk-kicker">{example.kicker}</p>
        </div>

        <GapExplorer example={example} />

        <hr className="amw-dk-rule" />

        <DeskLadder rungs={rungs} note={note} />

        <p className="amw-kicker amw-dk-sources">
          Benchmarks:{' '}
          {sources.map((source, index) => (
            <span key={source.id}>
              {index > 0 && ' · '}
              {source.url ? (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="amw-dk-link amw-dk-link-quiet"
                >
                  {source.name}
                </a>
              ) : (
                source.name
              )}{' '}
              {source.asOf}
            </span>
          ))}
          {cashSource ? ` · ${cashSource}` : null}
        </p>
      </Reveal>
    </section>
  )
}
