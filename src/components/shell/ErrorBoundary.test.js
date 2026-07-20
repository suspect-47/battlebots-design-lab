import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement as h } from 'react'
import ErrorBoundary from './ErrorBoundary.jsx'

// React only runs error boundaries while rendering on the client, so
// renderToStaticMarkup will never trigger one. The class is exercised directly
// instead: the state transition via getDerivedStateFromError, then the fallback
// element it actually renders.
const fallbackHtml = (props = {}, error = new Error('kaboom')) => {
  const boundary = new ErrorBoundary(props)
  boundary.state = ErrorBoundary.getDerivedStateFromError(error)
  return renderToStaticMarkup(boundary.render())
}

afterEach(() => { vi.restoreAllMocks() })

describe('ErrorBoundary', () => {
  it('renders its children when nothing is wrong', () => {
    const html = renderToStaticMarkup(
      h(ErrorBoundary, { label: 'the agents view' }, h('p', null, 'still here')),
    )
    expect(html).toMatch(/still here/)
  })

  it('captures the error into state rather than rethrowing', () => {
    expect(ErrorBoundary.getDerivedStateFromError(new Error('kaboom'))).toEqual({ error: expect.any(Error) })
  })

  it('shows a recoverable message instead of blanking the app', () => {
    const html = fallbackHtml({ label: 'the agents view' })
    expect(html).toMatch(/stopped working/i)
    expect(html).toMatch(/the agents view/)
    expect(html).toMatch(/Try again/)
  })

  it('surfaces the underlying message so the failure is diagnosable', () => {
    expect(fallbackHtml()).toMatch(/kaboom/)
  })

  it('reassures the user their build is intact', () => {
    expect(fallbackHtml()).toMatch(/has not been touched/)
  })

  it('marks the fallback as an alert for assistive tech', () => {
    expect(fallbackHtml()).toMatch(/role="alert"/)
  })

  it('logs the failure — a silently caught error is undebuggable in production', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const boundary = new ErrorBoundary({ label: 'the agents view' })
    boundary.componentDidCatch(new Error('kaboom'), { componentStack: '' })
    expect(spy).toHaveBeenCalled()
  })
})
