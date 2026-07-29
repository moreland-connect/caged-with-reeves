import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import ActorSearch from '../components/ActorSearch'

export default function Search() {
  const [star1, setStar1] = useState(null)
  const [star2, setStar2] = useState(null)
  const navigate = useNavigate()
  const { state } = useLocation()
  const prev = state?.star1 && state?.star2 ? state : null

  useEffect(() => {
    if (!star1 || !star2 || star1.id === star2.id) return
    navigate(`/results?star1=${star1.id}&star2=${star2.id}`)
  }, [star1?.id, star2?.id])

  const isDuplicate = star1 && star2 && star1.id === star2.id

  return (
    <div className="app app--centered">
      {prev ? (
        <button
          className="search-back-btn"
          onClick={() => navigate(`/results?star1=${prev.star1.id}&star2=${prev.star2.id}`)}
        >
          ← {prev.star1.name} &amp; {prev.star2.name}
        </button>
      ) : (
        <button className="search-back-btn" onClick={() => navigate('/')}>
          ← Home
        </button>
      )}
      <h1 className="title">
        <span className="title-brand">Caged with Reeves</span>
        <span className="title-presents">presents</span>
        The Co-Star Connection
      </h1>
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
          variant="b"
        />
      </div>
      {isDuplicate && (
        <p className="selection-error">Please select two different actors.</p>
      )}
    </div>
  )
}
