const IMG_BASE = 'https://image.tmdb.org/t/p/w185'

export default function ActorCard({ actor, isSelected, onSelect, star1, star2 }) {
  return (
    <div
      className={`actor-card${isSelected ? ' selected' : ''}`}
      onClick={() => onSelect(isSelected ? null : actor.id)}
    >
      <div className="actor-card-media">
        {actor.profile_path ? (
          <img src={`${IMG_BASE}${actor.profile_path}`} alt={actor.name} />
        ) : (
          <div className="actor-card-placeholder" />
        )}
        <p className="actor-name">{actor.name}</p>
      </div>
      {star1 && star2 && (
        <div className="actor-tooltip">
          <div className="actor-tooltip-row">
            <span className="actor-tooltip-count">{actor.star1Movies.length}</span>
            <span className="actor-tooltip-label"> with {star1.name}</span>
          </div>
          <div className="actor-tooltip-row">
            <span className="actor-tooltip-count">{actor.star2Movies.length}</span>
            <span className="actor-tooltip-label"> with {star2.name}</span>
          </div>
        </div>
      )}
    </div>
  )
}
