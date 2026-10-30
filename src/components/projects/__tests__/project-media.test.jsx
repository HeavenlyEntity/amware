import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'

import { ProjectCover, ProjectLogo } from '../project-media'

/* A project added in the admin under a key with no image in code. */
const added = { key: 'not-in-code', name: 'new thing' }

describe('project media for an unknown key', () => {
  it('puts the initial on the logo tile', () => {
    const { container } = render(<ProjectLogo project={added} />)
    expect(container.querySelector('.pj-initial')).toHaveTextContent('N')
  })

  it('draws the placeholder cover instead of crashing', () => {
    const { container } = render(
      <ProjectCover project={added} sizes="640px" alt="New thing" />
    )
    expect(container.querySelector('.pj-cover-fallback')).toHaveAttribute(
      'aria-label',
      'New thing'
    )
    expect(container.querySelector('img')).toBeNull()
  })

  it('keeps the image for a known key', () => {
    const { container } = render(
      <ProjectCover project={{ key: 'gearz', name: 'Gearz' }} sizes="640px" />
    )
    expect(container.querySelector('img')).not.toBeNull()
  })
})
