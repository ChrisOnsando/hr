import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Wand2, Download, FileText, Tag,
  MessageSquare, ThumbsUp, Loader2, AlertTriangle, AudioLines,
} from 'lucide-react'
import { format } from 'date-fns'
import { interviewApi } from '../services/api'
import { usePollStatus } from '../hooks/usePollStatus'
import { StatusBadge } from '../components/StatusBadge'
import type { Interview } from '../types/interview'

function formatBytes(b: number) {
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 ** 2).toFixed(1)} MB`
}

const SENTIMENT_COLORS: Record<string, string> = {
  Positive: 'text-green-600', Negative: 'text-red-500',
  Neutral: 'text-stone-500', Mixed: 'text-amber-600',
}

export default function InterviewDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [interview, setInterview] = useState<Interview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [triggering, setTriggering] = useState(false)
  const [polling, setPolling] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')

  const fetchInterview = useCallback(async () => {
    if (!id) return
    try {
      const data = await interviewApi.get(id)
      setInterview(data)
      if (data.status === 'processing') setPolling(true)
    } catch { setError('Interview not found.') }
    finally { setLoading(false) }
  }, [id])

  useEffect(() => { fetchInterview() }, [fetchInterview])

  usePollStatus({
    id: id ?? '',
    enabled: polling,
    onStatusChange: (status, message) => {
      setInterview(p => p ? { ...p, status } : p)
      setStatusMsg(message)
    },
    onComplete: () => { setPolling(false); fetchInterview() },
  })

  const triggerTranscription = async () => {
    if (!id) return
    setTriggering(true)
    try {
      await interviewApi.transcribe(id)
      setInterview(p => p ? { ...p, status: 'processing' } : p)
      setPolling(true)
      setStatusMsg('Transcription started. This may take a few minutes…')
    } catch { setError('Failed to start transcription.') }
    finally { setTriggering(false) }
  }

  const exportTranscript = () => {
    if (!interview?.transcript) return
    const lines = [
      `Interview: ${interview.original_name}`,
      `Date: ${format(new Date(interview.upload_date), 'PPpp')}`, '',
      '=== TRANSCRIPT ===', '', interview.transcript,
    ]
    if (interview.ai_analysis?.summary)
      lines.push('', '=== SUMMARY ===', '', interview.ai_analysis.summary)
    if (interview.ai_analysis?.keywords?.length)
      lines.push('', '=== KEYWORDS ===', '', interview.ai_analysis.keywords.join(', '))
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: `${interview.original_name.replace(/\.[^.]+$/, '')}_transcript.txt`,
    })
    a.click()
  }

  if (loading) return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
    </div>
  )

  if (error || !interview) return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center gap-4 text-stone-500">
      <AlertTriangle className="w-10 h-10 text-red-400" />
      <p>{error || 'Interview not found'}</p>
      <button onClick={() => navigate('/')} className="text-sm text-orange-600 hover:underline">
        ← Back to Dashboard
      </button>
    </div>
  )

  const ai = interview.ai_analysis

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Nav */}
      <nav className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-orange-600 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </button>
          <span className="text-stone-300">/</span>
          <span className="text-sm text-stone-600 truncate font-medium">{interview.original_name}</span>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Header card */}
        <div className="bg-white border border-stone-200 rounded-xl p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-orange-50 rounded-xl">
                <AudioLines className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <h1 className="font-semibold text-stone-800 text-lg leading-tight">
                  {interview.original_name}
                </h1>
                <p className="text-sm text-stone-400 mt-0.5">
                  {formatBytes(interview.file_size)} · Uploaded {format(new Date(interview.upload_date), 'PPp')}
                </p>
              </div>
            </div>
            <StatusBadge status={interview.status} />
          </div>
        </div>

        {/* Processing banner */}
        {polling && (
          <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
            <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
            {statusMsg || 'Processing…'}
          </div>
        )}

        {/* Transcribe CTA */}
        {(interview.status === 'uploaded' || interview.status === 'failed') && (
          <div className="flex items-center justify-between gap-4 flex-wrap bg-stone-800 text-white rounded-xl px-5 py-4">
            <div>
              <p className="font-semibold">
                {interview.status === 'failed' ? 'Transcription Failed' : 'Ready to Transcribe'}
              </p>
              <p className="text-sm text-stone-400 mt-0.5">
                {interview.status === 'failed'
                  ? 'An error occurred. You can retry below.'
                  : 'Start AI transcription and analysis on this recording.'}
              </p>
            </div>
            <button
              onClick={triggerTranscription}
              disabled={triggering}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition"
            >
              {triggering
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Starting…</>
                : <><Wand2 className="w-4 h-4" /> {interview.status === 'failed' ? 'Retry' : 'Transcribe & Analyse'}</>
              }
            </button>
          </div>
        )}

        {/* AI Analysis */}
        {interview.status === 'completed' && ai && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
                <Wand2 className="w-4 h-4 text-orange-500" /> AI Analysis
              </h2>
              <button
                onClick={exportTranscript}
                className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-orange-600 border border-stone-200 hover:border-orange-300 bg-white px-3 py-1.5 rounded-lg transition"
              >
                <Download className="w-3.5 h-3.5" /> Export
              </button>
            </div>

            {/* Summary */}
            {ai.summary && (
              <div className="bg-white border border-stone-200 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-orange-500" />
                  <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Summary</h3>
                </div>
                <p className="text-stone-700 text-sm leading-relaxed">{ai.summary}</p>
              </div>
            )}

            {/* Sentiment + Keywords row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {ai.sentiment && (
                <div className="bg-white border border-stone-200 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <ThumbsUp className="w-4 h-4 text-orange-500" />
                    <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Sentiment</h3>
                  </div>
                  <p className={`text-2xl font-semibold font-mono ${SENTIMENT_COLORS[ai.sentiment] ?? 'text-stone-600'}`}>
                    {ai.sentiment}
                  </p>
                </div>
              )}

              {ai.keywords?.length ? (
                <div className="bg-white border border-stone-200 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Tag className="w-4 h-4 text-orange-500" />
                    <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Keywords</h3>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {ai.keywords.map(k => (
                      <span key={k} className="px-2.5 py-0.5 bg-stone-100 text-stone-700 text-xs rounded-full font-medium">
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Questions */}
            {ai.questions?.length ? (
              <div className="bg-white border border-stone-200 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="w-4 h-4 text-orange-500" />
                  <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                    Questions Detected
                  </h3>
                </div>
                <ol className="space-y-2">
                  {ai.questions.map((q, i) => (
                    <li key={i} className="flex gap-3 text-sm text-stone-700">
                      <span className="flex-shrink-0 w-5 h-5 bg-orange-100 text-orange-600 rounded-full text-xs flex items-center justify-center font-medium">
                        {i + 1}
                      </span>
                      {q}
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
          </section>
        )}

        {/* Transcript */}
        {interview.transcript && (
          <section>
            <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wider flex items-center gap-1.5 mb-3">
              <FileText className="w-4 h-4 text-orange-500" /> Full Transcript
            </h2>
            <div className="bg-stone-900 rounded-xl p-5 max-h-[480px] overflow-y-auto">
              <pre className="font-mono text-sm text-stone-300 whitespace-pre-wrap leading-relaxed">
                {interview.transcript}
              </pre>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
