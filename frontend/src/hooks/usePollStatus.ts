import { useEffect, useRef, useCallback } from 'react'
import { interviewApi } from '../services/api'
import type { InterviewStatus } from '../types/interview'

interface Options {
  id: string
  enabled: boolean
  onStatusChange: (status: InterviewStatus, message: string) => void
  onComplete: () => void
}

export function usePollStatus({ id, enabled, onStatusChange, onComplete }: Options) {
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  const stop = useCallback(() => {
    if (timer.current) { clearInterval(timer.current); timer.current = null }
  }, [])

  useEffect(() => {
    if (!enabled || !id) return
    timer.current = setInterval(async () => {
      try {
        const { status, message } = await interviewApi.getStatus(id)
        onStatusChange(status, message)
        if (status === 'completed' || status === 'failed') { stop(); onComplete() }
      } catch { /* ignore poll errors */ }
    }, 3000)
    return stop
  }, [enabled, id, onStatusChange, onComplete, stop])
}
