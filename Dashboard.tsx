import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore'
import { toast } from 'sonner'
import { auth, db } from '@/lib/firebase'
import { isValidSlug, normalizeSlug } from '@/lib/slug'
import { RESERVED_SLUGS } from '@/lib/reservedSlugs'
import { DEFAULT_THEME, Microsite } from '@/types/biolink'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Eye, Plus, ExternalLink, Loader2 } from 'lucide-react'

export default function Dashboard() {
  const navigate = useNavigate()
  const uid = auth.currentUser?.uid

  const [microsites, setMicrosites] = useState<Microsite[]>([])
  const [loading, setLoading] = useState(true)

  const [modalOpen, setModalOpen] = useState(false)
  const [slugInput, setSlugInput] = useState('')
  const [titleInput, setTitleInput] = useState('')
  const [slugError, setSlugError] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!uid) return
    const q = query(collection(db, 'microsites'), where('userId', '==', uid))
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: Microsite[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Microsite, 'id'>),
        }))
        setMicrosites(list)
        setLoading(false)
      },
      (err) => {
        console.error(err)
        toast.error('Gagal memuat daftar microsite')
        setLoading(false)
      }
    )
    return () => unsub()
  }, [uid])

  function handleSlugChange(value: string) {
    const normalized = normalizeSlug(value)
    setSlugInput(normalized)
    if (normalized.length === 0) {
      setSlugError('')
      return
    }
    if (!isValidSlug(normalized)) {
      setSlugError('Slug harus 3-30 karakter, huruf kecil/angka/strip saja')
    } else if (RESERVED_SLUGS.includes(normalized)) {
      setSlugError('Slug ini sudah dipakai sistem, coba yang lain')
    } else {
      setSlugError('')
    }
  }

  async function handleCreate() {
    if (!uid) return

    const slug = normalizeSlug(slugInput)

    // Client-side validation
    if (!isValidSlug(slug)) {
      setSlugError('Slug harus 3-30 karakter, huruf kecil/angka/strip saja')
      return
    }
    if (RESERVED_SLUGS.includes(slug)) {
      setSlugError('Slug ini sudah dipakai sistem, coba yang lain')
      return
    }
    if (!titleInput.trim()) {
      toast.error('Judul microsite wajib diisi')
      return
    }

    setCreating(true)
    try {
      const micrositeRef = doc(db, 'microsites', slug)

      // Anti race-condition: runTransaction memastikan doc benar-benar
      // belum ada tepat sebelum ditulis, mencegah 2 user rebutan slug sama.
      await runTransaction(db, async (tx) => {
        const existing = await tx.get(micrositeRef)
        if (existing.exists()) {
          throw new Error('SLUG_TAKEN')
        }
        tx.set(micrositeRef, {
          userId: uid,
          title: titleInput.trim(),
          bio: '',
          avatarUrl: '',
          theme: DEFAULT_THEME,
          views: 0,
          createdAt: serverTimestamp(),
        })
      })

      toast.success('Microsite berhasil dibuat')
      setModalOpen(false)
      setSlugInput('')
      setTitleInput('')
      navigate(`/dashboard/${slug}`)
    } catch (err: any) {
      if (err?.message === 'SLUG_TAKEN') {
        setSlugError('Slug ini baru saja diambil orang lain, coba yang lain')
      } else {
        console.error(err)
        toast.error('Gagal membuat microsite, coba lagi')
      }
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Microsite Saya</h1>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Buat Microsite
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : microsites.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Belum ada microsite. Klik "Buat Microsite" untuk memulai.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {microsites.map((m) => (
            <Card
              key={m.id}
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => navigate(`/dashboard/${m.id}`)}
            >
              <CardHeader className="flex flex-row items-center gap-3 space-y-0">
                <Avatar>
                  <AvatarImage src={m.avatarUrl} alt={m.title} />
                  <AvatarFallback>
                    {m.title.slice(0, 2).toUpperCase() || 'BL'}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <CardTitle className="truncate text-base">
                    {m.title || m.id}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground truncate">
                    /{m.id}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-between text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" />
                  {m.views ?? 0} views
                </span>
                <ExternalLink className="w-3.5 h-3.5" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buat Microsite Baru</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="slug">Slug (URL)</Label>
              <div className="flex items-center gap-1 text-sm">
                <span className="text-muted-foreground">biolink.app/</span>
                <Input
                  id="slug"
                  value={slugInput}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="nama-kamu"
                  autoComplete="off"
                />
              </div>
              {slugError && (
                <p className="text-xs text-destructive">{slugError}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="title">Judul</Label>
              <Input
                id="title"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                placeholder="Nama tampilan microsite"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setModalOpen(false)}
              disabled={creating}
            >
              Batal
            </Button>
            <Button
              onClick={handleCreate}
              disabled={creating || !!slugError || !slugInput}
            >
              {creating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Buat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
