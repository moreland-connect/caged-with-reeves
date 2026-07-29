export async function login(username, password) {
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({}))
    throw new Error(error || 'Login failed')
  }
  return res.json()
}

export async function signup(username, password) {
  const res = await fetch('/api/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({}))
    throw new Error(error || 'Signup failed')
  }
  return res.json()
}

export async function logout() {
  await fetch('/api/logout', { method: 'POST' })
}

export async function getSession() {
  const res = await fetch('/api/session')
  if (!res.ok) throw new Error('Session check failed')
  return res.json()
}
