'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function SmartBookmarkApp() {
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [bookmarks, setBookmarks] = useState<any[]>([])
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')

  useEffect(() => {
    // 1. Monitor Authentication State
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))

    // 2. Fetch Initial List (Requirement #2 & #3)
    const fetchBookmarks = async () => {
      const { data } = await supabase
        .from('bookmarks')
        .select('*')
        .order('created_at', { ascending: false })
      if (data) setBookmarks(data)
    }
    fetchBookmarks()

    // 3. Setup Real-time Listener (Requirement #4)
    const channel = supabase
      .channel('bookmark-updates')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'bookmarks' }, 
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setBookmarks((prev) => [payload.new, ...prev])
          } else if (payload.eventType === 'DELETE') {
            setBookmarks((prev) => prev.filter(b => b.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase])

  const addBookmark = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !url || !user) return

    // Requirement #2: Title and URL inputs
    const { error } = await supabase
      .from('bookmarks')
      .insert([{ title, url, user_id: user.id }])

    if (!error) {
      setTitle('')
      setUrl('')
    }
  }

  // Requirement #5: Delete Bookmark
  const deleteBookmark = async (id: string) => {
    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('id', id)
    
    if (error) console.error("Delete error:", error.message)
  }

  // Login Screen (Requirement #1)
  if (!user) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black">
      <button 
        onClick={() => supabase.auth.signInWithOAuth({ provider: 'google' })}
        className="bg-white text-black px-8 py-3 rounded-full font-bold shadow-xl hover:scale-105 transition-transform"
      >
        Sign in with Google
      </button>
    </div>
  )

  return (
    <main className="p-8 max-w-2xl mx-auto min-h-screen bg-black text-white">
      <h1 className="text-4xl font-extrabold mb-10 text-center tracking-tight">Smart Bookmarks</h1>

      {/* Input Form */}
      <form onSubmit={addBookmark} className="flex flex-col gap-4 mb-12 bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-2xl">
        <input 
          className="border border-gray-700 p-3 rounded-lg bg-black text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 outline-none" 
          placeholder="Website Title (e.g. GitHub)" 
          value={title} 
          onChange={(e) => setTitle(e.target.value)} 
        />
        <input 
          className="border border-gray-700 p-3 rounded-lg bg-black text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 outline-none" 
          placeholder="URL (https://...)" 
          value={url} 
          onChange={(e) => setUrl(e.target.value)} 
        />
        <button className="bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg font-bold transition-all shadow-lg active:scale-95">
          Add to My List
        </button>
      </form>

      {/* Real-time List (Requirement #4) */}
      <div className="space-y-4">
        {bookmarks.length === 0 && <p className="text-center text-gray-500">No bookmarks added yet.</p>}
        {bookmarks.map(b => (
          <div key={b.id} className="p-5 border border-gray-800 rounded-xl flex justify-between items-center bg-gray-900/50 backdrop-blur-sm hover:border-gray-600 transition-colors group">
            <div className="overflow-hidden">
              <p className="font-bold text-xl text-white truncate">{b.title}</p>
              <a href={b.url} target="_blank" rel="noreferrer" className="text-blue-400 text-sm hover:underline truncate block">
                {b.url}
              </a>
            </div>
            <button 
              onClick={() => deleteBookmark(b.id)}
              className="ml-4 text-gray-500 hover:text-red-500 p-2 rounded-lg hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
              title="Delete Bookmark"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </main>
  )
}