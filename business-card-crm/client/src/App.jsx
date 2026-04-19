import { useState } from 'react'
import UploadCard from './UploadCard'
import Dashboard from './Dashboard'

export default function App() {
  const [view, setView] = useState('dashboard')
  const [refreshKey, setRefreshKey] = useState(0)

  const handleUploadSuccess = () => {
    setRefreshKey(k => k + 1)
    setView('dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">📇 CardVault</h1>
          <p className="text-xs text-gray-500 mt-0.5">AI-powered business card CRM</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setView('dashboard')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              view === 'dashboard' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            My Contacts
          </button>
          <button
            onClick={() => setView('upload')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              view === 'upload' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            + Scan Card
          </button>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-8">
        {view === 'upload' ? (
          <UploadCard onSuccess={handleUploadSuccess} onCancel={() => setView('dashboard')} />
        ) : (
          <Dashboard key={refreshKey} />
        )}
      </main>
    </div>
  )
}