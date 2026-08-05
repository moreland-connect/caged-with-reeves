import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '../context/AuthContext'
import { signupSchema } from '../schemas/auth'

export default function Signup() {
  const [error, setError] = useState(null)
  const { signup } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: { username: '', password: '', confirmPassword: '' },
  })

  async function onSubmit({ username, password }) {
    setError(null)
    try {
      await signup(username, password)
      const from = location.state?.from
      navigate(from ? `${from.pathname}${from.search}` : '/', { replace: true })
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="app app--centered">
      <h1 className="title">Caged with Reeves</h1>
      <form className="login-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <input
          className="actor-search-input"
          type="text"
          placeholder="Username"
          autoFocus
          {...register('username')}
        />
        {errors.username && <p className="selection-error">{errors.username.message}</p>}
        <input
          className="actor-search-input"
          type="password"
          placeholder="Password"
          {...register('password')}
        />
        {errors.password && <p className="selection-error">{errors.password.message}</p>}
        <input
          className="actor-search-input"
          type="password"
          placeholder="Confirm password"
          {...register('confirmPassword')}
        />
        {errors.confirmPassword && <p className="selection-error">{errors.confirmPassword.message}</p>}
        {error && <p className="selection-error">{error}</p>}
        <button className="try-it-btn" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account…' : 'Sign up'}
        </button>
        <Link className="search-back-btn" to="/login" state={location.state}>
          Already have an account? Log in
        </Link>
      </form>
    </div>
  )
}
