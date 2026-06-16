import { useEffect, useState } from 'react'
import { findSharedActors } from './service/tmdb'
import StarHeader from './components/StarHeader'
import ResultsList from './components/ResultsList'
import MoviePanel from './components/MoviePanel'
import ActorSearch from './components/ActorSearch'
import './index.css'

const CAGE_ID = 2963
const REEVES_ID = 6384

export default function App() {
  const [star1, setStar1] = useState(null)
  const [star2, setStar2] = useState(null)
  const [phase, setPhase] = useState('selecting') // 'selecting' | 'loading' | 'results' | 'error'
  const [actors, setActors] = useState([])
  const [loadingMsg, setLoadingMsg] = useState('Connecting to TMDB...')
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null)

  // Pre-populate with Cage and Reeves on mount
  useEffect(() => {
    Promise.all([
      fetch(`/api/person/${CAGE_ID}`).then(r => r.json()),
      fetch(`/api/person/${REEVES_ID}`).then(r => r.json()),
    ]).then(([cage, reeves]) => {
      setStar1(cage)
      setStar2(reeves)
    }).catch(() => {
      // Server unavailable — leave boxes empty for manual search
    })
  }, [])

  // Auto-trigger computation whenever both stars are set and distinct
  useEffect(() => {
    if (!star1 || !star2 || star1.id === star2.id) return

    setPhase('loading')
    setLoadingMsg('Connecting to TMDB...')
    setActors([])
    setSelected(null)

    const { promise, cancel } = findSharedActors(star1.id, star2.id, setLoadingMsg)
    let active = true

    promise
      .then(({ actors }) => {
        if (active) { setActors(actors); setPhase('results') }
      })
      .catch(err => {
        if (active) { setError(err.message); setPhase('error') }
      })

    return () => { active = false; cancel() }
  }, [star1?.id, star2?.id])

  function handleSearchNewPair() {
    setStar1(null)
    setStar2(null)
    setSelected(null)
    setError(null)
    setPhase('selecting')
  }

  const selectedActor = actors.find(a => a.id === selected) ?? null
  const isDuplicate = star1 && star2 && star1.id === star2.id

  if (phase === 'selecting') {
    return (
      <div className="app app--centered">
        <h1 className="title">Caged with Reeves</h1>
        <p className="search-hint">Find actors who appeared with both</p>
        <div className="actor-selection">
          <ActorSearch
            label="Search for an actor..."
            value={star1}
            onChange={setStar1}
            disabledId={star2?.id ?? null}
          />
          <span className="selection-divider">+</span>
          <ActorSearch
            label="Search for an actor..."
            value={star2}
            onChange={setStar2}
            disabledId={star1?.id ?? null}
          />
        </div>
        {isDuplicate && (
          <p className="selection-error">Please select two different actors.</p>
        )}
      </div>
    )
  }

  if (phase === 'loading') {
    return (
      <div className="app app--centered">
        <h1 className="title">Caged with Reeves</h1>
        <div className="loading-screen loading-screen--inline">
          <div className="loading-spinner" />
          <p className="loading-msg">{loadingMsg}</p>
        </div>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className="app app--centered">
        <h1 className="title">Caged with Reeves</h1>
        <div className="error-screen error-screen--inline">
          <p>Something went wrong: {error}</p>
          <button className="search-new-pair-btn" onClick={handleSearchNewPair}>Try again</button>
        </div>
      </div>
    )
  }

  return (
    <>
      <nav className="app-nav">
        <div className="app-nav-inner">
          <div className="app-nav-left">
            <span className="app-nav-brand">Caged with Reeves</span>
            <span className="app-nav-version">v2.0</span>
          </div>
          <button className="search-new-pair-btn" onClick={handleSearchNewPair}>
            Search New Pair
          </button>
        </div>
      </nav>
      <div className="app">
        <StarHeader star1={star1} star2={star2} />
        <p className="subtitle">
          <span className="subtitle-count">{actors.length}</span> shared connections
        </p>
        <div className="content">
          <ResultsList actors={actors} selected={selected} onSelect={setSelected} star1={star1} star2={star2} />
          {selectedActor && (
            <MoviePanel
              actor={selectedActor}
              star1={star1}
              star2={star2}
              onClose={() => setSelected(null)}
            />
          )}
        </div>
      </div>
    </>
  )
}
