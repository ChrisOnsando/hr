export type InterviewStatus = 'uploaded' | 'processing' | 'completed' | 'failed'

export interface AIAnalysis {
  summary?: string
  sentiment?: string
  keywords?: string[]
  questions?: string[]
}

export interface Interview {
  id: string
  filename: string
  original_name: string
  file_size: number
  file_path: string
  upload_date: string
  status: InterviewStatus
  transcript?: string
  ai_analysis?: AIAnalysis
  created_at: string
  updated_at: string
}

export interface InterviewListItem {
  id: string
  original_name: string
  file_size: number
  upload_date: string
  status: InterviewStatus
  created_at: string
}

export interface StatusResponse {
  id: string
  status: InterviewStatus
  message: string
}
