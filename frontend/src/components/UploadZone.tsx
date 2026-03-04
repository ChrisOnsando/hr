import { useCallback, useRef, useState, DragEvent } from 'react'
import { UploadCloud, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { interviewApi } from '../services/api'
import type { Interview } from '../types/interview'

const ALLOWED = ['.mp3', '.wav', '.mp4', '.mov', '.m4a', '.webm', '.ogg', '.flac']
const MAX_SIZE = 100 * 1024 * 1024 // 100MB

type UploadState = 'idle' | 'uploading' | 'success' | 'error'

function getExt(filename: string): string {
  return '.' + (filename.split('.').pop()?.toLowerCase() ?? '')
}

function validateFile(file: File): string | null {
  if (!ALLOWED.includes(getExt(file.name))) {
    return `"${getExt(file.name)}" is not supported. Allowed: ${ALLOWED.join(', ')}`
  }
  if (file.size > MAX_SIZE) {
    return `File is too large. Max size is 100MB.`
  }
  if (file.size === 0) {
    return 'File is empty.'
  }
  return null
}

export function UploadZone({ onUploaded }: { onUploaded: (i: Interview) => void }) {
  const [state, setState] = useState<UploadState>('idle')
  const [errMsg, setErrMsg] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    const error = validateFile(file)
    if (error) {
      setErrMsg(error)
      setState('error')
      return
    }

    setState('uploading')
    setErrMsg('')

    try {
      const result = await interviewApi.upload(file)
      setState('success')
      onUploaded(result)
      setTimeout(() => setState('idle'), 2500)
    } catch (e: any) {
      setErrMsg(e?.response?.data?.detail || 'Upload failed. Please try again.')
      setState('error')
    }
  }, [onUploaded])

  const onDragOver = (e: DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const onDragLeave = (e: DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    // Reset input so same file can be re-uploaded
    e.target.value = ''
  }

  const onClick = () => {
    if (state === 'error') {
      setState('idle')
      setErrMsg('')
    }
    inputRef.current?.click()
  }

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onClick}
      className={[
        'flex flex-col items-center justify-center gap-3 p-10 rounded-xl',
        'border-2 border-dashed cursor-pointer transition-all duration-200 text-center outline-none select-none',
        state === 'idle' && !isDragging ? 'border-stone-300 bg-white hover:border-orange-300 hover:bg-orange-50' : '',
        isDragging ? 'border-orange-400 bg-orange-50 scale-[1.01]' : '',
        state === 'uploading' ? 'border-stone-200 bg-stone-50 pointer-events-none' : '',
        state === 'success' ? 'border-green-400 bg-green-50' : '',
        state === 'error' ? 'border-red-300 bg-red-50' : '',
      ].join(' ')}
    >
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept=".mp3,.wav,.mp4,.mov,.m4a,.webm,.ogg,.flac"
        onChange={onInputChange}
        className="hidden"
      />

      {state === 'idle' && (
        <>
          <div className="p-3 bg-stone-100 rounded-full">
            <UploadCloud className={`w-8 h-8 ${isDragging ? 'text-orange-500' : 'text-stone-400'}`} />
          </div>
          <div>
            <p className="font-semibold text-stone-700">
              {isDragging ? 'Drop it here!' : 'Drag & drop your interview file'}
            </p>
            <p className="text-sm text-stone-500 mt-1">or click to browse</p>
          </div>
          <p className="text-xs text-stone-400 bg-stone-100 px-3 py-1 rounded-full">
            MP3 · WAV · MP4 · MOV · M4A · WEBM · OGG · FLAC — max 100MB
          </p>
        </>
      )}

      {state === 'uploading' && (
        <>
          <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
          <p className="font-semibold text-stone-700">Uploading…</p>
          <p className="text-sm text-stone-400">Please wait</p>
        </>
      )}

      {state === 'success' && (
        <>
          <CheckCircle2 className="w-10 h-10 text-green-500" />
          <p className="font-semibold text-green-700">Upload successful!</p>
          <p className="text-sm text-stone-400">Your interview has been added</p>
        </>
      )}

      {state === 'error' && (
        <>
          <AlertCircle className="w-10 h-10 text-red-500" />
          <p className="font-semibold text-red-700">Upload failed</p>
          <p className="text-sm text-red-500 max-w-xs">{errMsg}</p>
          <p className="text-xs text-stone-400 mt-1">Click to try again</p>
        </>
      )}
    </div>
  )
}
