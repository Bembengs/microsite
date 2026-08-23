import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  doc,
  onSnapshot,
  collection,
  query,
  orderBy,
  addDoc,
  deleteDoc,
  writeBatch,
  updateDoc,
} from 'firebase/firestore'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { toast } from 'sonner'
import { auth, db } from '@/lib/firebase'
import { uploadImage } from '@/lib/upload'
import { Block, Microsite } from '@/types/biolink'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import BlockItem from '@/components/BlockItem'
import PreviewFrame from '@/components/PreviewFrame'
import { ArrowLeft, Plus, Save, Loader2 } from 'lucide-react'

const BLOCK_TYPES: Block['type'][] = ['link', 'text', 'image']

export default function Editor() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const uid = auth.currentUser?.uid

  const [microsite, setMicrosite] = useState<Microsite | null>(null)
  const [blocks, setBlocks] = useState<Block[]>([])
  const [loading, setLoading] = useState(true)
  const [savingOrder, setSavingOrder] = useState(false)
  const [orderDirty, setOrderDirty] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor))

  // Load microsite doc + verify ownership
  useEffect(() => {
    if (!slug) return
    const ref = doc(db, 'microsites', slug)
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          toast.error('Microsite tidak ditemukan')
          navigate('/dashboard')
          return
        }
        const data = { id: snap.id, ...(snap.data() as Omit<Microsite, 'id'>) }
        if (data.userId !== uid) {
          toast.error('Kamu tidak punya akses ke microsite ini')
          navigate('/dashboard')
          return
        }
        setMicrosite(data)
        setLoading(false)
      },
      (err) => {
        console.error(err)
        toast.error('Gagal memuat microsite')
        navigate('/dashboard')
      }
    )
    return () => unsub()
  }, [slug, uid, navigate])

  // Load blocks (owner sees all, active + inactive), ordered by 'order'
  useEffect(() => {
    if (!slug) return
    const q = query(collection(db, 'microsites', slug, 'blocks'), orderBy('order', 'asc'))
    const unsub = onSnapshot(q, (snap) => {
      const list: Block[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Block, 'id'>),
      }))
      setBlocks(list)
      setOrderDirty(false)
    })
    return () => unsub()
  }, [slug])

  async function handleAddBlock(type: Block['type']) {
    if (!slug) return
    try {
      await addDoc(collection(db, 'microsites', slug, 'blocks'), {
        type,
        order: blocks.length,
        title: type === 'link' ? 'Link baru' : type === 'text' ? 'Teks baru' : 'Gambar baru',
        url: '',
        content: '',
        isActive: true,
        clicks: 0,
      })
    } catch (err) {
      console.error(err)
      toast.error('Gagal menambah block')
    }
  }

  async function handleBlockChange(id: string, patch: Partial<Block>) {
    if (!slug) return
    // Local optimistic update for smooth typing
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)))
    try {
      await updateDoc(doc(db, 'microsites', slug, 'blocks', id), patch)
    } catch (err) {
      console.error(err)
      toast.error('Gagal menyimpan perubahan block')
    }
  }

  async function handleDeleteBlock(id: string) {
    if (!slug) return
    try {
      await deleteDoc(doc(db, 'microsites', slug, 'blocks', id))
      toast.success('Block dihapus')
    } catch (err) {
      console.error(err)
      toast.error('Gagal menghapus block')
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setBlocks((prev) => {
      const oldIndex = prev.findIndex((b) => b.id === active.id)
      const newIndex = prev.findIndex((b) => b.id === over.id)
      const reordered = arrayMove(prev, oldIndex, newIndex)
      return reordered
    })
    setOrderDirty(true)
  }

  // Persist reordering: SATU KALI write via writeBatch, bukan update per item
  async function handleSaveOrder() {
    if (!slug) return
    setSavingOrder(true)
    try {
      const batch = writeBatch(db)
      blocks.forEach((b, index) => {
        batch.update(doc(db, 'microsites', slug, 'blocks', b.id), { order: index })
      })
      await batch.commit()
      setOrderDirty(false)
      toast.success('Urutan block disimpan')
    } catch (err) {
      console.error(err)
      toast.error('Gagal menyimpan urutan')
    } finally {
      setSavingOrder(false)
    }
  }

  async function handleMicrositeField(patch: Partial<Microsite>) {
    if (!slug) return
    setMicrosite((prev) => (prev ? { ...prev, ...patch } : prev))
    try {
      await updateDoc(doc(db, 'microsites', slug), patch as any)
    } catch (err) {
      console.error(err)
      toast.error('Gagal menyimpan perubahan')
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !uid || !slug) return
    setUploadingAvatar(true)
    try {
      const url = await uploadImage(file, 'avatars', uid)
      await handleMicrositeField({ avatarUrl: url })
      toast.success('Avatar berhasil diupload')
    } catch (err: any) {
      toast.error(err?.message || 'Gagal upload avatar')
    } finally {
      setUploadingAvatar(false)
      e.target.value = ''
    }
  }

  async function handleBlockImageUpload(
    blockId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0]
    if (!file || !uid) return
    try {
      const url = await uploadImage(file, 'blocks', uid)
      await handleBlockChange(blockId, { url })
      toast.success('Gambar block diupload')
    } catch (err: any) {
      toast.error(err?.message || 'Gagal upload gambar')
    } finally {
      e.target.value = ''
    }
  }

  const previewData = useMemo(
    () =>
      microsite
        ? {
            title: microsite.title,
            bio: microsite.bio,
            avatarUrl: microsite.avatarUrl,
            theme: microsite.theme,
          }
        : null,
    [microsite]
  )

  if (loading || !microsite) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali
        </button>
        {orderDirty && (
          <Button size="sm" onClick={handleSaveOrder} disabled={savingOrder}>
            {savingOrder ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Simpan Urutan
          </Button>
        )}
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-8">
        {/* LEFT: settings + block list */}
        <div className="space-y-6">
          <div className="rounded-lg border p-4 space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="w-14 h-14">
                <AvatarImage src={microsite.avatarUrl} />
                <AvatarFallback>{microsite.title.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <label className="text-sm text-primary cursor-pointer">
                {uploadingAvatar ? 'Mengupload...' : 'Ganti avatar'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={uploadingAvatar}
                />
              </label>
            </div>
            <div className="space-y-1.5">
              <Label>Judul</Label>
              <Input
                value={microsite.title}
                onChange={(e) => handleMicrositeField({ title: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Bio</Label>
              <Textarea
                value={microsite.bio}
                onChange={(e) => handleMicrositeField({ bio: e.target.value })}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Warna BG</Label>
                <input
                  type="color"
                  value={microsite.theme.bg}
                  onChange={(e) =>
                    handleMicrositeField({
                      theme: { ...microsite.theme, bg: e.target.value },
                    })
                  }
                  className="w-full h-9 rounded border"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Warna Teks</Label>
                <input
                  type="color"
                  value={microsite.theme.textColor}
                  onChange={(e) =>
                    handleMicrositeField({
                      theme: { ...microsite.theme, textColor: e.target.value },
                    })
                  }
                  className="w-full h-9 rounded border"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Gaya Tombol</Label>
                <select
                  value={microsite.theme.buttonStyle}
                  onChange={(e) =>
                    handleMicrositeField({
                      theme: {
                        ...microsite.theme,
                        buttonStyle: e.target.value as any,
                      },
                    })
                  }
                  className="w-full h-9 rounded border bg-background px-2 text-sm"
                >
                  <option value="rounded">Rounded</option>
                  <option value="sharp">Sharp</option>
                  <option value="outline">Outline</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm">Blocks</h3>
              <div className="flex gap-2">
                {BLOCK_TYPES.map((t) => (
                  <Button
                    key={t}
                    size="sm"
                    variant="outline"
                    onClick={() => handleAddBlock(t)}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    {t}
                  </Button>
                ))}
              </div>
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={blocks.map((b) => b.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {blocks.map((b) => (
                    <div key={b.id} className="space-y-1">
                      <BlockItem
                        block={b}
                        onChange={handleBlockChange}
                        onDelete={handleDeleteBlock}
                      />
                      {b.type === 'image' && (
                        <label className="text-xs text-primary cursor-pointer ml-8">
                          Upload gambar
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleBlockImageUpload(b.id, e)}
                          />
                        </label>
                      )}
                    </div>
                  ))}
                  {blocks.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Belum ada block, tambahkan di atas.
                    </p>
                  )}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </div>

        {/* RIGHT: live preview */}
        <div className="lg:sticky lg:top-6 self-start">
          {previewData && <PreviewFrame microsite={previewData} blocks={blocks} />}
        </div>
      </div>
    </div>
  )
}
