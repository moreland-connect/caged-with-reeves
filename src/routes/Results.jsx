import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { findSharedActors } from '../service/tmdb'
import { getCached, setCached } from '../service/resultsCache'
import { getFavorites, addFavorite, removeFavorite } from '../service/favorites'
import StarHeader from '../components/StarHeader'
import ResultsList from '../components/ResultsList'
import MoviePanel from '../components/MoviePanel'

export default function Results() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const star1Id = Number(searchParams.get('star1'))
  const star2Id = Number(searchParams.get('star2'))

  const [star1, setStar1] = useState(null)
  const [star2, setStar2] = useState(null)
  const [phase, setPhase] = useState('loading')
  const [actors, setActors] = useState([])
  const [loadingMsg, setLoadingMsg] = useState('Connecting to TMDB...')
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null)
  const [favorites, setFavorites] = useState([])
  const [favoriteBusy, setFavoriteBusy] = useState(false)

  useEffect(() => {
    if (!star1Id || !star2Id || star1Id === star2Id) {
      navigate('/')
    }
  }, [])

  useEffect(() => {
    getFavorites().then(({ favorites: favs }) => setFavorites(favs)).catch(() => {})
  }, [])

  const isFavorite = favorites.some(f =>
    (f.star1Id === star1Id && f.star2Id === star2Id) ||
    (f.star1Id === star2Id && f.star2Id === star1Id)
  )

  async function toggleFavorite() {
    setFavoriteBusy(true)
    try {
      if (isFavorite) {
        const { favorites: updated } = await removeFavorite(star1Id, star2Id)
        setFavorites(updated)
      } else {
        const { favorites: updated } = await addFavorite(star1Id, star2Id)
        setFavorites(updated)
      }
    } catch {
      // leave favorite state unchanged on failure
    } finally {
      setFavoriteBusy(false)
    }
  }

  // Fetch actor objects for display (runs in parallel with SSE below)
  useEffect(() => {
    if (!star1Id || !star2Id) return
    Promise.all([
      fetch(`/api/person/${star1Id}`).then(r => r.json()),
      fetch(`/api/person/${star2Id}`).then(r => r.json()),
    ]).then(([s1, s2]) => {
      setStar1(s1)
      setStar2(s2)
    }).catch(() => {})
  }, [star1Id, star2Id])

  // Start SSE computation (skip if cached)
  useEffect(() => {
    if (!star1Id || !star2Id || star1Id === star2Id) return

    const cached = getCached(star1Id, star2Id)
    if (cached) {
      setActors(cached)
      setPhase('results')
      return
    }

    const { promise, cancel } = findSharedActors(star1Id, star2Id, setLoadingMsg)
    let active = true

    promise
      .then(({ actors }) => {
        if (active) {
          setCached(star1Id, star2Id, actors)
          setActors(actors)
          setPhase('results')
        }
      })
      .catch(err => {
        if (active) { setError(err.message); setPhase('error') }
      })

    return () => { active = false; cancel() }
  }, [star1Id, star2Id])

  const selectedActor = actors.find(a => a.id === selected) ?? null

  if (phase === 'loading') {
    return (
      <div className="app app--centered">
        {star1 && star2
          ? <StarHeader star1={star1} star2={star2} />
          : <h1 className="title">The Co-Star Connection</h1>
        }
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
        <h1 className="title">The Co-Star Connection</h1>
        <div className="error-screen error-screen--inline">
          <p>Something went wrong: {error}</p>
          <button className="search-new-pair-btn" onClick={() => navigate('/search')}>Try again</button>
        </div>
      </div>
    )
  }

  return (
    <>
      <nav className="app-nav">
        <div className="app-nav-inner">
          <div className="app-nav-left">
            <button className="app-nav-brand app-nav-brand--btn" onClick={() => navigate('/')}>The Co-Star Connection</button>
            <span className="app-nav-version">v2.5</span>
          </div>
          <div className="app-nav-right">
            <button
              className={`favorite-btn${isFavorite ? ' favorite-btn--active' : ''}`}
              onClick={toggleFavorite}
              disabled={favoriteBusy}
            >
              {isFavorite ? '★ Favorited' : '☆ Save as Favorite'}
            </button>
            <button className="search-new-pair-btn" onClick={() => navigate('/search', { state: { star1, star2 } })}>
              Search New Pair
            </button>
          </div>
        </div>
      </nav>
      <div className="app">
        {star1 && star2 && <StarHeader star1={star1} star2={star2} />}
        <p className="subtitle">
          <span className="subtitle-count">{actors.length}</span> shared connections
        </p>
        <div className="content">
          <ResultsList
            actors={actors}
            selected={selected}
            onSelect={setSelected}
            star1={star1}
            star2={star2}
          />
          {selectedActor && star1 && star2 && (
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
