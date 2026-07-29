// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ActorSearch from './ActorSearch'
import { searchPersons } from '../service/tmdb'

vi.mock('../service/tmdb', () => ({
  searchPersons: vi.fn(),
}))

const CAGE = { id: 2963, name: 'Nicolas Cage', profile_path: null }
const REEVES = { id: 6384, name: 'Keanu Reeves', profile_path: null }

beforeEach(() => {
  vi.useFakeTimers()
  searchPersons.mockReset()
})

afterEach(() => {
  vi.useRealTimers()
})

function typeInto(input, text) {
  fireEvent.change(input, { target: { value: text } })
}

describe('ActorSearch', () => {
  it('does not search immediately, waiting out the 300ms debounce', async () => {
    searchPersons.mockResolvedValue([CAGE])
    render(<ActorSearch label="Actor 1" value={null} onChange={vi.fn()} />)
    const input = screen.getByRole('textbox', { name: 'Actor 1' })

    typeInto(input, 'cage')
    expect(searchPersons).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(300)
    expect(searchPersons).toHaveBeenCalledWith('cage')
  })

  it('shows suggestions once the debounced search resolves', async () => {
    searchPersons.mockResolvedValue([CAGE])
    render(<ActorSearch label="Actor 1" value={null} onChange={vi.fn()} />)
    const input = screen.getByRole('textbox', { name: 'Actor 1' })

    typeInto(input, 'cage')
    await vi.advanceTimersByTimeAsync(300)

    expect(screen.getByText('Nicolas Cage')).toBeInTheDocument()
  })

  it('selects a suggestion on click and calls onChange', async () => {
    searchPersons.mockResolvedValue([CAGE])
    const onChange = vi.fn()
    render(<ActorSearch label="Actor 1" value={null} onChange={onChange} />)
    const input = screen.getByRole('textbox', { name: 'Actor 1' })

    typeInto(input, 'cage')
    await vi.advanceTimersByTimeAsync(300)
    fireEvent.click(screen.getByText('Nicolas Cage'))

    expect(onChange).toHaveBeenCalledWith(CAGE)
  })

  it('navigates suggestions with arrow keys and selects the focused one with Enter', async () => {
    searchPersons.mockResolvedValue([CAGE, REEVES])
    const onChange = vi.fn()
    render(<ActorSearch label="Actor 1" value={null} onChange={onChange} />)
    const input = screen.getByRole('textbox', { name: 'Actor 1' })

    typeInto(input, 'a')
    await vi.advanceTimersByTimeAsync(300)
    screen.getByText('Nicolas Cage')

    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onChange).toHaveBeenCalledWith(REEVES)
  })

  it('does not select the actor matching disabledId', async () => {
    searchPersons.mockResolvedValue([CAGE, REEVES])
    const onChange = vi.fn()
    render(<ActorSearch label="Actor 2" value={null} onChange={onChange} disabledId={CAGE.id} />)
    const input = screen.getByRole('textbox', { name: 'Actor 2' })

    typeInto(input, 'a')
    await vi.advanceTimersByTimeAsync(300)
    fireEvent.click(screen.getByText('Nicolas Cage'))

    expect(onChange).not.toHaveBeenCalled()
  })

  it('clears the selection when the clear button is clicked', () => {
    const onChange = vi.fn()
    render(<ActorSearch label="Actor 1" value={CAGE} onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Clear selection' }))

    expect(onChange).toHaveBeenCalledWith(null)
  })
})
