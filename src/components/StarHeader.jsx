const IMG_BASE = 'https://image.tmdb.org/t/p/w342'

// displays star1 and star2 profile pictures and names

export default function StarHeader({ star1, star2 }) {
  return (
    <div className="star-header">
      <div className="star">
        <img src={`${IMG_BASE}${star1.profile_path}`} alt={star1.name} />
        <span>{star1.name}</span>
      </div>
      <span className="star-divider">+</span>
      <div className="star">
        <img src={`${IMG_BASE}${star2.profile_path}`} alt={star2.name} />
        <span>{star2.name}</span>
      </div>
    </div>
  )
}
