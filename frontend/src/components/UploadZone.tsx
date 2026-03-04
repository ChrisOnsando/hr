import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { UploadCloud, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { interviewApi } from '../services/api'
import type { Interview } from '../types/interview'

const ALLOWED_EXTENSIONS = ['.mp3', '.wav', '.mp4', '.mov', '.m4a', '.webm', '.ogg', '.flac']

type UploadState = 'idle' | 'uploading' | 'success' | 'error'

export function UploadZone({ onUploaded }: { onUploaded: (i: Interview) => void }) {
  const [state, setState] = useState<UploadState>('idle')
  const [errMsg, setErrMsg] = useState('')

  const onDrop = useCallback(async (acceptedFiles: File[], rejectedFiles: any[]) => {
    // Handle rejected files
    if (!acceptedFiles.length) {
      const msg = rejectedFiles[0]?.errors[0]?.message || 'File not supported.'
      setErrMsg(msg)
      setState('error')
      return
    }

    setState('uploading')
    setErrMsg('')

    try {
      const result = await interviewApi.upload(acceptedFiles[0])
      setState('success')
      onUploaded(result)
      setTimeout(() => setState('idle'), 2500)
    } catch (e: any) {
      const msg = e?.response?.data?.detail || 'Upload failed. Please try again.'
      setErrMsg(msg)
      setState('error')
    }
  }, [onUploaded])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    disabled: state === 'uploading',
    // Validate by extension only — avoids all MIME type issues across browsers/OS
    validator: (file) => {
      const ext = '.' + (file.name.split('.').pop()?.toLowerCase() ?? '')
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return {
          code: 'file-invalid-type',
          message: `"${ext}" is not supported. Allowed formats: ${ALLOWED_EXTENSIONS.join(', ')}`,
        }
      }
      return null
    },
  })

  return (
    <div
      {...getRootProps()}
      onClick={(e) => {
        // Reset error state on click so user can retry
        if (state === 'error') {
          setState('idle')
          setErrMsg('')
        }
        getRootProps().onClick?.(e)
      }}
      className={[
        'flex flex-col items-center justify-center gap-3 p-10 rounded-xl',
        'border-2 border-dashed cursor-pointer transition-all duration-200 text-center outline-none',
        state === 'idle' && !isDragActive ? 'border-stone-300 bg-white hover:border-orange-300 hover:bg-orange-50' : '',
        isDragActive ? 'border-orange-400 bg-orange-50 scale-[1.01]' : '',
        state === 'uploading' ? 'border-stone-200 bg-stone-50 pointer-events-none' : '',
        state === 'success' ? 'border-green-400 bg-green-50' : '',
        state === 'error' ? 'border-red-300 bg-red-50' : '',
      ].join(' ')}
    >
      <input {...getInputProps()} />

      {state === 'idle' && (
        <>
          <div className="p-3 bg-stone-100 rounded-full">
            <UploadCloud className={`w-8 h-8 ${isDragActive ? 'text-orange-500' : 'text-stone-400'}`} />
          </div>
          <div>
            <p className="font-semibold text-stone-700">
              {isDragActive ? 'Drop it here!' : 'Drag & drop your interview file'}
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
