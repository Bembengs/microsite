import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { signOut } from "firebase/auth"
import { collection, doc, getDoc, setDoc, query, where, getDocs, addDoc, deleteDoc, orderBy } from "firebase/firestore"
import { toast } from "sonner"
import { auth, db } from "@/lib/firebase"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

const BACKGROUNDS = [
  { bg: "#ffffff", text: "#000000" },
  { bg: "#000000", text: "#ffffff" },
  { bg: "linear-gradient(135deg,#a855f7,#ec4899)", text: "#ffffff" },
  { bg: "linear-gradient(135deg,#34d399,#06b6d4)", text: "#000000" },
]

function SortableItem({ block, onDelete }: any) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: block.id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  return (
    <div ref={setNodeRef} style={style} className="bg-white p-3 rounded-2xl border flex justify-between items-center">
      <div className="flex items-center gap-3">
        <button {...attributes} {...listeners} className="cursor-grab px-2 text-zinc-400">⠿</button>
        <div><p className="font-medium text-sm">{block.title}</p><p className="text- text-muted-foreground truncate max-w-">{block.url}</p></div>
      </div>
      <Button variant="ghost" size="sm" className="text-red-500" onClick={() => onDelete(block.id)}>Hapus</Button>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [microsites, setMicrosites] = useState<any[]>([])
  const [selectedId, setSelectedId] = useState("")
  const [newSlug, setNewSlug] = useState("")
  const [blocks, setBlocks] = useState<any[]>([])
  const [title, setTitle] = useState("")
  const [url, setUrl] = useState("")
  const [theme, setTheme] = useState<any>({ bg: "#ffffff", text: "#000000", buttonColor: "#000000", buttonText: "#ffffff", rounded: "rounded-full", font: "Inter" })
  const [logo, setLogo] = useState("")
  const [shape, setShape] = useState("circle")
  const sensors = useSensors(useSensor(PointerSensor))

  useEffect(() => { if (user) loadMicrosites() }, [user])
  useEffect(() => { if (selectedId) loadData() }, [selectedId])

  async function loadMicrosites() {
    const q = query(collection(db, "microsites"), where("ownerId", "==", user!.uid))
    const snap = await getDocs(q)
    const data = snap.docs.map(d => d.data())
    setMicrosites(data)
    if (data.length > 0 &&!selectedId) setSelectedId(data[0].slug)
  }

  async function loadData() {
    const ref = doc(db, "microsites", selectedId)
    const snap = await getDoc(ref)
    if (snap.exists()) {
      const d = snap.data()
      if (d.theme) setTheme(d.theme)
      setLogo(d.photoURL || user?.photoURL || "")
      setShape(d.avatarShape || "circle")
    }
    const bq = query(collection(db, "microsites", selectedId, "blocks"), orderBy("order"))
    const bSnap = await getDocs(bq)
    setBlocks(bSnap.docs.map((d) => ({ id: d.id,...d.data() })))
  }

  async function createMicrosite() {
    const clean = newSlug.toLowerCase().replace(/[^a-z0-9-]/g, "")
    if (clean.length < 3) return toast.error("Minimal 3 huruf")
    if ((await getDoc(doc(db, "microsites", clean))).exists()) return toast.error("Nama sudah dipakai")
    await setDoc(doc(db, "microsites", clean), { slug: clean, ownerId: user!.uid, displayName: user!.displayName, photoURL: user!.photoURL, avatarShape: "circle", theme })
    setNewSlug(""); setSelectedId(clean); loadMicrosites(); toast.success("/" + clean + " dibuat")
  }

  // FITUR BARU: HAPUS SLUG + SEMUA LINK DI DALAMNYA
  async function deleteMicrosite(slug: string) {
    if (!confirm(`Hapus permanen /${slug}? Semua link di dalamnya akan hilang total dari Firebase.`)) return
    try {
      const blocksSnap = await getDocs(collection(db, "microsites", slug, "blocks"))
      for (const b of blocksSnap.docs) {
        await deleteDoc(doc(db, "microsites", slug, "blocks", b.id))
      }
      await deleteDoc(doc(db, "microsites", slug))
      toast.success(`/${slug} terhapus bersih`)
      const sisa = microsites.filter((m) => m.slug!== slug)
      setMicrosites(sisa)
      if (selectedId === slug) {
        setSelectedId(sisa[0]?.slug || "")
        setBlocks([])
      }
    } catch (e) {
      toast.error("Gagal hapus")
    }
  }

  async function saveTheme(t: any) { setTheme(t); await setDoc(doc(db, "microsites", selectedId), { theme: t }, { merge: true }) }
  async function handleLogoUpload(e: any) {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string
      setLogo(base64)
      await setDoc(doc(db, "microsites", selectedId), { photoURL: base64 }, { merge: true })
      toast.success("Logo diganti!")
    }
    reader.readAsDataURL(file)
  }
  async function saveShape(s: string) { setShape(s); await setDoc(doc(db, "microsites", selectedId), { avatarShape: s }, { merge: true }) }
  async function addBlock() {
    if (!title ||!url) return toast.error("Isi judul & link")
    await addDoc(collection(db, "microsites", selectedId, "blocks"), { title, url: url.startsWith("http")? url : "https://" + url, order: blocks.length })
    setTitle(""); setUrl(""); loadData()
  }
  async function handleDragEnd(event: any) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = blocks.findIndex(b => b.id === active.id)
    const newIndex = blocks.findIndex(b => b.id === over.id)
    const newBlocks = arrayMove(blocks, oldIndex, newIndex)
    setBlocks(newBlocks)
    for (let i = 0; i < newBlocks.length; i++) {
      await setDoc(doc(db, "microsites", selectedId, "blocks", newBlocks[i].id), { order: i }, { merge: true })
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <span className="font-semibold">Microsite Multi</span>
        <div className="flex gap-2 items-center">
          {selectedId && <Link to={`/${selectedId}`} target="_blank"><Button variant="outline" size="sm">Lihat /{selectedId}</Button></Link>}
          <Avatar className="h-8 w-8"><AvatarImage src={user?.photoURL?? undefined} /><AvatarFallback>{user?.email?.[0]}</AvatarFallback></Avatar>
          <Button variant="outline" size="sm" onClick={() => signOut(auth)}>Keluar</Button>
        </div>
      </header>
      <main className="bg-zinc-50 flex-1 p-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-[300px_1fr] gap-6">
          <div className="bg-white p-4 rounded-2xl border h-fit">
            <h2 className="font-semibold mb-3">Microsite Saya</h2>
            <div className="space-y-2 mb-4">
              {microsites.map((m: any) => (
                <div key={m.slug} className={`flex items-center justify-between p-2 rounded-xl border ${selectedId === m.slug? "bg-black text-white" : "bg-white"}`}>
                  <button onClick={() => setSelectedId(m.slug)} className="flex-1 text-left text-sm">/{m.slug}</button>
                  <button onClick={() => deleteMicrosite(m.slug)} className="text- px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600">Hapus</button>
                </div>
              ))}
            </div>
            <div className="flex gap-2"><input value={newSlug} onChange={e => setNewSlug(e.target.value)} placeholder="nama baru" className="flex-1 border p-2 rounded-xl text-sm" /><Button size="sm" onClick={createMicrosite}>Buat</Button></div>
          </div>
          {selectedId? (
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-2xl border">
                <h2 className="font-semibold mb-3 text-sm">Logo & Bentuk</h2>
                <div className="flex items-center gap-4 mb-3">
                  <img src={logo} className={`w-16 h-16 object-cover ${shape === "circle"? "rounded-full" : shape === "rounded"? "rounded-2xl" : "rounded-none"}`} />
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="text-sm" />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant={shape === "circle"? "default" : "outline"} onClick={() => saveShape("circle")}>Bundar</Button>
                  <Button size="sm" variant={shape === "rounded"? "default" : "outline"} onClick={() => saveShape("rounded")}>Kotak Bulat</Button>
                  <Button size="sm" variant={shape === "square"? "default" : "outline"} onClick={() => saveShape("square")}>Kotak</Button>
                </div>
              </div>
              <div className="bg-white p-5 rounded-2xl border"><h2 className="font-semibold mb-3 text-sm">Tema</h2><div className="flex gap-2 mb-3">{BACKGROUNDS.map((b, i) => (<button key={i} onClick={() => saveTheme({...theme, bg: b.bg, text: b.text })} className="w-10 h-10 rounded-full border" style={{ background: b.bg }} />))}</div><div className="flex gap-2"><Button size="sm" variant={theme.rounded === "rounded-full"? "default" : "outline"} onClick={() => saveTheme({...theme, rounded: "rounded-full" })}>Pill</Button><Button size="sm" variant={theme.rounded === "rounded-2xl"? "default" : "outline"} onClick={() => saveTheme({...theme, rounded: "rounded-2xl" })}>Kotak</Button></div></div>
              <div className="bg-white p-5 rounded-2xl border"><h2 className="font-semibold mb-3 text-sm">Tambah Link di /{selectedId}</h2><input value={title} onChange={e => setTitle(e.target.value)} placeholder="Judul" className="w-full border p-3 rounded-xl mb-2 text-sm" /><input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." className="w-full border p-3 rounded-xl mb-3 text-sm" /><Button className="w-full" onClick={addBlock}>+ Tambah</Button></div>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}><SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}><div className="space-y-3">{blocks.map(b => <SortableItem key={b.id} block={b} onDelete={async (id: string) => { await deleteDoc(doc(db, "microsites", selectedId, "blocks", id)); loadData() }} />)}</div></SortableContext></DndContext>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  )
}