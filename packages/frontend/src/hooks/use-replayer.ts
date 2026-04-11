'use client'

import { useCallback, useEffect, useReducer, useRef } from 'react'

interface State {
  currentRound: number
  currentTick: number
  isPlaying: boolean
  speed: number
}

type Action =
  | { type: 'play' }
  | { type: 'pause' }
  | { type: 'toggle' }
  | { type: 'set-round'; round: number }
  | { type: 'set-tick'; tick: number }
  | { type: 'set-speed'; speed: number }
  | { type: 'tick' }

interface Options {
  totalRounds: number
  ticksPerRound: number
  initialRound?: number
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'play':
      return { ...state, isPlaying: true }
    case 'pause':
      return { ...state, isPlaying: false }
    case 'toggle':
      return { ...state, isPlaying: !state.isPlaying }
    case 'set-round':
      return { ...state, currentRound: action.round, currentTick: 0 }
    case 'set-tick':
      return { ...state, currentTick: action.tick }
    case 'set-speed':
      return { ...state, speed: action.speed }
    case 'tick':
      return { ...state, currentTick: state.currentTick + 1 }
    default:
      return state
  }
}

export function useReplayer({ totalRounds, ticksPerRound, initialRound = 1 }: Options) {
  const [state, dispatch] = useReducer(reducer, {
    currentRound: initialRound,
    currentTick: 0,
    isPlaying: false,
    speed: 1,
  })

  const rafRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number>(0)

  // Animation loop
  useEffect(() => {
    if (!state.isPlaying) {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      return
    }

    const loop = (time: number) => {
      const dt = time - lastTimeRef.current
      // Tick interval based on speed: each tick = 100ms / speed
      const interval = 100 / state.speed
      if (dt >= interval) {
        lastTimeRef.current = time
        if (state.currentTick + 1 >= ticksPerRound) {
          if (state.currentRound + 1 > totalRounds) {
            dispatch({ type: 'pause' })
          } else {
            dispatch({ type: 'set-round', round: state.currentRound + 1 })
          }
        } else {
          dispatch({ type: 'tick' })
        }
      }
      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
  }, [state.isPlaying, state.speed, state.currentTick, state.currentRound, ticksPerRound, totalRounds])

  return {
    ...state,
    play: useCallback(() => dispatch({ type: 'play' }), []),
    pause: useCallback(() => dispatch({ type: 'pause' }), []),
    toggle: useCallback(() => dispatch({ type: 'toggle' }), []),
    setRound: useCallback((r: number) => dispatch({ type: 'set-round', round: r }), []),
    setTick: useCallback((t: number) => dispatch({ type: 'set-tick', tick: t }), []),
    setSpeed: useCallback((s: number) => dispatch({ type: 'set-speed', speed: s }), []),
    stepBack: useCallback(
      () =>
        dispatch({ type: 'set-tick', tick: Math.max(0, state.currentTick - 5) }),
      [state.currentTick]
    ),
    stepForward: useCallback(
      () =>
        dispatch({
          type: 'set-tick',
          tick: Math.min(ticksPerRound - 1, state.currentTick + 5),
        }),
      [state.currentTick, ticksPerRound]
    ),
    jumpBack: useCallback(() => {
      const r = Math.max(1, state.currentRound - 1)
      dispatch({ type: 'set-round', round: r })
    }, [state.currentRound]),
    jumpForward: useCallback(() => {
      const r = Math.min(totalRounds, state.currentRound + 1)
      dispatch({ type: 'set-round', round: r })
    }, [state.currentRound, totalRounds]),
  }
}
