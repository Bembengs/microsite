import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, deleteDoc } from "firebase/firestore";
import { DEFAULT_CONFIG, getBgLayerStyle, isVideoUrl } from "./App";
import type { MicrositeConfig, LinkItem, BgConfig, ContentBlock, DividerBlock, ButtonDefaults } from "./App";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, KeyboardSensor } from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
const fbApp = initializeApp(firebaseConfig);
const db = getFirestore(fbApp);

function getLogoStyle(shape: MicrositeConfig["logoShape"], radius: number): React.CSSProperties {
  if (shape === "circle") return { borderRadius: "50%" };
  if (shape === "square") return { borderRadius: "8px" };
  if (shape === "rounded") return { borderRadius: `${radius}px` };
  if (shape === "hexagon") return { clipPath: "polygon(25% 0%,75% 0%,100% 50%,75% 100%,25% 100%,0% 50%)" };
  if (shape === "blob" || shape === "jelly") return { borderRadius: "42% 58% 62% 38% / 42% 38% 62% 58%" };
  return { borderRadius: `${radius}px` };
}
function isDivider(b: ContentBlock): b is DividerBlock { return (b as DividerBlock).type === "divider"; }
function heightMap(h: LinkItem["height"]) {
  if (h === "sm") return "py-2.5 text-[13px]";
  if (h === "md") return "py-3 text-[14px]";
  if (h === "lg") return "py-3.5 text-[15px]";
  if (h === "xl") return "py-4 text-[16px]";
  return "py-3.5";
}
function getTornClipPath(amount: number): string {
  const j = Math.max(0, Math.min(100, amount)) / 100;
  const jitter = j * 8;
  return `polygon(${jitter}% ${jitter}%, ${22 + jitter}% ${0}%, ${38 - jitter}% ${jitter * 1.2}%, ${58 + jitter * 0.5}% ${0}%, ${78 - jitter}% ${jitter}%, 100% ${2 + jitter}%, 100% ${78 - jitter}%, ${82 + jitter}% ${100 - jitter}%, ${58 - jitter}% ${100}%, ${36 + jitter}% ${98 - jitter}%, ${18 - jitter}% ${100}%, 0% ${88 - jitter}%)`;
}

// Tooltip singkat component - tidak bikin bug
function IconBtn({ children, label, onClick }: { children: React.ReactNode; label: string; onClick?: (e:any)=>void }) {
  return (
    <div className="relative group/icon">
      <button onClick={onClick} className="w-8 h-8 rounded-full bg-white border flex items-center justify-center text-[14px] hover:bg-black hover:text-white transition-colors">{children}</button>
      <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black text-white text-[10px] px-2 py-1 rounded-full opacity-0 group-hover/icon:opacity-100 z-50">{label}</span>
    </div>
  );
}
function MiniIconBtn({ children, label, onClick }: { children: React.ReactNode; label: string; onClick: (e:any)=>void }) {
  return (
    <div className="relative group/mini">
      <button onClick={onClick} className="w-5 h-5 rounded-full bg-black/10 flex items-center justify-center text-[10px] hover:bg-black hover:text-white">{children}</button>
      <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black text-white text-[9px] px-1.5 py-0.5 rounded-full opacity-0 group-hover/mini:opacity-100 z-50">{label}</span>
    </div>
  );
}

