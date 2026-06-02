const IMG_BASE = 'https://image.tmdb.org/t/p/w185'

// displays actor name and profile picture

export default function ActorCard({ actor, isSelected, onSelect }) {
  return (
    <div
      className={`actor-card${isSelected ? ' selected' : ''}`}
      onClick={() => onSelect(isSelected ? null : actor.id)}
    >
      {actor.profile_path ? (
        <img src={`${IMG_BASE}${actor.profile_path}`} alt={actor.name} />
      ) : (
        <div className="actor-card-placeholder" />
      )}
      <p className="actor-name">{actor.name}</p>
    </div>
  )
}
