import { useState, useRef, useEffect } from 'react'
import { searchPersons } from '../service/tmdb'

const IMG_BASE = 'https://image.tmdb.org/t/p/w45'

export default function ActorSearch({ label, value, onChange, disabledId }) {
  const [inputText, setInputText] = useState(value?.name ?? '')
  const [suggestions, setSuggestions] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)

  const debounceRef = useRef(null)
  const containerRef = useRef(null)
  // Prevents the value→inputText sync from overwriting text the user just typed
  const selfClearing = useRef(false)

  // Sync input text when value is set or cleared from outside (e.g. pre-population)
  useEffect(() => {
    if (selfClearing.current) {
      selfClearing.current = false
      return
    }
    setInputText(value?.name ?? '')
    setSuggestions([])
    setIsOpen(false)
  }, [value?.id])

  useEffect(() => {
    function handleMouseDown(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [])

  function handleInputChange(e) {
    const text = e.target.value

    // If an actor is selected, clear it before searching
    if (value) {
      selfClearing.current = true
      onChange(null)
    }

    setInputText(text)
    setFocusedIndex(-1)
    clearTimeout(debounceRef.current)

    if (!text.trim()) {
      setSuggestions([])
      setIsOpen(false)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchPersons(text)
        setSuggestions(results)
        setIsOpen(true)
      } catch {
        setSuggestions([])
      } finally {
        setIsLoading(false)
      }
    }, 300)
  }

  function handleSelect(person) {
    if (person.id === disabledId) return
    setInputText(person.name)
    setSuggestions([])
    setIsOpen(false)
    setFocusedIndex(-1)
    onChange(person)
  }

  function handleClear() {
    setInputText('')
    setSuggestions([])
    setIsOpen(false)
    setFocusedIndex(-1)
    onChange(null)
  }

  function handleKeyDown(e) {
    if (!isOpen || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusedIndex(i => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (focusedIndex >= 0) handleSelect(suggestions[focusedIndex])
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  return (
    <div className={`actor-search${value ? ' actor-search--selected' : ''}`} ref={containerRef}>
      <input
        className="actor-search-input"
        value={inputText}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={label}
        aria-label={label}
        aria-autocomplete="list"
        aria-expanded={isOpen}
      />
      {value && (
        <button className="actor-search-clear" onClick={handleClear} aria-label="Clear selection">✕</button>
      )}
      {isLoading && <span className="actor-search-spinner" />}
      {isOpen && suggestions.length > 0 && (
        <ul className="actor-search-suggestions" role="listbox">
          {suggestions.map((person, i) => {
            const isDisabled = person.id === disabledId
            return (
              <li
                key={person.id}
                className={`actor-search-suggestion${i === focusedIndex ? ' focused' : ''}${isDisabled ? ' disabled' : ''}`}
                role="option"
                aria-selected={i === focusedIndex}
                // Prevent input blur before the click registers
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(person)}
              >
                {person.profile_path
                  ? <img src={`${IMG_BASE}${person.profile_path}`} alt="" />
                  : <div className="actor-search-suggestion-placeholder" />
                }
                <span>{person.name}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