function LogoEditor({ config, onChange }: { config: MicrositeConfig; onChange: (c: MicrositeConfig) => void }) {
  return (
    <div className="p-3 rounded-2xl bg-white border shadow-sm space-y-3">
      <p className="font-semibold text-sm">🖼️ Logo & Judul + Animasi</p>
      <input value={config.logoUrl} onChange={(e) => onChange({ ...config, logoUrl: e.target.value })} placeholder="https://.../logo.png atau .mp4/.webm" className="w-full p-2.5 rounded-xl border bg-white text-xs font-mono" />
      <div className="flex gap-1 flex-wrap">
        {(["circle", "square", "rounded", "hexagon", "blob", "jelly"] as const).map((s) => (
          <button key={s} onClick={() => onChange({ ...config, logoShape: s })} className={`px-2.5 py-1 rounded-full border text-[11px] ${config.logoShape === s ? "bg-black text-white" : "bg-white"}`}>{s}</button>
        ))}
      </div>
      <div className="space-y-2 pt-2 border-t">
        <p className="text-[11px] font-bold opacity-70">✨ Animasi Logo</p>
        <div className="flex gap-1 flex-wrap">
          {(["none", "float", "pulse", "spin", "bounce", "jelly", "wiggle", "glow"] as const).map((anim) => (
            <button key={anim} onClick={() => onChange({ ...config, logoAnimation: anim })} className={`px-2.5 py-1 rounded-full border text-[11px] ${config.logoAnimation === anim ? "bg-black text-white" : "bg-white"}`}>{anim}</button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <label className="space-y-1">Speed {config.logoAnimationSpeed}s<input type="range" min={0.5} max={8} step={0.5} value={config.logoAnimationSpeed} onChange={(e) => onChange({ ...config, logoAnimationSpeed: Number(e.target.value) })} className="w-full" /></label>
          <label className="flex items-center gap-1.5 mt-5"><input type="checkbox" checked={!!config.logoAnimationOnHover} onChange={(e) => onChange({ ...config, logoAnimationOnHover: e.target.checked })} /> Hanya hover</label>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <label className="space-y-1">Size {config.logoSize}px<input type="range" min={40} max={180} value={config.logoSize} onChange={(e) => onChange({ ...config, logoSize: Number(e.target.value) })} className="w-full" /></label>
        <label className="space-y-1">Radius {config.logoRadius}px<input type="range" min={0} max={80} value={config.logoRadius} onChange={(e) => onChange({ ...config, logoRadius: Number(e.target.value) })} className="w-full" /></label>
        <label className="space-y-1">Border {config.logoBorderWidth}px<input type="range" min={0} max={12} value={config.logoBorderWidth} onChange={(e) => onChange({ ...config, logoBorderWidth: Number(e.target.value) })} className="w-full" /></label>
        <label className="space-y-1">Border Color<input type="color" value={config.logoBorderColor} onChange={(e) => onChange({ ...config, logoBorderColor: e.target.value })} className="w-full h-7 rounded" /></label>
        <label className="space-y-1">OffsetX {config.logoOffsetX}%<input type="range" min={-50} max={50} value={config.logoOffsetX} onChange={(e) => onChange({ ...config, logoOffsetX: Number(e.target.value) })} className="w-full" /></label>
        <label className="space-y-1">OffsetY {config.logoOffsetY}%<input type="range" min={-50} max={50} value={config.logoOffsetY} onChange={(e) => onChange({ ...config, logoOffsetY: Number(e.target.value) })} className="w-full" /></label>
        <label className="space-y-1 col-span-2">Zoom {config.logoZoom}%<input type="range" min={50} max={200} value={config.logoZoom} onChange={(e) => onChange({ ...config, logoZoom: Number(e.target.value) })} className="w-full" /></label>
      </div>
      <div className="space-y-2 pt-2 border-t">
        <input value={config.title} onChange={(e) => onChange({ ...config, title: e.target.value })} placeholder="Judul toko" className="w-full p-2 rounded-lg border text-sm" />
        <div className="grid grid-cols-2 gap-2">
          <label className="text-[11px] space-y-1">Title Color<input type="color" value={config.titleColor} onChange={(e) => onChange({ ...config, titleColor: e.target.value })} className="w-full h-7 rounded" /></label>
          <label className="text-[11px] space-y-1">Title Size {config.titleSize}px<input type="range" min={12} max={36} value={config.titleSize} onChange={(e) => onChange({ ...config, titleSize: Number(e.target.value) })} className="w-full" /></label>
        </div>
        <input value={config.desc} onChange={(e) => onChange({ ...config, desc: e.target.value })} placeholder="Deskripsi singkat" className="w-full p-2 rounded-lg border text-sm" />
        <div className="grid grid-cols-2 gap-2">
          <label className="text-[11px] space-y-1">Desc Color<input type="color" value={config.descColor} onChange={(e) => onChange({ ...config, descColor: e.target.value })} className="w-full h-7 rounded" /></label>
          <label className="text-[11px] space-y-1">Desc Size {config.descSize}px<input type="range" min={10} max={22} value={config.descSize} onChange={(e) => onChange({ ...config, descSize: Number(e.target.value) })} className="w-full" /></label>
        </div>
      </div>
    </div>
  );
}
function BgGlassEditor({ label, bg, onChange }: { label: string; bg: BgConfig; onChange: (b: BgConfig) => void }) {
  const [gradFrom, setGradFrom] = useState(bg.gradientFrom || "#a8edea");
  const [gradTo, setGradTo] = useState(bg.gradientTo || "#fed6e3");
  useEffect(() => { setGradFrom(bg.gradientFrom || "#a8edea"); setGradTo(bg.gradientTo || "#fed6e3"); }, [bg.gradientFrom, bg.gradientTo]);
  const handleGradChange = (from: string, to: string) => { setGradFrom(from); setGradTo(to); onChange({ ...bg, type: "gradient", gradientFrom: from, gradientTo: to, value: `linear-gradient(135deg, ${from}, ${to})` }); };
  return (
    <div className="space-y-3 p-3 rounded-2xl bg-white border shadow-sm">
      <p className="font-semibold text-sm">{label} — 6 slider glass</p>
      <div className="flex gap-1 flex-wrap">
        {(["color", "gradient", "image", "video", "transparent"] as const).map((t) => (
          <button key={t} onClick={() => onChange({ ...bg, type: t })} className={`px-3 py-1 rounded-full border text-xs ${bg.type === t ? "bg-black text-white" : "bg-white"}`}>{t}</button>
        ))}
      </div>
      {bg.type === "color" && <div className="flex gap-2 items-center"><input type="color" value={bg.value.startsWith("#") ? bg.value : "#ffffff"} onChange={(e) => onChange({ ...bg, value: e.target.value })} className="w-10 h-10 rounded-lg border" /><span className="text-xs opacity-60">Warna dasar</span></div>}
      {bg.type === "gradient" && <div className="flex gap-3"><label className="flex-1 text-[11px]">Warna 1<input type="color" value={gradFrom} onChange={(e) => handleGradChange(e.target.value, gradTo)} className="w-full h-9 rounded-lg border" /></label><label className="flex-1 text-[11px]">Warna 2<input type="color" value={gradTo} onChange={(e) => handleGradChange(gradFrom, e.target.value)} className="w-full h-9 rounded-lg border" /></label></div>}
      {(bg.type === "image" || bg.type === "video") && (
        <div className="space-y-2">
          <input
            value={bg.value}
            onChange={(e) => {
              const v = e.target.value;
              // auto-save langsung tanpa tombol Pakai
              if (!v.trim()) { onChange({ ...bg, value: "" }); return; }
              const isVid = isVideoUrl(v.trim());
              // jika link video, otomatis jadi video, jika gambar jadi image
              onChange({ ...bg, type: isVid ? "video" : "image", value: v.trim() });
            }}
            onPaste={(e) => {
              // paste langsung save juga
              const pasted = e.clipboardData.getData('text');
              if (pasted) {
                e.preventDefault();
                const v = pasted.trim();
                const isVid = isVideoUrl(v);
                onChange({ ...bg, type: isVid ? "video" : "image", value: v });
              }
            }}
            placeholder={bg.type === "video" ? "https://.../video.mp4 - paste langsung auto save" : "https://.../gambar.jpg - paste langsung auto save"}
            className="w-full p-2.5 rounded-xl border bg-white text-sm font-mono"
          />
          <p className="text-[10px] opacity-50">✓ Auto-save: tempel link langsung tersimpan, tidak perlu tombol Pakai</p>
        </div>
      )}
      <button type="button" onClick={() => onChange({ ...bg, hue: 0, alpha: 100, opacity: 100, blur: 0, backdrop: 0, saturate: 100, brightness: 100, refraction: 0 })} className="text-[11px] px-2.5 py-1 rounded-full bg-black/[0.06] border font-bold w-fit">↺ Reset</button>
      <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t">
        <label className="space-y-1">alpha {bg.alpha}%<input type="range" min={0} max={100} value={bg.alpha} onChange={(e) => onChange({ ...bg, alpha: Number(e.target.value), opacity: Number(e.target.value) })} className="w-full" /></label>
        <label className="space-y-1">blur {bg.blur}px<input type="range" min={0} max={30} value={bg.blur} onChange={(e) => onChange({ ...bg, blur: Number(e.target.value) })} className="w-full" /></label>
        <label className="space-y-1">backdrop {bg.backdrop}px<input type="range" min={0} max={40} value={bg.backdrop} onChange={(e) => onChange({ ...bg, backdrop: Number(e.target.value) })} className="w-full" /></label>
        <label className="space-y-1">saturate {bg.saturate}%<input type="range" min={0} max={300} value={bg.saturate} onChange={(e) => onChange({ ...bg, saturate: Number(e.target.value) })} className="w-full" /></label>
        <label className="space-y-1">brightness {bg.brightness}%<input type="range" min={0} max={200} value={bg.brightness} onChange={(e) => onChange({ ...bg, brightness: Number(e.target.value) })} className="w-full" /></label>
        <label className="space-y-1">refraction {bg.refraction}<input type="range" min={0} max={20} value={bg.refraction} onChange={(e) => onChange({ ...bg, refraction: Number(e.target.value) })} className="w-full" /></label>
      </div>
    </div>
  );
}
function ButtonDefaultsEditor({ defaults, onChange }: { defaults: ButtonDefaults; onChange: (d: ButtonDefaults) => void }) {
  return (
    <div className="p-3 rounded-2xl bg-white border shadow-sm space-y-3">
      <p className="font-semibold text-sm">🔘 Button Default</p>
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <label className="space-y-1">bgColor<input type="color" value={defaults.bgColor.startsWith("#") ? defaults.bgColor : "#ffffff"} onChange={(e) => onChange({ ...defaults, bgColor: e.target.value })} className="w-full h-7 rounded" /></label>
        <label className="space-y-1">textColor<input type="color" value={defaults.textColor} onChange={(e) => onChange({ ...defaults, textColor: e.target.value })} className="w-full h-7 rounded" /></label>
        <label className="space-y-1">alpha {defaults.alpha}%<input type="range" min={0} max={100} value={defaults.alpha} onChange={(e) => onChange({ ...defaults, alpha: Number(e.target.value) })} className="w-full" /></label>
        <label className="space-y-1">backdrop {defaults.backdrop}px<input type="range" min={0} max={40} value={defaults.backdrop} onChange={(e) => onChange({ ...defaults, backdrop: Number(e.target.value) })} className="w-full" /></label>
        <label className="space-y-1">radius {defaults.radius}px<input type="range" min={0} max={999} value={defaults.radius} onChange={(e) => onChange({ ...defaults, radius: Number(e.target.value) })} className="w-full" /></label>
        <label className="space-y-1">borderWidth {defaults.borderWidth}px<input type="range" min={0} max={8} value={defaults.borderWidth} onChange={(e) => onChange({ ...defaults, borderWidth: Number(e.target.value) })} className="w-full" /></label>
      </div>
    </div>
  );
}
function SortableLink({ block, onUpdate, onRemove }: { block: LinkItem; onUpdate: (b: LinkItem) => void; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: block.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} className="p-3 rounded-2xl bg-white border shadow-sm space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><span {...attributes} {...listeners} className="cursor-grab px-2">↕</span><span className="font-semibold text-sm">{block.title || "Link"}</span></div>
        <button onClick={onRemove} className="text-[11px] px-2 py-1 rounded-full bg-red-50 border text-red-600">hapus</button>
      </div>
      <input value={block.title} onChange={(e) => onUpdate({ ...block, title: e.target.value })} placeholder="Judul" className="w-full p-2 rounded-lg border text-sm" />
      <input value={block.url} onChange={(e) => onUpdate({ ...block, url: e.target.value })} placeholder="https://..." className="w-full p-2 rounded-lg border text-xs font-mono" />
    </div>
  );
}
function SortableDivider({ block, onUpdate, onRemove }: { block: DividerBlock; onUpdate: (b: DividerBlock) => void; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: block.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} className="p-3 rounded-2xl bg-white border shadow-sm space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><span {...attributes} {...listeners} className="cursor-grab px-2">↕</span><span className="font-semibold text-sm">Pembatas</span></div>
        <button onClick={onRemove} className="text-[11px] px-2 py-1 rounded-full bg-red-50 border text-red-600">hapus</button>
      </div>
      <input value={block.divider.text} onChange={(e) => onUpdate({ ...block, divider: { ...block.divider, text: e.target.value } })} placeholder="Teks pembatas" className="w-full p-2 rounded-lg border text-sm" />
    </div>
  );
}

export default function Admin() {
  const { slug: paramSlug } = useParams();
  const navigate = useNavigate();
  const [config, setConfig] = useState<MicrositeConfig>({ ...DEFAULT_CONFIG, slug: paramSlug || "main" });
  const [slug, setSlug] = useState(paramSlug || "main");
  const [allSlugs, setAllSlugs] = useState<string[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteInput, setDeleteInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const outerStyle = getBgLayerStyle(config.outerBg);
  const innerStyle = getBgLayerStyle(config.innerBg);
  const logoAnimStyle = `@keyframes logoFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}} @keyframes logoPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}} @keyframes logoSpin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}} @keyframes logoBounce{0%,100%{transform:translateY(0)}} @keyframes logoJelly{0%{transform:scale3d(1,1,1)}30%{transform:scale3d(1.15,0.85,1)}40%{transform:scale3d(0.9,1.1,1)}50%{transform:scale3d(1.05,0.95,1)}} @keyframes logoWiggle{0%,100%{transform:rotate(0)}25%{transform:rotate(-6deg)}75%{transform:rotate(6deg)}} .logo-anim-float{animation:logoFloat 3s ease-in-out infinite} .logo-anim-pulse{animation:logoPulse 2s ease-in-out infinite} .logo-anim-spin{animation:logoSpin 6s linear infinite} .logo-anim-bounce{animation:logoBounce 2s ease infinite} .logo-anim-jelly{animation:logoJelly 1.2s ease infinite} .logo-anim-wiggle{animation:logoWiggle 1.5s ease-in-out infinite}`;

  useEffect(() => {
    (async () => {
      try {
        const col = collection(db, "microsites");
        const snap = await getDocs(col);
        setAllSlugs(snap.docs.map((d) => d.id));
        const target = paramSlug || "main";
        const ref = doc(db, "microsites", target);
        const ds = await getDoc(ref);
        if (ds.exists()) {
          const data = ds.data() as MicrositeConfig;
          const safeOuter = { ...DEFAULT_CONFIG.outerBg, ...(data.outerBg || {}) } as BgConfig;
          const safeInner = { ...DEFAULT_CONFIG.innerBg, ...(data.innerBg || {}) } as BgConfig;
          const safeButton = { ...DEFAULT_CONFIG.buttonDefaults, ...(data.buttonDefaults || {}) };
          setConfig({ ...DEFAULT_CONFIG, ...data, outerBg: safeOuter, innerBg: safeInner, buttonDefaults: safeButton, slug: target } as MicrositeConfig);
        } else {
          setConfig({ ...DEFAULT_CONFIG, slug: target } as MicrositeConfig);
        }
      } catch (e) {
        console.error("Admin fetch error", e);
        setConfig({ ...DEFAULT_CONFIG, slug: paramSlug || "main" } as MicrositeConfig);
      }
    })();
  }, [paramSlug]);

  const handlePublishAndView = async (targetSlug?: string) => {
    const target = targetSlug || slug;
    const targetUrl = `/${target === "main" ? "" : target}`;
    const win = window.open("about:blank", "_blank");
    try {
      const ref = doc(db, "microsites", target);
      await setDoc(ref, { ...config, slug: target, updatedAt: Date.now() });
      const col = collection(db, "microsites");
      const snap = await getDocs(col);
      setAllSlugs(snap.docs.map((d) => d.id));
      navigate(`/admin/${target}`);
      if (win) win.location.href = targetUrl;
      else window.open(targetUrl, "_blank");
    } catch (e) {
      if (win) win.close();
      console.error(e);
    }
  };

  const toCSV = (rows: string[][]) => rows.map(r => r.map(v => `"${String(v ?? "").replace(/"/g,'""')}"`).join(",")).join("\n");
  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
  };

  const handleExportCurrent = async () => {
    const rows: string[][] = [["slug","urutan","nama_tombol","link","aktif"]];
    config.links.forEach((b, idx) => {
      if (isDivider(b)) return;
      const l = b as LinkItem;
      rows.push([slug, String(idx+1), l.title, l.url, "YA"]);
    });
    downloadFile(toCSV(rows), `${slug}-export.csv`);
  };

  const handleExportAll = async () => {
    const col = collection(db, "microsites");
    const snap = await getDocs(col);
    const rows: string[][] = [["slug","urutan","nama_tombol","link","aktif"]];
    snap.docs.forEach(d => {
      const data = d.data() as MicrositeConfig;
      (data.links || []).forEach((b, idx) => {
        if ((b as any).type === "divider") return;
        const l = b as LinkItem;
        rows.push([d.id, String(idx+1), l.title, l.url, "YA"]);
      });
    });
    downloadFile(toCSV(rows), `export-all-${snap.docs.length}-slug.csv`);
  };

  const handleDuplicate = async (sourceSlug: string) => {
    if (allSlugs.length >= 10) { alert("Maksimal 10 slug"); return; }
    const newSlug = `${sourceSlug}-copy-${Date.now().toString().slice(-4)}`.toLowerCase().replace(/[^a-z0-9-]/g,'-');
    try {
      const ref = doc(db, "microsites", sourceSlug);
      const snap = await getDoc(ref);
      if (!snap.exists()) return;
      await setDoc(doc(db, "microsites", newSlug), { ...snap.data(), slug: newSlug, updatedAt: Date.now() });
      const col = collection(db, "microsites");
      const all = await getDocs(col);
      setAllSlugs(all.docs.map(d => d.id));
      navigate(`/admin/${newSlug}`); setSlug(newSlug);
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (target: string) => {
    if (deleteInput !== target) return;
    try {
      await deleteDoc(doc(db, "microsites", target));
      const col = collection(db, "microsites");
      const snap = await getDocs(col);
      setAllSlugs(snap.docs.map(d => d.id));
      setDeleteConfirm(null); setDeleteInput("");
      if (slug === target) {
        const next = snap.docs[0]?.id || "main";
        navigate(`/admin/${next}`); setSlug(next);
      }
    } catch (e) { console.error(e); }
  };

  const parseCSV = (text: string): string[][] => {
    const lines = text.split(/\r?\n/).filter(l=>l.trim());
    return lines.map(line => {
      const res: string[] = []; let cur=""; let inQ=false;
      for (let i=0;i<line.length;i++){ const c=line[i]; if (c=='"'){ if (line[i+1]=='"'){ cur+='"'; i++; } else inQ=!inQ; } else if (c==',' && !inQ){ res.push(cur.trim()); cur=""; } else cur+=c; }
      res.push(cur.trim()); return res.map(v=>v.replace(/^"|"$/g,''));
    });
  };

  // FIX: hanya CSV, tidak pakai xlsx untuk hindari error TS2307 Cannot find module 'xlsx'
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      if (!file.name.toLowerCase().endsWith(".csv")) {
        alert("Silakan upload file .CSV (dari Google Sheets: File > Download > CSV). Untuk Excel, save as CSV dulu.");
        return;
      }
      const text = await file.text();
      const rows = parseCSV(text);
      if (rows.length < 2) { alert("File kosong"); return; }
      const header = rows[0].map(h=>h.toLowerCase().trim());
      const slugIdx = header.indexOf("slug");
      const namaIdx = header.indexOf("nama_tombol");
      const linkIdx = header.indexOf("link");
      const urutanIdx = header.indexOf("urutan");
      const aktifIdx = header.indexOf("aktif");
      if (slugIdx===-1 || namaIdx===-1 || linkIdx===-1) { alert("Header harus ada: slug, nama_tombol, link"); return; }

      const grouped: Record<string, { urutan:number; nama:string; link:string }[]> = {};
      for (let i=1;i<rows.length;i++){
        const r = rows[i]; if (!r || r.length<3) continue;
        const s = (r[slugIdx]||"").toLowerCase().replace(/[^a-z0-9-]/g,'-').trim(); if (!s) continue;
        const nama = (r[namaIdx]||"").trim(); if (!nama) continue;
        const link = (r[linkIdx]||"").trim(); if (!link) continue;
        const urutan = Number(r[urutanIdx]||i);
        const aktif = (r[aktifIdx]||"YA").toUpperCase();
        if (aktif==="TIDAK") continue;
        if (!grouped[s]) grouped[s]=[];
        grouped[s].push({ urutan: isNaN(urutan)?i:urutan, nama, link });
      }
      const slugsInFile = Object.keys(grouped);
      if (slugsInFile.length > 10) { alert(`File ada ${slugsInFile.length} slug, maksimal 10`); return; }

      const col = collection(db, "microsites");
      const currentSnap = await getDocs(col);
      const existing = new Set(currentSnap.docs.map(d=>d.id));
      const allDistinct = new Set([...existing, ...slugsInFile]);
      if (allDistinct.size > 10) {
        if (!confirm(`Total akan jadi ${allDistinct.size} slug (maks 10). Lanjut hanya slug existing?`)) return;
      }

      for (const s of slugsInFile) {
        if (allDistinct.size > 10 && !existing.has(s)) continue;
        const items = grouped[s].sort((a,b)=>a.urutan-b.urutan);
        const links: LinkItem[] = items.map((it, idx) => ({
          id: `link-${Date.now()}-${idx}-${Math.random().toString(36).slice(2,6)}`,
          title: it.nama,
          url: it.link,
          bgColor: "rgba(255,255,255,0.85)",
          textColor: "#111827",
          width: 100,
          fontSize: 15,
          height: "lg" as const,
          radius: 20,
          custom: false,
          shapeType: "pill" as const,
          tornAmount: 22,
          bold: true,
          alpha: 85,
          blur: 0,
          backdrop: 12,
          saturate: 150,
          brightness: 105,
          refraction: 2,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.8)",
          borderGradientFrom: "#ffffff",
          borderGradientTo: "#ffffff",
          borderRotation: 135,
        }));
        const ref = doc(db, "microsites", s);
        const snap = await getDoc(ref);
        let baseConfig: MicrositeConfig;
        if (snap.exists()) {
          const data = snap.data() as MicrositeConfig;
          baseConfig = { ...DEFAULT_CONFIG, ...data, slug: s } as MicrositeConfig;
        } else {
          baseConfig = { ...DEFAULT_CONFIG, slug: s } as MicrositeConfig;
        }
        await setDoc(ref, { ...baseConfig, links: links as any, slug: s, updatedAt: Date.now() });
      }
      const after = await getDocs(col);
      setAllSlugs(after.docs.map(d=>d.id));
      alert(`Import selesai: ${slugsInFile.length} slug`);
    } catch (err) {
      console.error(err); alert("Gagal import");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#f6f5f2]">
      <style>{logoAnimStyle}</style>
      <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleImportFile} />

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm space-y-3 shadow-xl">
            <p className="font-bold text-sm">Hapus slug <span className="font-mono bg-black/5 px-1 rounded">{deleteConfirm}</span>?</p>
            <p className="text-[11px] opacity-60">Ketik nama slug untuk konfirmasi.</p>
            <input value={deleteInput} onChange={(e)=>setDeleteInput(e.target.value)} placeholder={deleteConfirm} className="w-full p-2.5 rounded-xl border text-sm font-mono" autoFocus />
            <div className="flex gap-2">
              <button onClick={()=>{setDeleteConfirm(null); setDeleteInput("");}} className="flex-1 py-2 rounded-full border text-xs font-bold">Batal</button>
              <button disabled={deleteInput!==deleteConfirm} onClick={()=>handleDelete(deleteConfirm)} className="flex-1 py-2 rounded-full bg-red-600 text-white text-xs font-bold disabled:opacity-30">Hapus</button>
            </div>
          </div>
        </div>
      )}

      <div className="w-[420px] max-h-screen overflow-y-auto p-4 space-y-4 border-r bg-[#fdf2f8]">
        <div className="p-3 rounded-2xl bg-white border shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-sm">Slug Manager</p>
            <div className="flex gap-1.5">
              <div className="relative group/btn">
                <button onClick={handleExportAll} className="px-3 py-1 rounded-full bg-black text-white text-[11px] font-bold">export all</button>
                <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black text-white text-[10px] px-2 py-1 rounded-full opacity-0 group-hover/btn:opacity-100 transition-opacity">Export</span>
              </div>
              <div className="relative group/btn">
                <button onClick={()=>fileInputRef.current?.click()} className="px-3 py-1 rounded-full bg-white border text-[11px] font-bold">import</button>
                <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black text-white text-[10px] px-2 py-1 rounded-full opacity-0 group-hover/btn:opacity-100 transition-opacity">Impor</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 p-2 rounded-xl bg-black/[0.04] border">
            <input value={slug} onChange={(e)=>setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,'-'))} placeholder="nama-slug" className="flex-1 min-w-0 p-2 rounded-lg border bg-white text-sm font-mono" />
            <div className="flex gap-1">
              <IconBtn label="View" onClick={()=>handlePublishAndView()}>👁️</IconBtn>
              <IconBtn label="Export" onClick={()=>handleExportCurrent()}>⬇️</IconBtn>
              <IconBtn label="Duplikat" onClick={()=>handleDuplicate(slug)}>📋</IconBtn>
              <IconBtn label="Hapus" onClick={()=>setDeleteConfirm(slug)}>🗑️</IconBtn>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {allSlugs.map((s) => (
              <div key={s} className={`group relative flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full border text-[11px] cursor-pointer ${slug===s?"bg-black text-white border-black":"bg-white hover:bg-black/5"}`} onClick={()=>{setSlug(s); navigate(`/admin/${s}`);}}>
                <span className="font-mono">{s}</span>
                {slug===s && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
                <div className="hidden group-hover:flex items-center gap-0.5 ml-1">
                  <MiniIconBtn label="View" onClick={(e)=>{e.stopPropagation(); window.open(`/${s==="main"?"":s}`, "_blank");}}>👁️</MiniIconBtn>
                  <MiniIconBtn label="Export" onClick={(e)=>{e.stopPropagation(); setSlug(s); setTimeout(()=>handleExportCurrent(), 100);}}>⬇️</MiniIconBtn>
                  <MiniIconBtn label="Hapus" onClick={(e)=>{e.stopPropagation(); setDeleteConfirm(s);}}>🗑️</MiniIconBtn>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] opacity-50">{allSlugs.length}/10 slug • klik untuk edit</p>
        </div>

        <LogoEditor config={config} onChange={(c)=>setConfig(c)} />
        <BgGlassEditor label="🌈 Latar Luar (Outer)" bg={config.outerBg} onChange={(b)=>setConfig({ ...config, outerBg: b })} />
        <BgGlassEditor label="📱 Dalam Bingkai HP (Inner)" bg={config.innerBg} onChange={(b)=>setConfig({ ...config, innerBg: b })} />

        <div className="p-3 rounded-2xl bg-white border shadow-sm space-y-2">
          <p className="font-semibold text-sm">📐 Bingkai HP</p>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <label className="space-y-1">thickness {config.phoneFrame.thickness}px<input type="range" min={0} max={30} value={config.phoneFrame.thickness} onChange={(e)=>setConfig({ ...config, phoneFrame: { ...config.phoneFrame, thickness: Number(e.target.value) } })} className="w-full" /></label>
            <label className="space-y-1">radius {config.phoneFrame.radius}px<input type="range" min={0} max={80} value={config.phoneFrame.radius} onChange={(e)=>setConfig({ ...config, phoneFrame: { ...config.phoneFrame, radius: Number(e.target.value) } })} className="w-full" /></label>
            <label className="space-y-1">color<input type="color" value={config.phoneFrame.color} onChange={(e)=>setConfig({ ...config, phoneFrame: { ...config.phoneFrame, color: e.target.value } })} className="w-full h-7 rounded" /></label>
            <label className="space-y-1">shadow {config.phoneFrame.shadow}px<input type="range" min={0} max={80} value={config.phoneFrame.shadow} onChange={(e)=>setConfig({ ...config, phoneFrame: { ...config.phoneFrame, shadow: Number(e.target.value) } })} className="w-full" /></label>
          </div>
        </div>

        <ButtonDefaultsEditor defaults={config.buttonDefaults} onChange={(d)=>setConfig({ ...config, buttonDefaults: d })} />

        <div className="p-3 rounded-2xl bg-white border shadow-sm space-y-2">
          <p className="font-semibold text-sm">🔗 Links & Pembatas</p>
          <div className="flex gap-2">
            <button onClick={()=>setConfig({ ...config, links: [...config.links, { id: `link-${Date.now()}`, title: "Link baru", url: "https://", bgColor: "rgba(255,255,255,0.85)", textColor: "#111827", width: 100, fontSize: 15, height: "lg", radius: 20, custom: false, shapeType: "pill", tornAmount: 22, bold: true, alpha: 85, blur: 0, backdrop: 12, saturate: 150, brightness: 105, refraction: 2, borderWidth: 1, borderColor: "rgba(255,255,255,0.8)", borderGradientFrom: "#ffffff", borderGradientTo: "#ffffff", borderRotation: 135 } as LinkItem] })} className="px-3 py-1.5 rounded-full bg-black text-white text-[11px]">+ Link</button>
            <button onClick={()=>setConfig({ ...config, links: [...config.links, { id: `div-${Date.now()}`, type: "divider", divider: { enabled: true, text: "•", lineColor: "#ffffff", pillColor: "#ffffff", textColor: "#6b7280", height: 1.8, showDot: true } } as DividerBlock] })} className="px-3 py-1.5 rounded-full bg-white border text-[11px]">+ Pembatas</button>
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(event)=>{ const { active, over } = event; if (over && active.id!==over.id){ const oldIndex=config.links.findIndex(b=>b.id===active.id); const newIndex=config.links.findIndex(b=>b.id===over.id); setConfig({ ...config, links: arrayMove(config.links, oldIndex, newIndex) }); } }}>
            <SortableContext items={config.links.map(b=>b.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {config.links.map((block)=>{
                  if (isDivider(block)) return <SortableDivider key={block.id} block={block} onUpdate={(b)=>setConfig({ ...config, links: config.links.map(x=>x.id===b.id?b:x) })} onRemove={()=>setConfig({ ...config, links: config.links.filter(x=>x.id!==block.id) })} />;
                  return <SortableLink key={block.id} block={block as LinkItem} onUpdate={(b)=>setConfig({ ...config, links: config.links.map(x=>x.id===b.id?b:x) })} onRemove={()=>setConfig({ ...config, links: config.links.filter(x=>x.id!==block.id) })} />;
                })}
              </div>
            </SortableContext>
          </DndContext>
        </div>

      </div>

      <div className="flex-1 min-h-[100vh] flex items-center justify-center p-6 relative overflow-hidden bg-transparent">
        {(config.outerBg.type === "video" || isVideoUrl(config.outerBg.value)) ? <video src={config.outerBg.value} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover pointer-events-none" style={outerStyle} /> : <div className="absolute inset-0 pointer-events-none" style={outerStyle} />}
        <div className="relative w-[390px] max-w-full h-[760px] overflow-hidden flex flex-col shadow-2xl" style={{ border: `${config.phoneFrame.thickness}px solid ${config.phoneFrame.color}`, borderRadius: `${config.phoneFrame.radius}px`, boxShadow: `0 ${config.phoneFrame.shadow}px ${config.phoneFrame.shadow * 2}px rgba(0,0,0,0.18)`, background: "transparent" }}>
          {(config.innerBg.type === "video" || isVideoUrl(config.innerBg.value)) ? <video src={config.innerBg.value} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover pointer-events-none" style={{ ...innerStyle, borderRadius: `${Math.max(0, config.phoneFrame.radius - config.phoneFrame.thickness)}px` }} /> : <div className="absolute inset-0 pointer-events-none" style={{ ...innerStyle, borderRadius: `${Math.max(0, config.phoneFrame.radius - config.phoneFrame.thickness)}px` }} />}
          <div className="flex-1 overflow-y-auto scrollbar-none relative z-10" style={{ borderRadius: `${Math.max(0, config.phoneFrame.radius - config.phoneFrame.thickness)}px` }}>
            <div className="relative z-10 px-6 pt-10 pb-6 flex flex-col items-center">
              <div className={`overflow-hidden bg-white shadow-lg ${config.logoAnimation !== "none" ? (config.logoAnimationOnHover ? `logo-anim-on-hover` : `logo-anim-${config.logoAnimation}`) : ""}`} style={{ width: config.logoSize, height: config.logoSize, ...getLogoStyle(config.logoShape, config.logoRadius), border: `${config.logoBorderWidth}px solid ${config.logoBorderColor}`, animationDuration: `${config.logoAnimationSpeed}s` } as React.CSSProperties}>
                {isVideoUrl(config.logoUrl) ? <video src={config.logoUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" style={{ transform: `translate(${config.logoOffsetX}%, ${config.logoOffsetY}%) scale(${config.logoZoom / 100})` }} /> : <img src={config.logoUrl} className="w-full h-full object-cover" alt="logo" style={{ transform: `translate(${config.logoOffsetX}%, ${config.logoOffsetY}%) scale(${config.logoZoom / 100})` }} />}
              </div>
              <h2 className="mt-4 font-bold text-center" style={{ color: config.titleColor, fontSize: config.titleSize }}>{config.title}</h2>
              <div className="w-full mt-6 flex flex-col items-center" style={{ gap: config.gap }}>
                {config.links.map((block)=>{
                  if (isDivider(block)) { const d=block.divider; if (!d.enabled) return null; return <div key={block.id} className="w-full flex items-center justify-center gap-3 py-3"><div className="flex-1 h-[2px] rounded-full" style={{ background: d.lineColor, height: `${d.height}px` }} /><div className="px-2.5 py-1 rounded-full text-[10px] font-bold border bg-white" style={{ background: d.pillColor, color: d.textColor }}>{d.text||"•"}</div><div className="flex-1 h-[2px] rounded-full" style={{ background: d.lineColor, height: `${d.height}px` }} /></div>; }
                  const link=block as LinkItem; const src=link.custom?link:config.buttonDefaults; const bgAlpha=src.alpha; const backdropFilter=`blur(${src.backdrop}px) saturate(${src.saturate}%) brightness(${src.brightness}%) contrast(${100+src.refraction*2}%)`; const filterSelf=`blur(${src.blur}px) saturate(${src.saturate}%) brightness(${src.brightness}%)`; const rawColor=src.bgColor; let bgColor:string; if (rawColor.startsWith("#")) bgColor=`rgba(${parseInt(rawColor.slice(1,3),16)},${parseInt(rawColor.slice(3,5),16)},${parseInt(rawColor.slice(5,7),16)},${bgAlpha/100})`; else { const inner=rawColor.replace(/rgba?\(/, "").replace(/\)/, ""); const parts=inner.split(",").map(s=>s.trim()); bgColor=`rgba(${parts[0]||"255"},${parts[1]||"255"},${parts[2]||"255"},${bgAlpha/100})`; } const isTorn=src.shapeType==="torn"; const radiusVal=isTorn?"4px":src.radius>=999?"9999px":`${src.radius}px`; const clipPath=isTorn?getTornClipPath(src.tornAmount):undefined; const borderStyle: React.CSSProperties={}; if (src.borderWidth>0){ const from=src.borderGradientFrom; const to=src.borderGradientTo; if (from&&to&&from!==to){ borderStyle.border=`${src.borderWidth}px solid transparent`; borderStyle.borderImage=`linear-gradient(${src.borderRotation}deg, ${from}, ${to}) 1`; } else borderStyle.border=`${src.borderWidth}px solid ${src.borderColor}`; }
                  return <div key={link.id} className={`jelly-card flex items-center justify-center text-center px-5 cursor-pointer w-full relative overflow-hidden ${heightMap(link.height)}`} style={{ width: link.custom?`${link.width}%`:"100%", maxWidth:"100%", borderRadius: radiusVal, clipPath, fontSize: link.fontSize, fontWeight: src.bold?700:500, fontStyle: src.italic?"italic":"normal", backdropFilter, WebkitBackdropFilter: backdropFilter, isolation:"isolate", ...borderStyle }}><span className="absolute inset-0 pointer-events-none" style={{ background: bgColor, filter: filterSelf, borderRadius: radiusVal, clipPath }} /><span className="relative z-10" style={{ color: src.textColor }}>{link.title}</span></div>;
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
