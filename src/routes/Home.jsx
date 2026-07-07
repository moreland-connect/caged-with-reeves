import { useNavigate } from 'react-router-dom'

const CAGE_ID = 2963
const REEVES_ID = 6384

export default function Home() {
  const navigate = useNavigate()

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
    </div>
  )
}
