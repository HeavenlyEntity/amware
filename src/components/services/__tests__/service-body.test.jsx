import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { ServiceBody, splitDescription } from '../service-body'

/* A card body is the Payload description. As a bulleted list (how the owner
   is re-authoring them) it shows in full; as the current three paragraphs it
   leads with the first and folds the rest under "Details". */

const text = (value) => ({
  type: 'text',
  text: value,
  format: 0,
  style: '',
  mode: 'normal',
  detail: 0,
  version: 1,
})
const paragraph = (value) => ({
  type: 'paragraph',
  format: '',
  indent: 0,
  version: 1,
  direction: 'ltr',
  textFormat: 0,
  children: [text(value)],
})
const listItem = (value, value2) => ({
  type: 'listitem',
  value: value2,
  format: '',
  indent: 0,
  version: 1,
  direction: 'ltr',
  children: [text(value)],
})
const doc = (children) => ({
  root: {
    type: 'root',
    format: '',
    indent: 0,
    version: 1,
    direction: 'ltr',
    children,
  },
})

describe('ServiceBody', () => {
  it('leads with the first paragraph and folds the rest under Details', () => {
    const { container } = render(
      <ServiceBody
        data={doc([
          paragraph('Weekly calls.'),
          paragraph('For a team.'),
          paragraph('Most want this.'),
        ])}
      />
    )
    const details = container.querySelector('details')
    expect(screen.getByText('Weekly calls.').closest('details')).toBeNull()
    expect(details).not.toHaveAttribute('open')
    expect(details.querySelector('summary')).toHaveTextContent('Details')
    expect(details).toHaveTextContent('For a team.')
    expect(details).toHaveTextContent('Most want this.')
  })

  it('shows a bulleted description in full, as the board draws it', () => {
    const data = doc([
      {
        type: 'list',
        listType: 'bullet',
        tag: 'ul',
        start: 1,
        format: '',
        indent: 0,
        version: 1,
        direction: 'ltr',
        children: [
          listItem('Weekly strategy calls', 1),
          listItem('Vendor negotiations', 2),
        ],
      },
    ])
    expect(splitDescription(data)).toEqual({ lead: data, rest: null })
    const { container } = render(<ServiceBody data={data} />)
    expect(container.querySelector('details')).toBeNull()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('renders nothing for an empty description', () => {
    const { container } = render(<ServiceBody data={null} />)
    expect(container).toBeEmptyDOMElement()
  })
})
