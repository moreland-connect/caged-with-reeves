const IMG_BASE = 'https://image.tmdb.org/t/p/w342'

export default function StarHeader({ star1, star2 }) {
  return (
    <div className="star-header">
      <div className="star">
        {star1.profile_path
          ? <img src={`${IMG_BASE}${star1.profile_path}`} alt={star1.name} />
          : <div className="star-placeholder" />
        }
        <span>{star1.name}</span>
      </div>
      <span className="star-divider">+</span>
      <div className="star">
        {star2.profile_path
          ? <img src={`${IMG_BASE}${star2.profile_path}`} alt={star2.name} />
          : <div className="star-placeholder" />
        }
        <span>{star2.name}</span>
      </div>
    </div>
  )
}
