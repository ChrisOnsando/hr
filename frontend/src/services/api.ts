import axios from 'axios'
import type { Interview, InterviewListItem, StatusResponse } from '../types/interview'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://hr-interview-api.onrender.com/api',
  timeout: 120000,
})

export const interviewApi = {
  upload: async (file: File): Promise<Interview> => {
    const form = new FormData()
    form.append('file', file)
    const { data } = await api.post<Interview>('/interviews/upload', form)
    return data
  },

  list: async (search?: string, status?: string): Promise<InterviewListItem[]> => {
    const params: Record<string, string> = {}
    if (search) params.search = search
    if (status) params.status = status
    const { data } = await api.get('/interviews', { params })
    return Array.isArray(data) ? data : []
  },

  get: async (id: string): Promise<Interview> => {
    const { data } = await api.get<Interview>(`/interviews/${id}`)
    return data
  },

  transcribe: async (id: string): Promise<StatusResponse> => {
    const { data } = await api.post<StatusResponse>(`/interviews/${id}/transcribe`)
    return data
  },

  getStatus: async (id: string): Promise<StatusResponse> => {
    const { data } = await api.get<StatusResponse>(`/interviews/${id}/status`)
    return data
  },
}
