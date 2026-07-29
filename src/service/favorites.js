export async function getFavorites() {
  const res = await fetch('/api/favorites')
  if (!res.ok) throw new Error('Failed to load favorites')
  return res.json()
}

export async function addFavorite(star1Id, star2Id) {
  const res = await fetch('/api/favorites', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ star1Id, star2Id }),
  })
  if (!res.ok) throw new Error('Failed to save favorite')
  return res.json()
}

export async function removeFavorite(star1Id, star2Id) {
  const res = await fetch(`/api/favorites?star1Id=${star1Id}&star2Id=${star2Id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to remove favorite')
  return res.json()
}
