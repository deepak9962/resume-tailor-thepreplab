'use client'

import { useEffect, useState } from 'react'

export const useElapsedTime = (): number => {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    const startedAt = Date.now()
    const id = setInterval(() => {
      setSeconds(Math.floor((Date.now() - startedAt) / 1000))
    }, 1000)
    return () => {
      clearInterval(id)
    }
  }, [])

  return seconds
}
