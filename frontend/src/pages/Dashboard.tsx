import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mic, Search, FileAudio, ChevronRight, RefreshCw, SlidersHorizontal } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { interviewApi } from '../services/api'
import { UploadZone } from '../components/UploadZone'
import { StatusBadge } from '../components/StatusBadge'
import type { Interview, InterviewListItem, InterviewStatus } from '../types/interview'

function formatBytes(b: number) {
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 ** 2).toFixed(1)} MB`
}

const STATUS_OPTIONS = ['', 'uploaded', 'processing', 'completed', 'failed']
const STATUS_LABELS: Record<string, string> = {
  '': 'All', uploaded: 'Uploaded', processing: 'Processing',
  completed: 'Completed', failed: 'Failed',
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [interviews, setInterviews] = useState<InterviewListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [error, setError] = useState('')

  const fetch = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await interviewApi.list(search || undefined, statusFilter || undefined)
      // Double check that data is an array before setting state
      setInterviews(Array.isArray(data) ? data : [])
    } catch (err) { 
      console.error(err)
      setError('Could not reach the backend. Is it running?') 
      setInterviews([]) // Prevent .map error on failure
    } finally { 
      setLoading(false) 
    }
  }, [search, statusFilter])

  useEffect(() => { 
    const t = setTimeout(fetch, 300)
    return () => clearTimeout(t) 
  }, [fetch])

  const handleUploaded = (iv: Interview) => {
    setInterviews(prev => [{
      id: iv.id, 
      original_name: iv.original_name, 
      file_size: iv.file_size,
      upload_date: iv.upload_date, 
      status: iv.status as InterviewStatus, 
      created_at: iv.created_at,
    }, ...prev])
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <nav className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-2">
          <div className="p-1.5 bg-orange-100 rounded-lg">
            <Mic className="w-4 h-4 text-orange-600" />
          </div>
          <span className="font-semibold text-stone-800 tracking-tight">HR Interview Transcription API</span>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <section>
          <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-3">
            New Interview
          </h2>
          <UploadZone onUploaded={handleUploaded} />
        </section>

        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wider">
              All Interviews
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-sm bg-white border border-stone-200 rounded-lg outline-none focus:border-orange-400 transition w-44"
                />
              </div>
              <div className="relative">
                <SlidersHorizontal className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 pointer-events-none" />
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-sm bg-white border border-stone-200 rounded-lg outline-none focus:border-orange-400 transition appearance-none cursor-pointer"
                >
                  {STATUS_OPTIONS.map(s => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={fetch}
                className="p-1.5 rounded-lg border border-stone-200 bg-white text-stone-500 hover:text-orange-500 hover:border-orange-300 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16 text-stone-400">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading…
            </div>
          ) : (interviews && interviews.length === 0) ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-stone-400 bg-white rounded-xl border-2 border-dashed border-stone-200">
              <FileAudio className="w-10 h-10" />
              <p className="text-sm">No interviews yet. Upload one above.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {/* Added optional chaining here for maximum safety */}
              {interviews?.map((iv, i) => (
                <li
                  key={iv.id}
                  onClick={() => navigate(`/interviews/${iv.id}`)}
                  className="flex items-center gap-4 p-4 bg-white border border-stone-200 rounded-xl cursor-pointer hover:border-orange-300 hover:shadow-sm transition-all animate-slide-up group"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className="p-2 bg-stone-100 rounded-lg group-hover:bg-orange-50 transition">
                    <FileAudio className="w-5 h-5 text-stone-500 group-hover:text-orange-500 transition" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-stone-800 truncate">{iv.original_name}</p>
                    <p className="text-xs text-stone-400 mt-0.5">
                      {formatBytes(iv.file_size)} · {iv.created_at ? formatDistanceToNow(new Date(iv.created_at), { addSuffix: true }) : 'Recently'}
                    </p>
                  </div>
                  <StatusBadge status={iv.status} />
                  <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-orange-400 transition flex-shrink-0" />
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}
