import type { InterviewStatus } from '../types/interview'

const styles: Record<InterviewStatus, string> = {
  uploaded:   'bg-blue-50 text-blue-700 ring-blue-200',
  processing: 'bg-amber-50 text-amber-700 ring-amber-200',
  completed:  'bg-green-50 text-green-700 ring-green-200',
  failed:     'bg-red-50 text-red-700 ring-red-200',
}

const labels: Record<InterviewStatus, string> = {
  uploaded: 'Uploaded', processing: 'Processing…',
  completed: 'Completed', failed: 'Failed',
}

export function StatusBadge({ status }: { status: InterviewStatus }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset ${styles[status]}`}>
      {status === 'processing' && (
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 animate-pulse" />
      )}
      {labels[status]}
    </span>
  )
}
