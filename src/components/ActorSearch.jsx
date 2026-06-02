import { useEffect, useRef, useState } from 'react'
import { searchActors } from '../api/tmdb'

const IMG_BASE = 'https://image.tmdb.org/t/p/w45'

export default function ActorSearch({ selected, onSelect, excludeId, label }) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [open, setOpen] = useState(false)
  const debounceRef = useRef(null)

  useEffect(() => {
    if (selected) setQuery(selected.name)
  }, [selected])

  function handleChange(e) {
    const val = e.target.value
    setQuery(val)
    onSelect(null)
    
    // debounce search
    clearTimeout(debounceRef.current)
    if (!val.trim()) {
      setSuggestions([])
      setOpen(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      const results = await searchActors(val)
      setSuggestions(results.filter(a => a.id !== excludeId)) // won't show the already selected actor
      setOpen(true)
    }, 300)
  }

  function handleSelect(actor) {
    onSelect(actor)
    setSuggestions([])
    setOpen(false)
  }

  return (
    <div className="actor-search">
      <label>{label}</label>
      <input
        value={query}
        onChange={handleChange}
        onBlur={() => setOpen(false)}
        placeholder="Search actor..."
      />
      {open && suggestions.length > 0 && (
        <ul className="suggestions">
          {suggestions.map(actor => (
            <li key={actor.id} onMouseDown={() => handleSelect(actor)}>
              {actor.profile_path ? (
                <img src={`${IMG_BASE}${actor.profile_path}`} alt={actor.name} />
              ) : (
                <div className="suggestion-placeholder" />
              )}
              <span>{actor.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
