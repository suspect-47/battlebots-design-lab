import { Component } from 'react'

// Keeps one broken view from taking down the whole app. Without this, any render
// error anywhere inside a tab unmounts the entire React tree and leaves a white
// screen with no way back — the user loses their build along with it.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // Left in deliberately: without it a caught error is invisible in production.
    console.error(`[${this.props.label || 'view'}] render failed`, error, info)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <div className="eb" role="alert">
        <h2 className="eb-title">This panel stopped working</h2>
        <p className="eb-body">
          Something in {this.props.label || 'this view'} failed to render. The rest of the
          app is still running, and your build has not been touched.
        </p>
        <pre className="eb-detail">{String(error?.message || error)}</pre>
        <button type="button" className="btn btn-cyan" onClick={() => this.setState({ error: null })}>
          Try again
        </button>
      </div>
    )
  }
}
