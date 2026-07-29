export default function FavoritesList({ favorites, onSelect, onRemove }) {
  return (
    <div className="favorites-list">
      {favorites.map((fav) => (
        <div key={`${fav.star1Id}-${fav.star2Id}`} className="favorite-chip">
          <button className="favorite-chip-select" onClick={() => onSelect(fav)}>
            ★ {fav.star1.name} &amp; {fav.star2.name}
          </button>
          <button
            className="favorite-chip-remove"
            onClick={() => onRemove(fav)}
            aria-label={`Remove ${fav.star1.name} & ${fav.star2.name} from favorites`}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
