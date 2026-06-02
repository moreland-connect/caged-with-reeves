const TMDB_URL = 'https://www.themoviedb.org/movie'

// sort movies by star that was acted with. 

export default function MoviePanel({ actor, star1, star2, onClose }) {
  return (
    <div className="movie-panel">
      <button className="panel-close" onClick={onClose}>✕</button>
      <h2 className="panel-actor">{actor.name}</h2>
      <div className="panel-columns">
        <div className="panel-column">
          <h3>With {star1.name}</h3>
          <ul>
            {[...actor.star1Movies].sort((a, b) => a.title.localeCompare(b.title)).map(m => (
              <li key={m.id}>
                <a href={`${TMDB_URL}/${m.id}`} target="_blank" rel="noreferrer">
                  {m.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className="panel-column">
          <h3>With {star2.name}</h3>
          <ul>
            {[...actor.star2Movies].sort((a, b) => a.title.localeCompare(b.title)).map(m => (
              <li key={m.id}>
                <a href={`${TMDB_URL}/${m.id}`} target="_blank" rel="noreferrer">
                  {m.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
