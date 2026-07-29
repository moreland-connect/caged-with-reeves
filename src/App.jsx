import { useEffect, useState } from 'react'
import { findSharedActors } from './service/tmdb'
import StarHeader from './components/StarHeader'
import ResultsList from './components/ResultsList'
import MoviePanel from './components/MoviePanel'
import ActorSearch from './components/ActorSearch'
import './index.css'
import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import RequireAuth from './components/RequireAuth'
import LogoutButton from './components/LogoutButton'
import Home from './routes/Home'
import Search from './routes/Search'
import Results from './routes/Results'
import Login from './routes/Login'
import Signup from './routes/Signup'

export default function App() {
  return (
    <AuthProvider>
      <LogoutButton />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route element={<RequireAuth />}>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<Search />} />
          <Route path="/results" element={<Results />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}