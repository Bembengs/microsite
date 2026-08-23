import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { collection, doc, getDoc, getDocs, orderBy, query } from "firebase/firestore"
import { db } from "@/lib/firebase"

export default function PublicMicrosite() {
  const { username } = useParams()
  const [data, setData] = useState<any>(null)
  const [blocks, setBlocks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      setLoading(true)
      const snap = await getDoc(doc(db, "microsites", username!))
      if (snap.exists()) {
        setData(snap.data())
        const bq = query(collection(db, "microsites", username!, "blocks"), orderBy("order"))
        const bSnap = await getDocs(bq)
        setBlocks(bSnap.docs.map(d => d.data()))
      }
      setLoading(false)
    })()
  }, [username])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', padding: 40 }}>
        <div style={{ width: '100%', maxWidth: 320 }}>
          <div style={{ width: 80, height: 80, background: '#e4e4e7', borderRadius: 999, margin: '0 auto 16px' }} />
          <div style={{ height: 48, background: '#e4e4e7', borderRadius: 999, marginBottom: 12 }} />
          <div style={{ height: 48, background: '#e4e4e7', borderRadius: 999 }} />
        </div>
      </div>
    )
  }

  if (!data) return <div style={{ padding: 40, textAlign: 'center' }}>/{username} tidak ditemukan</div>

  const theme = data.theme
  const radius = data.avatarShape === "circle"? 999 : data.avatarShape === "rounded"? 16 : 0

  return (
    <div style={{ minHeight: '100vh', background: theme.bg, color: theme.text, fontFamily: theme.font, display: 'flex', justifyContent: 'center', padding: '40px 20px' }}>
      <div style={{ width: '100%', maxWidth: 320 }}>
        <div style={{ textAlign: 'center', paddingBottom: 28 }}>
          <img src={data.photoURL} style={{ width: 80, height: 80, borderRadius: radius, margin: '0 auto 12px', objectFit: 'cover' }} />
          <h1 style={{ fontWeight: 700, fontSize: 16 }}>/{data.slug}</h1>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {blocks.map((b: any, i: number) => (
            <a key={i} href={b.url} target="_blank" style={{ display: 'block', width: '100%', textAlign: 'center', padding: '12px 16px', fontSize: 14, fontWeight: 600, background: theme.buttonColor, color: theme.buttonText, borderRadius: theme.rounded === 'rounded-full'? 999 : 16, textDecoration: 'none' }}>
              {b.title}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}