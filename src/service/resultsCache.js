const cache = new Map()

export function getCached(star1Id, star2Id) {
  return cache.get(`${star1Id}-${star2Id}`) ?? null
}

export function setCached(star1Id, star2Id, data) {
  cache.set(`${star1Id}-${star2Id}`, data)
}
