import { useEffect, useState } from 'react'
import { findSharedActors } from './service/tmdb'
import StarHeader from './components/StarHeader'
import ResultsList from './components/ResultsList'
import MoviePanel from './components/MoviePanel'
import './index.css'

export default function App() {
  const [stars, setStars] = useState(null)
  const [actors, setActors] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMsg, setLoadingMsg] = useState('Connecting to TMDB...')
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    findSharedActors(setLoadingMsg)
      .then(({ cage, reeves, actors }) => {
        setStars({ cage, reeves })
        setActors(actors)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  const selectedActor = actors.find(a => a.id === selected) ?? null

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p className="loading-msg">{loadingMsg}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="error-screen">
        <p>Something went wrong: {error}</p>
      </div>
    )
  }

  return (
    <div className="app">
      <h1 className="title">Caged with Reeves</h1>
      {stars && <StarHeader cage={stars.cage} reeves={stars.reeves} />}
      <p className="subtitle">{actors.length} actors have appeared with both</p>
      <div className="content">
        <ResultsList actors={actors} selected={selected} onSelect={setSelected} />
        {selectedActor && (
          <MoviePanel
            actor={selectedActor}
            cage={stars.cage}
            reeves={stars.reeves}
            onClose={() => setSelected(null)}
          />
        )}
      </div>
    </div>
  )
}
