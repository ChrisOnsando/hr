import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import InterviewDetail from './pages/InterviewDetail'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/interviews/:id" element={<InterviewDetail />} />
      </Routes>
    </BrowserRouter>
  )
}
