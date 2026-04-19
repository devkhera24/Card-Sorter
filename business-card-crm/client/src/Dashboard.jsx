import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'

const CATEGORY_COLORS = {
  Technology: 'bg-blue-900/50 text-blue-300 border-blue-700',
  Healthcare: 'bg-green-900/50 text-green-300 border-green-700',
  Finance: 'bg-yellow-900/50 text-yellow-300 border-yellow-700',
  Legal: 'bg-purple-900/50 text-purple-300 border-purple-700',
  Marketing: 'bg-pink-900/50 text-pink-300 border-pink-700',
  Logistics: 'bg-orange-900/50 text-orange-300 border-orange-700',
  Education: 'bg-cyan-900/50 text-cyan-300 border-cyan-700',
  Consulting: 'bg-indigo-900/50 text-indigo-300 border-indigo-700',
  Other: 'bg-gray-800 text-gray-400 border-gray-700',
}

function getCategoryStyle(cat) {
  return CATEGORY_COLORS[cat] || CATEGORY_COLORS['Other']
}

export default function Dashboard() {
  const [contacts, setContacts] = useState([])
  const [categories, setCategories] = useState(['All'])
  const [activeCategory, setActiveCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(null)

  const fetchContacts = useCallback(async () => {
    setLoading(true)
    try {
      if (searchQuery.trim()) {
        const { data } = await axios.get(`/api/cards/search?q=${encodeURIComponent(searchQuery)}`)
        setContacts(data)
      } else {
        const params = activeCategory !== 'All' ? `?category=${encodeURIComponent(activeCategory)}` : ''
        const { data } = await axios.get(`/api/cards${params}`)
        setContacts(data)
      }
    } catch (e) {
      console.error('Failed to fetch contacts', e)
    }
    setLoading(false)
  }, [searchQuery, activeCategory])

  useEffect(() => {
    axios.get('/api/cards/categories').then(({ data }) => setCategories(data))
  }, [])

  useEffect(() => {
    const timer = setTimeout(fetchContacts, 300)
    return () => clearTimeout(timer)
  }, [fetchContacts])

  const handleDelete = async (id) => {
    if (!confirm('Delete this contact?')) return
    setDeleting(id)
    await axios.delete(`/api/cards/${id}`)
    setContacts(c => c.filter(x => x.id !== id))
    setDeleting(null)
  }

  return (
    <div>
      <div className="relative mb-6">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
        <input
          type="text"
          placeholder="Search by name, company, role, service..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-gray-900 border border-gray-700 rounded-xl py-3 pl-11 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
          >
            ✕
          </button>
        )}
      </div>

      {!searchQuery && (
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                activeCategory === cat
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <p className="text-gray-500 text-sm">
          {loading ? 'Loading...' : `${contacts.length} contact${contacts.length !== 1 ? 's' : ''} found`}
        </p>
      </div>

      {!loading && contacts.length === 0 && (
        <div className="text-center py-20 text-gray-600">
          <div className="text-6xl mb-4">📭</div>
          <p className="text-lg font-medium text-gray-500">No contacts yet</p>
          <p className="text-sm mt-1">Scan a business card to get started</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {contacts.map(contact => (
          <div
            key={contact.id}
            className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-600 transition-all group"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-white truncate">{contact.name || 'Unknown'}</h3>
                <p className="text-gray-400 text-sm truncate">{contact.designation || ''}</p>
              </div>
              <button
                onClick={() => handleDelete(contact.id)}
                disabled={deleting === contact.id}
                className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all text-lg"
              >
                {deleting === contact.id ? '⌛' : '🗑️'}
              </button>
            </div>

            {contact.company && (
              <p className="text-indigo-400 font-medium text-sm mb-3 truncate">🏢 {contact.company}</p>
            )}

            {contact.category && (
              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border mb-3 ${getCategoryStyle(contact.category)}`}>
                {contact.category}
              </span>
            )}

            {contact.description && (
              <p className="text-gray-500 text-xs leading-relaxed mb-3 line-clamp-2">{contact.description}</p>
            )}

            <div className="space-y-1.5 text-xs">
              {contact.email && (
                <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                  <span>✉️</span><span className="truncate">{contact.email}</span>
                </a>
              )}
              {contact.phone && (
                <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                  <span>📞</span><span>{contact.phone}</span>
                </a>
              )}
              {contact.website && (
                <a href={contact.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-400 hover:text-indigo-400 transition-colors">
                  <span>🌐</span><span className="truncate">{contact.website}</span>
                </a>
              )}
              {contact.linkedin_url && (
                <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-500 hover:text-blue-400 transition-colors">
                  <span>💼</span><span>LinkedIn</span>
                </a>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-gray-800 text-xs text-gray-600">
              Added {new Date(contact.created_at).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}