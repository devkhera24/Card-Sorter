import { useState, useRef } from 'react'
import axios from 'axios'

export default function UploadCard({ onSuccess, onCancel }) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const inputRef = useRef()

  const handleFile = (f) => {
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setStatus('idle')
    setError(null)
    setResult(null)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const handleSubmit = async () => {
    if (!file) return
    setStatus('uploading')
    setError(null)

    const formData = new FormData()
    formData.append('card', file)

    try {
      setStatus('extracting')
      const { data } = await axios.post('/api/cards/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: () => setStatus('enriching'),
      })
      setResult(data.contact)
      setStatus('done')
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong')
      setStatus('error')
    }
  }

  const statusMessages = {
    uploading: '📤 Uploading image...',
    extracting: '🔍 GPT-4o is reading the card...',
    enriching: '🌐 Searching the web for company info...',
    done: '✅ Contact saved successfully!',
    error: '❌ Error occurred',
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Scan a Business Card</h2>

      {!result && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-gray-600 rounded-2xl p-12 text-center cursor-pointer hover:border-indigo-500 hover:bg-gray-900 transition-all"
        >
          {preview ? (
            <img src={preview} alt="Preview" className="max-h-64 mx-auto rounded-xl object-contain" />
          ) : (
            <>
              <div className="text-5xl mb-4">📸</div>
              <p className="text-gray-300 font-medium">Drop your business card image here</p>
              <p className="text-gray-500 text-sm mt-1">or click to browse</p>
              <p className="text-gray-600 text-xs mt-3">Supports JPG, PNG, WebP — max 10MB</p>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files[0])}
          />
        </div>
      )}

      {status !== 'idle' && (
        <div className={`mt-4 p-4 rounded-xl text-sm font-medium ${
          status === 'done' ? 'bg-green-900/40 text-green-300' :
          status === 'error' ? 'bg-red-900/40 text-red-300' :
          'bg-indigo-900/40 text-indigo-300'
        }`}>
          {statusMessages[status]}
          {status === 'error' && error && <p className="mt-1 font-normal">{error}</p>}
        </div>
      )}

      {result && (
        <div className="mt-6 bg-gray-900 rounded-2xl p-6 border border-gray-800">
          <h3 className="font-bold text-lg mb-4">Contact Saved 🎉</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              ['Name', result.name],
              ['Company', result.company],
              ['Role', result.designation],
              ['Email', result.email],
              ['Phone', result.phone],
              ['Category', result.category],
              ['Website', result.website],
              ['Description', result.description],
            ].map(([label, val]) => val && (
              <div key={label}>
                <span className="text-gray-500">{label}</span>
                <p className="text-white truncate">{val}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-6">
            <button
              onClick={onSuccess}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg text-sm font-medium transition-all"
            >
              View All Contacts →
            </button>
            <button
              onClick={() => { setFile(null); setPreview(null); setStatus('idle'); setResult(null); }}
              className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 rounded-lg text-sm font-medium transition-all"
            >
              Scan Another
            </button>
          </div>
        </div>
      )}

      {status === 'idle' && file && (
        <div className="flex gap-3 mt-4">
          <button
            onClick={handleSubmit}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-medium transition-all"
          >
            🚀 Process Card
          </button>
          <button
            onClick={onCancel}
            className="px-6 bg-gray-800 hover:bg-gray-700 text-gray-300 py-3 rounded-xl font-medium transition-all"
          >
            Cancel
          </button>
        </div>
      )}

      {(status === 'uploading' || status === 'extracting' || status === 'enriching') && (
        <div className="mt-4 flex items-center justify-center gap-2 text-indigo-400">
          <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Processing, please wait...</span>
        </div>
      )}
    </div>
  )
}