import ActorCard from './ActorCard'

export default function ResultsList({ actors, selected, onSelect, star1, star2 }) {
  return (
    <div className="results-list">
      {actors.map(actor => (
        <ActorCard
          key={actor.id}
          actor={actor}
          isSelected={actor.id === selected}
          onSelect={onSelect}
          star1={star1}
          star2={star2}
        />
      ))}
    </div>
  )
}
