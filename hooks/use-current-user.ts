import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function useCurrentUser() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/users/me')
        if (!res.ok) {
          router.push('/signin')
          return
        }
        const userData = await res.json()
        setUser(userData)
      } catch (e) {
        router.push('/signin')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  return { user, loading }
}
