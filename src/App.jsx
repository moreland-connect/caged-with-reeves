import { useEffect, useState } from 'react'
import { getPerson, findSharedActors } from './api/tmdb'
import StarHeader from './components/StarHeader'
import ActorSearch from './components/ActorSearch'
import ResultsList from './components/ResultsList'
import MoviePanel from './components/MoviePanel'
import './index.css'

export default function App() {
  const [star1, setStar1] = useState(null)
  const [star2, setStar2] = useState(null)
  const [resultStars, setResultStars] = useState(null)
  const [actors, setActors] = useState([])
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null)

  // Starts with Reeves and Cage loaded in the search
  useEffect(() => {
    async function init() {
      const [cage, reeves] = await Promise.all([
        getPerson('Nicolas Cage'),
        getPerson('Keanu Reeves'),
      ])
      setStar1(cage)
      setStar2(reeves)
      runSearch(cage, reeves)
    }
    init()
  }, [])

  async function runSearch(s1, s2) {
    if (!s1 || !s2) return
    setLoading(true)
    setLoadingMsg('Starting...')
    setSelected(null)
    setError(null)
    setSearched(false)
    try {
      const results = await findSharedActors(s1, s2, setLoadingMsg)
      setActors(results)
      setResultStars({ star1: s1, star2: s2 })
      setSearched(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const selectedActor = actors.find(a => a.id === selected) ?? null
  const canSearch = star1 && star2 && !loading

  return (
    <div className="app">
      <h1 className="title">Caged with Reeves</h1>
      <div className="search-form">
        <ActorSearch
          selected={star1}
          onSelect={setStar1}
          excludeId={star2?.id}
          label="First Actor"
        />
        <span className="search-divider">+</span>
        <ActorSearch
          selected={star2}
          onSelect={setStar2}
          excludeId={star1?.id}
          label="Second Actor"
        />
        <button
          className="search-btn"
          disabled={!canSearch}
          onClick={() => runSearch(star1, star2)}
        >
          Search
        </button>
      </div>

      {loading && (
        <div className="loading-inline">
          <div className="loading-spinner" />
          <p className="loading-msg">{loadingMsg}</p>
        </div>
      )}

      {!loading && error && (
        <div className="error-screen">
          <p>Something went wrong: {error}</p>
        </div>
      )}

      {!loading && searched && (
        <>
          <StarHeader star1={resultStars.star1} star2={resultStars.star2} />
          {actors.length === 0 ? (
            <p className="no-results">
              No shared actors found between {resultStars.star1.name} and {resultStars.star2.name}.
            </p>
          ) : (
            <>
              <p className="subtitle">{actors.length} actors have appeared with both</p>
              <div className="content">
                <ResultsList actors={actors} selected={selected} onSelect={setSelected} />
                {selectedActor && (
                  <MoviePanel
                    actor={selectedActor}
                    star1={resultStars.star1}
                    star2={resultStars.star2}
                    onClose={() => setSelected(null)}
                  />
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
