import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getFavorites, removeFavorite } from '../service/favorites'
import FavoritesList from '../components/FavoritesList'

const CAGE_ID = 2963
const REEVES_ID = 6384

export default function Home() {
  const navigate = useNavigate()
  const [favorites, setFavorites] = useState([])

  useEffect(() => {
    getFavorites()
      .then(({ favorites: favs }) => Promise.all(favs.map((fav) =>
        Promise.all([
          fetch(`/api/person/${fav.star1Id}`).then(r => r.json()),
          fetch(`/api/person/${fav.star2Id}`).then(r => r.json()),
        ]).then(([star1, star2]) => ({ ...fav, star1, star2 }))
      )))
      .then(setFavorites)
      .catch(() => {})
  }, [])

  function goToFavorite(fav) {
    navigate(`/results?star1=${fav.star1Id}&star2=${fav.star2Id}`)
  }

  async function handleRemove(fav) {
    try {
      await removeFavorite(fav.star1Id, fav.star2Id)
      setFavorites((prev) => prev.filter((f) => !(f.star1Id === fav.star1Id && f.star2Id === fav.star2Id)))
    } catch {
      // leave the list unchanged on failure
    }
  }

  return (
    <div className="app app--centered">
      <h1 className="title">
        <span className="title-brand">Caged with Reeves</span>
        <span className="title-presents">presents</span>
        The Co-Star Connection
      </h1>
      <p className="search-hint">Find actors who appeared with both</p>
      <div className="home-ctas">
        <button
          className="try-it-btn"
          onClick={() => navigate(`/results?star1=${CAGE_ID}&star2=${REEVES_ID}`)}
        >
          Try it: Cage &amp; Reeves
        </button>
        <button
          className="search-actors-btn"
          onClick={() => navigate('/search')}
        >
          Search actors
        </button>
      </div>
      {favorites.length > 0 && (
        <div className="home-favorites">
          <p className="search-hint">Your favorites</p>
          <FavoritesList favorites={favorites} onSelect={goToFavorite} onRemove={handleRemove} />
        </div>
      )}
    </div>
  )
}
