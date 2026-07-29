import { useAuth } from '../context/AuthContext'

export default function LogoutButton() {
  const { user, logout } = useAuth()
  if (!user) return null
  return (
    <button className="logout-btn" onClick={logout}>
      Log out
    </button>
  )
}
