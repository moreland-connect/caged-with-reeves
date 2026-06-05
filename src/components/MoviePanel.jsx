const TMDB_URL = 'https://www.themoviedb.org/movie'
const POSTER_BASE = 'https://image.tmdb.org/t/p/w92'

function MovieEntry({ movie }) {
  return (
    <li key={movie.id}>
      <a className="panel-movie" href={`${TMDB_URL}/${movie.id}`} target="_blank" rel="noreferrer">
        {movie.poster_path
          ? <img className="panel-movie-poster" src={`${POSTER_BASE}${movie.poster_path}`} alt={movie.title} />
          : <div className="panel-movie-poster panel-movie-poster--blank" />
        }
        <span>{movie.title}</span>
      </a>
    </li>
  )
}

export default function MoviePanel({ actor, cage, reeves, onClose }) {
  const sortedCage = [...actor.cageMovies].sort((a, b) => a.title.localeCompare(b.title))
  const sortedReeves = [...actor.reevesMovies].sort((a, b) => a.title.localeCompare(b.title))

  return (
    <div className="movie-panel">
      <button className="panel-close" onClick={onClose}>✕</button>
      <h2 className="panel-actor">{actor.name}</h2>
      <div className="panel-columns">
        <div className="panel-column">
          <h3>With {cage.name}</h3>
          <ul>{sortedCage.map(m => <MovieEntry key={m.id} movie={m} />)}</ul>
        </div>
        <div className="panel-column">
          <h3>With {reeves.name}</h3>
          <ul>{sortedReeves.map(m => <MovieEntry key={m.id} movie={m} />)}</ul>
        </div>
      </div>
    </div>
  )
}
