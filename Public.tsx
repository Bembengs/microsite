import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  orderBy,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { Link as LinkIcon } from 'lucide-react';
import { db } from '../lib/firebase';
import { RESERVED_SLUGS } from '../lib/reservedSlugs';
// ^ Kalau reservedSlugs.ts export-nya default (bukan named export RESERVED_SLUGS),
//   ganti baris di atas jadi: import RESERVED_SLUGS from '../lib/reservedSlugs';

// ASUMSI SKEMA microsites/{slug} — sesuaikan kalau field asli dari
// ThemeEditor.tsx / create-modal Dashboard.tsx pakai nama beda.
// Field yang PASTI ada (dari handoff): userId, views.
interface MicrositeDoc {
  userId: string;
  displayName?: string;
  title?: string; // fallback nama lama
  bio?: string;
  avatarUrl?: string;
  metaDescription?: string;
  theme?: {
    bgColor?: string;
    textColor?: string;
    buttonColor?: string;
    buttonTextColor?: string;
  };
  views?: number;
}

// Field PASTI ada (dari handoff Dashboard.tsx): type, order, title, url, isActive, clicks
interface BlockDoc {
  id: string;
  type?: string;
  title: string;
  url: string;
  order: number;
  isActive: boolean;
  clicks?: number;
}

type LoadState = 'loading' | 'ready' | 'not-found';

export default function Public() {
  const { slug } = useParams<{ slug: string }>();
  const [microsite, setMicrosite] = useState<MicrositeDoc | null>(null);
  const [blocks, setBlocks] = useState<BlockDoc[]>([]);
  const [state, setState] = useState<LoadState>('loading');

  // Guard StrictMode double-invoke (dev) + reload/back-forward dalam session yang sama.
  const hasCountedView = useRef(false);

  useEffect(() => {
    if (!slug) {
      setState('not-found');
      return;
    }

    if (RESERVED_SLUGS.includes(slug)) {
      setState('not-found');
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const micrositeRef = doc(db, 'microsites', slug!);
        const micrositeSnap = await getDoc(micrositeRef);

        if (!micrositeSnap.exists()) {
          if (!cancelled) setState('not-found');
          return;
        }

        const micrositeData = micrositeSnap.data() as MicrositeDoc;

        // Query ini butuh composite index isActive(asc) + order(asc) —
        // sudah ada di firestore.indexes.json (dibuat Akun 2), tinggal
        // `firebase deploy --only firestore:indexes` kalau belum ke-deploy.
        const blocksQuery = query(
          collection(db, 'microsites', slug!, 'blocks'),
          where('isActive', '==', true),
          orderBy('order', 'asc')
        );
        const blocksSnap = await getDocs(blocksQuery);
        const blocksData: BlockDoc[] = blocksSnap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<BlockDoc, 'id'>),
        }));

        if (cancelled) return;

        setMicrosite(micrositeData);
        setBlocks(blocksData);
        setState('ready');

        // ---- View counting: sekali per session per slug ----
        const viewKey = `viewed_${slug}`;
        const alreadyViewedThisSession = sessionStorage.getItem(viewKey);

        if (!hasCountedView.current && !alreadyViewedThisSession) {
          hasCountedView.current = true;
          sessionStorage.setItem(viewKey, '1');
          updateDoc(micrositeRef, { views: increment(1) }).catch((err) => {
            console.warn('View increment failed:', err);
          });
        }
      } catch (err) {
        console.error('Failed to load microsite:', err);
        if (!cancelled) setState('not-found');
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  function handleBlockClick(block: BlockDoc) {
    if (!slug) return;
    const blockRef = doc(db, 'microsites', slug, 'blocks', block.id);
    updateDoc(blockRef, { clicks: increment(1) }).catch((err) => {
      console.warn('Click increment failed:', err);
    });
  }

  if (state === 'loading') {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-neutral-950">
        <span className="text-neutral-400 text-sm">Memuat…</span>
      </div>
    );
  }

  if (state === 'not-found' || !microsite) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-neutral-950 text-white px-6 text-center">
        <h1 className="text-2xl font-bold mb-2">404</h1>
        <p className="text-neutral-400 text-sm">Halaman tidak ditemukan.</p>
      </div>
    );
  }

  const theme = microsite.theme ?? {};
  const bgColor = theme.bgColor ?? '#0f0f0f';
  const textColor = theme.textColor ?? '#ffffff';
  const buttonColor = theme.buttonColor ?? '#1f1f1f';
  const buttonTextColor = theme.buttonTextColor ?? '#ffffff';

  const displayName = microsite.displayName || microsite.title || slug;
  const description = microsite.metaDescription || microsite.bio || `Lihat semua link ${displayName}`;

  return (
    <>
      <Helmet>
        <title>{displayName} | BioLink</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={displayName} />
        <meta property="og:description" content={description} />
        {microsite.avatarUrl && <meta property="og:image" content={microsite.avatarUrl} />}
        <meta property="og:type" content="profile" />
      </Helmet>

      <div
        className="min-h-screen w-full flex justify-center"
        style={{ backgroundColor: bgColor, color: textColor }}
      >
        <div className="w-full max-w-md flex flex-col items-center px-5 py-12 text-center">
          {microsite.avatarUrl && (
            <img
              src={microsite.avatarUrl}
              alt={displayName}
              className="w-24 h-24 rounded-full object-cover mb-4 border-2 border-white/10"
            />
          )}
          <h1 className="text-xl font-bold">{displayName}</h1>
          {microsite.bio && (
            <p className="text-sm opacity-80 mt-2 mb-6 leading-relaxed">{microsite.bio}</p>
          )}

          <div className="w-full flex flex-col gap-3">
            {blocks.map((block) => (
              <a
                key={block.id}
                href={block.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleBlockClick(block)}
                className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-semibold shadow-sm transition-transform active:scale-[0.98]"
                style={{ backgroundColor: buttonColor, color: buttonTextColor }}
              >
                <LinkIcon size={16} />
                <span>{block.title}</span>
              </a>
            ))}
          </div>

          {blocks.length === 0 && (
            <p className="opacity-60 mt-6 text-sm">Belum ada link aktif.</p>
          )}

          <p className="opacity-40 text-xs mt-10">Made with BioLink</p>
        </div>
      </div>
    </>
  );
}
