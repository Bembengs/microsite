import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";
import { DEFAULT_CONFIG, getBgLayerStyle } from "./App";
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

function isDivider(b: ContentBlock): b is DividerBlock {
  return (b as DividerBlock).type === "divider";
}

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

function LogoEditor({ config, onChange }: { config: MicrositeConfig; onChange: (c: MicrositeConfig) => void }) {
  return (
    <div className="p-3 rounded-2xl bg-white border shadow-sm space-y-3">
      <p className="font-semibold text-sm">🖼️ Logo & Judul — pengaturan lengkap</p>
      <input value={config.logoUrl} onChange={(e) => onChange({ ...config, logoUrl: e.target.value })} placeholder="https://.../logo.png" className="w-full p-2.5 rounded-xl border bg-white text-xs font-mono" />
      <div className="flex gap-1 flex-wrap">
        {(["circle", "square", "rounded", "hexagon", "blob", "jelly"] as const).map((s) => (
          <button key={s} onClick={() => onChange({ ...config, logoShape: s })} className={`px-2.5 py-1 rounded-full border text-[11px] ${config.logoShape === s ? "bg-black text-white" : "bg-white"}`}>
            {s}
          </button>
        ))}
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
  const [pasting, setPasting] = useState(bg.type === "image" ? bg.value : "");
  const [gradFrom, setGradFrom] = useState(bg.gradientFrom || "#a8edea");
  const [gradTo, setGradTo] = useState(bg.gradientTo || "#fed6e3");

  useEffect(() => {
    if (bg.type === "image") setPasting(bg.value);
  }, [bg.value, bg.type]);

  useEffect(() => {
    setGradFrom(bg.gradientFrom || "#a8edea");
    setGradTo(bg.gradientTo || "#fed6e3");
  }, [bg.gradientFrom, bg.gradientTo]);

  const handlePaste = () => {
    if (!pasting.trim()) return;
    onChange({ ...bg, type: "image", value: pasting.trim() });
  };

  const handleGradChange = (from: string, to: string) => {
    setGradFrom(from);
    setGradTo(to);
    onChange({ ...bg, type: "gradient", gradientFrom: from, gradientTo: to, value: `linear-gradient(135deg, ${from}, ${to})` });
  };

  return (
    <div className="space-y-3 p-3 rounded-2xl bg-white border shadow-sm">
      <p className="font-semibold text-sm">{label} — 6 slider glass</p>
      <div className="flex gap-1 flex-wrap">
        {(["color", "gradient", "image", "transparent"] as const).map((t) => (
          <button key={t} onClick={() => onChange({ ...bg, type: t })} className={`px-3 py-1 rounded-full border text-xs ${bg.type === t ? "bg-black text-white" : "bg-white"}`}>
            {t}
          </button>
        ))}
      </div>

      {bg.type === "color" && (
        <div className="flex gap-2 items-center">
          <input type="color" value={bg.value.startsWith("#") ? bg.value : "#ffffff"} onChange={(e) => onChange({ ...bg, value: e.target.value })} className="w-10 h-10 rounded-lg border" />
          <span className="text-xs opacity-60">Warna dasar</span>
        </div>
      )}

      {bg.type === "gradient" && (
        <div className="flex gap-3">
          <label className="flex-1 text-[11px]">
            Warna 1<input type="color" value={gradFrom} onChange={(e) => handleGradChange(e.target.value, gradTo)} className="w-full h-9 rounded-lg border" />
          </label>
          <label className="flex-1 text-[11px]">
            Warna 2<input type="color" value={gradTo} onChange={(e) => handleGradChange(gradFrom, e.target.value)} className="w-full h-9 rounded-lg border" />
          </label>
        </div>
      )}

      {bg.type === "image" && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input value={pasting} onChange={(e) => setPasting(e.target.value)} placeholder="https://.../gambar.jpg" className="flex-1 p-2.5 rounded-xl border bg-white text-sm font-mono" />
            <button onClick={handlePaste} className="px-3 py-2 rounded-xl bg-black text-white text-xs font-bold">
              Pakai
            </button>
          </div>
        </div>
      )}

      {bg.type === "transparent" && <p className="text-[11px] opacity-60">Mode kaca murni — hanya backdrop blur + alpha putih tipis</p>}

      <button
        type="button"
        onClick={() => onChange({ ...bg, hue: 0, alpha: 100, opacity: 100, blur: 0, backdrop: 0, saturate: 100, brightness: 100, refraction: 0 })}
        className="text-[11px] px-2.5 py-1 rounded-full bg-black/[0.06] hover:bg-black/[0.10] border font-bold w-fit"
      >
        ↺ Reset ke asli (6 slider)
      </button>

      <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t">
        <label className="space-y-1">
          alpha {bg.alpha}%<input type="range" min={0} max={100} value={bg.alpha} onChange={(e) => onChange({ ...bg, alpha: Number(e.target.value), opacity: Number(e.target.value) })} className="w-full" />
        </label>
        <label className="space-y-1">
          blur {bg.blur}px<input type="range" min={0} max={30} value={bg.blur} onChange={(e) => onChange({ ...bg, blur: Number(e.target.value) })} className="w-full" />
        </label>
        <label className="space-y-1">
          backdrop {bg.backdrop}px<input type="range" min={0} max={40} value={bg.backdrop} onChange={(e) => onChange({ ...bg, backdrop: Number(e.target.value) })} className="w-full" />
        </label>
        <label className="space-y-1">
          saturate {bg.saturate}%<input type="range" min={0} max={300} value={bg.saturate} onChange={(e) => onChange({ ...bg, saturate: Number(e.target.value) })} className="w-full" />
        </label>
        <label className="space-y-1">
          brightness {bg.brightness}%<input type="range" min={50} max={200} value={bg.brightness} onChange={(e) => onChange({ ...bg, brightness: Number(e.target.value) })} className="w-full" />
        </label>
        <label className="space-y-1">
          refraction {bg.refraction}<input type="range" min={0} max={30} value={bg.refraction} onChange={(e) => onChange({ ...bg, refraction: Number(e.target.value) })} className="w-full" />
        </label>
      </div>
    </div>
  );
}

function ButtonDefaultsEditor({ defaults, onChange }: { defaults: ButtonDefaults; onChange: (d: ButtonDefaults) => void }) {
  const [tab, setTab] = useState<"warna" | "bentuk" | "font" | "border">("warna");
  return (
    <div className="p-3 rounded-2xl bg-white border shadow-sm space-y-3">
      <p className="font-semibold text-sm">🎛️ Button Default — 6 slider glass</p>
      <div className="flex gap-1">
        {(["warna", "bentuk", "font", "border"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-1.5 rounded-full border text-xs font-bold ${tab === t ? "bg-black text-white" : "bg-white"}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === "warna" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1 text-[11px]">
              Bg<input type="color" value={defaults.bgColor.startsWith("#") ? defaults.bgColor : "#ffffff"} onChange={(e) => onChange({ ...defaults, bgColor: e.target.value })} className="w-full h-8 rounded-lg border" />
            </label>
            <label className="space-y-1 text-[11px]">
              Teks<input type="color" value={defaults.textColor.startsWith("#") ? defaults.textColor : "#111827"} onChange={(e) => onChange({ ...defaults, textColor: e.target.value })} className="w-full h-8 rounded-lg border" />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <label className="space-y-1">
              alpha {defaults.alpha}%<input type="range" min={0} max={100} value={defaults.alpha} onChange={(e) => onChange({ ...defaults, alpha: Number(e.target.value) })} className="w-full" />
            </label>
            <label className="space-y-1">
              blur {defaults.blur}px<input type="range" min={0} max={20} value={defaults.blur} onChange={(e) => onChange({ ...defaults, blur: Number(e.target.value) })} className="w-full" />
            </label>
            <label className="space-y-1">
              backdrop {defaults.backdrop}px<input type="range" min={0} max={40} value={defaults.backdrop} onChange={(e) => onChange({ ...defaults, backdrop: Number(e.target.value) })} className="w-full" />
            </label>
            <label className="space-y-1">
              saturate {defaults.saturate}%<input type="range" min={0} max={300} value={defaults.saturate} onChange={(e) => onChange({ ...defaults, saturate: Number(e.target.value) })} className="w-full" />
            </label>
            <label className="space-y-1">
              brightness {defaults.brightness}%<input type="range" min={50} max={200} value={defaults.brightness} onChange={(e) => onChange({ ...defaults, brightness: Number(e.target.value) })} className="w-full" />
            </label>
            <label className="space-y-1">
              refraction {defaults.refraction}<input type="range" min={0} max={30} value={defaults.refraction} onChange={(e) => onChange({ ...defaults, refraction: Number(e.target.value) })} className="w-full" />
            </label>
          </div>
        </div>
      )}

      {tab === "bentuk" && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <button onClick={() => onChange({ ...defaults, shapeType: "torn" })} className={`flex-1 py-1.5 rounded-full border text-xs font-bold ${defaults.shapeType === "torn" ? "bg-black text-white" : "bg-white"}`}>
              Torn Paper
            </button>
            <button onClick={() => onChange({ ...defaults, shapeType: "pill" })} className={`flex-1 py-1.5 rounded-full border text-xs font-bold ${defaults.shapeType === "pill" ? "bg-black text-white" : "bg-white"}`}>
              Pill
            </button>
          </div>
          {defaults.shapeType === "torn" ? (
            <label className="text-[11px] space-y-1">
              Torn amount<input type="range" min={0} max={100} value={defaults.tornAmount} onChange={(e) => onChange({ ...defaults, tornAmount: Number(e.target.value) })} className="w-full" />
            </label>
          ) : (
            <label className="text-[11px] space-y-1">
              Radius {defaults.radius}px<input type="range" min={0} max={999} value={defaults.radius >= 999 ? 999 : defaults.radius} onChange={(e) => onChange({ ...defaults, radius: Number(e.target.value) })} className="w-full" />
            </label>
          )}
        </div>
      )}

      {tab === "font" && (
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={!!defaults.bold} onChange={(e) => onChange({ ...defaults, bold: e.target.checked })} /> Bold
          </label>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={!!defaults.italic} onChange={(e) => onChange({ ...defaults, italic: e.target.checked })} /> Italic
          </label>
        </div>
      )}

      {tab === "border" && (
        <div className="space-y-2 text-[11px]">
          <label>
            Tebal {defaults.borderWidth}px<input type="range" min={0} max={8} value={defaults.borderWidth} onChange={(e) => onChange({ ...defaults, borderWidth: Number(e.target.value) })} className="w-full" />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label>
              Warna<input type="color" value={defaults.borderColor.startsWith("#") ? defaults.borderColor : "#ffffff"} onChange={(e) => onChange({ ...defaults, borderColor: e.target.value })} className="w-full h-7" />
            </label>
            <label>
              Grad From<input type="color" value={defaults.borderGradientFrom.startsWith("#") ? defaults.borderGradientFrom : "#ffffff"} onChange={(e) => onChange({ ...defaults, borderGradientFrom: e.target.value })} className="w-full h-7" />
            </label>
            <label>
              Grad To<input type="color" value={defaults.borderGradientTo.startsWith("#") ? defaults.borderGradientTo : "#ffffff"} onChange={(e) => onChange({ ...defaults, borderGradientTo: e.target.value })} className="w-full h-7" />
            </label>
            <label>
              Rotation {defaults.borderRotation}°<input type="range" min={0} max={360} value={defaults.borderRotation} onChange={(e) => onChange({ ...defaults, borderRotation: Number(e.target.value) })} className="w-full" />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

function SortableLink({ link, onChange, onRemove }: { link: LinkItem; onChange: (l: LinkItem) => void; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: link.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const [tab, setTab] = useState<"warna" | "bentuk" | "font" | "border">("warna");
  return (
    <div ref={setNodeRef} style={style} className="rounded-[18px] bg-white border shadow p-3 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <button {...attributes} {...listeners} className="px-2 py-1 rounded bg-black/5 cursor-grab">
          ⠿
        </button>
        <input value={link.title} onChange={(e) => onChange({ ...link, title: e.target.value })} className="flex-1 p-1.5 rounded-lg border text-sm font-bold bg-white" />
        <button onClick={onRemove} className="text-xs px-2.5 py-1 bg-red-500 text-white rounded-full">
          ✕
        </button>
      </div>
      <input value={link.url} onChange={(e) => onChange({ ...link, url: e.target.value })} placeholder="https://..." className="w-full p-2 rounded-lg border text-xs font-mono bg-white" />

      <div className="flex gap-1">
        {(["warna", "bentuk", "font", "border"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-1 rounded-full border text-[10px] font-bold ${tab === t ? "bg-black text-white" : "bg-white"}`}>
            {t}
          </button>
        ))}
      </div>

      <label className="flex items-center gap-2 text-[11px]">
        <input type="checkbox" checked={link.custom} onChange={(e) => onChange({ ...link, custom: e.target.checked })} /> Custom (abaikan default)
      </label>

      {tab === "warna" && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase opacity-60">Bg</p>
              <input type="color" value={link.bgColor.startsWith("#") ? link.bgColor : "#ffffff"} onChange={(e) => onChange({ ...link, bgColor: e.target.value })} className="w-9 h-9 rounded-lg border" />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase opacity-60">Teks</p>
              <input type="color" value={link.textColor.startsWith("#") ? link.textColor : "#111827"} onChange={(e) => onChange({ ...link, textColor: e.target.value })} className="w-9 h-9 rounded-lg border" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <label>
              alpha {link.alpha}%<input type="range" min={0} max={100} value={link.alpha} onChange={(e) => onChange({ ...link, alpha: Number(e.target.value) })} className="w-full" />
            </label>
            <label>
              blur {link.blur}px<input type="range" min={0} max={20} value={link.blur} onChange={(e) => onChange({ ...link, blur: Number(e.target.value) })} className="w-full" />
            </label>
            <label>
              backdrop {link.backdrop}px<input type="range" min={0} max={40} value={link.backdrop} onChange={(e) => onChange({ ...link, backdrop: Number(e.target.value) })} className="w-full" />
            </label>
            <label>
              saturate {link.saturate}%<input type="range" min={0} max={300} value={link.saturate} onChange={(e) => onChange({ ...link, saturate: Number(e.target.value) })} className="w-full" />
            </label>
            <label>
              brightness {link.brightness}%<input type="range" min={50} max={200} value={link.brightness} onChange={(e) => onChange({ ...link, brightness: Number(e.target.value) })} className="w-full" />
            </label>
            <label>
              refraction {link.refraction}<input type="range" min={0} max={30} value={link.refraction} onChange={(e) => onChange({ ...link, refraction: Number(e.target.value) })} className="w-full" />
            </label>
          </div>
        </div>
      )}

      {tab === "bentuk" && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <button onClick={() => onChange({ ...link, shapeType: "torn" })} className={`flex-1 py-1.5 rounded-full border text-xs font-bold ${link.shapeType === "torn" ? "bg-black text-white" : "bg-white"}`}>
              Torn Paper
            </button>
            <button onClick={() => onChange({ ...link, shapeType: "pill" })} className={`flex-1 py-1.5 rounded-full border text-xs font-bold ${link.shapeType === "pill" ? "bg-black text-white" : "bg-white"}`}>
              Pill
            </button>
          </div>
          {link.shapeType === "torn" ? (
            <div className="space-y-1">
              <p className="text-[11px] opacity-70">Jumlah torn</p>
              <input type="range" min={0} max={100} value={link.tornAmount} onChange={(e) => onChange({ ...link, tornAmount: Number(e.target.value) })} className="w-full" />
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-[11px] opacity-70">Bulat ke tajam</p>
              <input type="range" min={0} max={999} value={link.radius >= 999 ? 999 : link.radius} onChange={(e) => onChange({ ...link, radius: Number(e.target.value) })} className="w-full" />
            </div>
          )}
        </div>
      )}

      {tab === "font" && (
        <div className="grid grid-cols-2 gap-3 text-[11px]">
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={!!link.bold} onChange={(e) => onChange({ ...link, bold: e.target.checked })} /> Bold
          </label>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={!!link.italic} onChange={(e) => onChange({ ...link, italic: e.target.checked })} /> Italic
          </label>
          <label>
            Width {link.width}%<input type="range" min={50} max={100} value={link.width} onChange={(e) => onChange({ ...link, width: Number(e.target.value) })} className="w-full" />
          </label>
          <label>
            Font {link.fontSize}px<input type="range" min={10} max={22} value={link.fontSize} onChange={(e) => onChange({ ...link, fontSize: Number(e.target.value) })} className="w-full" />
          </label>
          <div className="col-span-2 flex gap-1">
            {(["sm", "md", "lg", "xl"] as const).map((h) => (
              <button key={h} onClick={() => onChange({ ...link, height: h })} className={`flex-1 py-1.5 rounded-full border text-xs font-bold ${link.height === h ? "bg-black text-white" : "bg-white"}`}>
                {h}
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === "border" && (
        <div className="space-y-2 text-[11px]">
          <label>
            Tebal {link.borderWidth}px<input type="range" min={0} max={8} value={link.borderWidth} onChange={(e) => onChange({ ...link, borderWidth: Number(e.target.value) })} className="w-full" />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label>
              Warna<input type="color" value={link.borderColor.startsWith("#") ? link.borderColor : "#ffffff"} onChange={(e) => onChange({ ...link, borderColor: e.target.value })} className="w-full h-7" />
            </label>
            <label>
              Grad From<input type="color" value={link.borderGradientFrom.startsWith("#") ? link.borderGradientFrom : "#ffffff"} onChange={(e) => onChange({ ...link, borderGradientFrom: e.target.value })} className="w-full h-7" />
            </label>
            <label>
              Grad To<input type="color" value={link.borderGradientTo.startsWith("#") ? link.borderGradientTo : "#ffffff"} onChange={(e) => onChange({ ...link, borderGradientTo: e.target.value })} className="w-full h-7" />
            </label>
            <label>
              Rotation {link.borderRotation}°<input type="range" min={0} max={360} value={link.borderRotation} onChange={(e) => onChange({ ...link, borderRotation: Number(e.target.value) })} className="w-full" />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

function SortableDivider({ divider, onChange, onRemove }: { divider: DividerBlock; onChange: (d: DividerBlock) => void; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: divider.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} className="rounded-[18px] bg-gradient-to-br from-pink-50 to-white border border-pink-100 shadow p-3 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <button {...attributes} {...listeners} className="px-2 py-1 rounded bg-black/5 cursor-grab">
          ⠿
        </button>
        <span className="flex-1 text-xs font-bold">➖ Pembatas</span>
        <button onClick={onRemove} className="text-xs px-2.5 py-1 bg-red-500 text-white rounded-full">
          ✕
        </button>
      </div>
      <input value={divider.divider.text} onChange={(e) => onChange({ ...divider, divider: { ...divider.divider, text: e.target.value } })} placeholder="Teks tengah" className="w-full p-2 rounded-lg border text-sm bg-white" />
    </div>
  );
}

export default function Admin() {
  const { slug: paramSlug } = useParams();
  const navigate = useNavigate();
  const [slug, setSlug] = useState(paramSlug || "main");
  const [config, setConfig] = useState<MicrositeConfig>({ ...DEFAULT_CONFIG, slug: paramSlug || "main" });
  const [allSlugs, setAllSlugs] = useState<string[]>([]);
  const [newSlug, setNewSlug] = useState("");
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const previewRef = React.useRef<HTMLDivElement>(null);
  const outerStyle = getBgLayerStyle(config.outerBg);
  const innerStyle = getBgLayerStyle(config.innerBg);

  useEffect(() => {
    (async () => {
      const col = collection(db, "microsites");
      const snap = await getDocs(col);
      setAllSlugs(snap.docs.map((d) => d.id));
      const target = paramSlug || "main";
      const ref = doc(db, "microsites", target);
      const ds = await getDoc(ref);
      if (ds.exists()) {
        const data = ds.data() as MicrositeConfig;
        setConfig({ ...DEFAULT_CONFIG, ...data, slug: target } as MicrositeConfig);
      }
    })();
  }, [paramSlug]);

  const handlePublish = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "microsites", slug), { ...config, slug, updatedAt: Date.now() });
      window.open(`/${slug === "main" ? "" : slug}`, "_blank");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f6f5f2]">
      <style>{`
        @keyframes jellyWobbleSubtle{0%{transform:translateY(0) scale3d(1,1,1)}50%{transform:translateY(-1px) scale3d(0.98,1.02,1)}100%{transform:translateY(-2px) scale3d(1,1,1)}}
        .jelly-card{backdrop-filter:blur(18px) saturate(180%);border:1.2px solid rgba(255,255,255,.65);will-change:transform;transform-origin:center bottom;transition:transform 0.25s ease, box-shadow 0.25s ease}
        .jelly-card:hover{transform:translateY(-3px);animation:jellyWobbleSubtle 0.5s ease-out both}
      `}</style>

      <div className="w-full md:w-[520px] h-[100vh] overflow-y-auto p-4 space-y-4 border-r bg-white">
        <h1 className="text-xl font-bold">Bembengs Admin • Glass 6 Sliders + Button Default/Custom</h1>

        <div className="p-3 rounded-2xl bg-black/[0.04] space-y-2">
          <p className="font-semibold text-sm">🌐 Slug Manager</p>
          <div className="flex gap-2 flex-wrap">
            {allSlugs.map((s) => (
              <button key={s} onClick={() => { setSlug(s); navigate(`/admin/${s}`); }} className={`px-3 py-1 rounded-full text-xs ${s === slug ? "bg-black text-white" : "bg-white border"}`}>
                {s}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={newSlug} onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} placeholder="slug-baru" className="flex-1 px-3 py-1.5 rounded-full bg-white border text-sm" />
            <button onClick={() => { if (newSlug) { setSlug(newSlug); setConfig({ ...DEFAULT_CONFIG, slug: newSlug }); navigate(`/admin/${newSlug}`); setNewSlug(""); } }} className="px-3 py-1.5 rounded-full bg-black text-white text-xs">
              + Tambah
            </button>
          </div>
        </div>

        <LogoEditor config={config} onChange={(c) => setConfig(c)} />

        <BgGlassEditor label="🌈 Latar Luar (Outer)" bg={config.outerBg} onChange={(b) => setConfig({ ...config, outerBg: b })} />
        <BgGlassEditor label="📱 Dalam Bingkai HP (Inner) — 6 setting" bg={config.innerBg} onChange={(b) => setConfig({ ...config, innerBg: b })} />

        <div className="p-3 rounded-2xl bg-white border shadow-sm space-y-2">
          <p className="font-semibold text-sm">🖼️ Border Bingkai HP</p>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <label>
              Tebal {config.phoneFrame.thickness}px<input type="range" min={0} max={20} value={config.phoneFrame.thickness} onChange={(e) => setConfig({ ...config, phoneFrame: { ...config.phoneFrame, thickness: Number(e.target.value) } })} className="w-full" />
            </label>
            <label>
              Radius {config.phoneFrame.radius}px<input type="range" min={0} max={60} value={config.phoneFrame.radius} onChange={(e) => setConfig({ ...config, phoneFrame: { ...config.phoneFrame, radius: Number(e.target.value) } })} className="w-full" />
            </label>
            <label>
              Warna<input type="color" value={config.phoneFrame.color} onChange={(e) => setConfig({ ...config, phoneFrame: { ...config.phoneFrame, color: e.target.value } })} className="w-full h-7" />
            </label>
            <label>
              Shadow {config.phoneFrame.shadow}px<input type="range" min={0} max={60} value={config.phoneFrame.shadow} onChange={(e) => setConfig({ ...config, phoneFrame: { ...config.phoneFrame, shadow: Number(e.target.value) } })} className="w-full" />
            </label>
          </div>
        </div>

        <ButtonDefaultsEditor defaults={config.buttonDefaults} onChange={(d) => setConfig({ ...config, buttonDefaults: d })} />

        <div className="p-3 rounded-2xl bg-black/[0.04] space-y-2">
          <p className="font-semibold text-sm">🧩 Konten — Link & Pembatas — default/custom + 4 menu</p>
          <div className="flex gap-2">
            <button
              onClick={() =>
                setConfig({
                  ...config,
                  links: [
                    ...config.links,
                    {
                      id: Date.now().toString(),
                      title: "Link Baru",
                      url: "#",
                      bgColor: "#ffffff",
                      textColor: "#111827",
                      width: 100,
                      fontSize: 15,
                      height: "lg",
                      radius: 20,
                      type: "link",
                      custom: false,
                      shapeType: "pill",
                      tornAmount: 22,
                      alpha: 80,
                      blur: 0,
                      backdrop: 14,
                      saturate: 150,
                      brightness: 108,
                      refraction: 2,
                      borderWidth: 0,
                      borderColor: "#ffffff",
                      borderGradientFrom: "#ffffff",
                      borderGradientTo: "#ffffff",
                      borderRotation: 135,
                    } as LinkItem,
                  ],
                })
              }
              className="flex-1 text-xs px-3 py-2 rounded-full bg-black text-white font-bold"
            >
              + Tombol
            </button>
            <button
              onClick={() =>
                setConfig({
                  ...config,
                  links: [
                    ...config.links,
                    {
                      id: `div-${Date.now()}`,
                      type: "divider",
                      divider: { enabled: true, text: "", lineColor: "#ffffff", pillColor: "#ffffff", textColor: "#6b7280", height: 1.8, showDot: true },
                    } as DividerBlock,
                  ],
                })
              }
              className="flex-1 text-xs px-3 py-2 rounded-full bg-white border font-bold"
            >
              + Pembatas
            </button>
          </div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(event) => {
              const { active, over } = event;
              if (over && active.id !== over.id) {
                const oldIndex = config.links.findIndex((l) => l.id === active.id);
                const newIndex = config.links.findIndex((l) => l.id === over.id);
                setConfig({ ...config, links: arrayMove(config.links, oldIndex, newIndex) });
              }
            }}
          >
            <SortableContext items={config.links.map((l) => l.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {config.links.map((block) =>
                  isDivider(block) ? (
                    <SortableDivider key={block.id} divider={block} onChange={(nd) => setConfig({ ...config, links: config.links.map((b) => (b.id === nd.id ? nd : b)) })} onRemove={() => setConfig({ ...config, links: config.links.filter((b) => b.id !== block.id) })} />
                  ) : (
                    <SortableLink key={block.id} link={block as LinkItem} onChange={(nl) => setConfig({ ...config, links: config.links.map((b) => (b.id === nl.id ? nl : b)) })} onRemove={() => setConfig({ ...config, links: config.links.filter((b) => b.id !== block.id) })} />
                  )
                )}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        <button onClick={handlePublish} disabled={saving} className="w-full py-3 rounded-full bg-black text-white font-bold text-sm sticky bottom-4 shadow-xl">
          {saving ? "Publishing..." : `🚀 Publish /${slug}`}
        </button>
      </div>

      <div className="flex-1 min-h-[100vh] flex items-center justify-center p-6 relative overflow-hidden bg-transparent">
        <div className="absolute inset-0 pointer-events-none" style={outerStyle} />
        <div
          className="relative w-[390px] max-w-full h-[760px] overflow-hidden flex flex-col shadow-2xl"
          style={{
            border: `${config.phoneFrame.thickness}px solid ${config.phoneFrame.color}`,
            borderRadius: `${config.phoneFrame.radius}px`,
            boxShadow: `0 ${config.phoneFrame.shadow}px ${config.phoneFrame.shadow * 2}px rgba(0,0,0,0.18)`,
            background: "transparent",
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              ...innerStyle,
              borderRadius: `${Math.max(0, config.phoneFrame.radius - config.phoneFrame.thickness)}px`,
            }}
          />
          <div ref={previewRef} className="flex-1 overflow-y-auto scrollbar-none relative z-10" style={{ borderRadius: `${Math.max(0, config.phoneFrame.radius - config.phoneFrame.thickness)}px` }}>
            <div className="relative z-10 px-6 pt-10 pb-6 flex flex-col items-center">
              <div className="overflow-hidden bg-white shadow-lg" style={{ width: config.logoSize, height: config.logoSize, ...getLogoStyle(config.logoShape, config.logoRadius), border: `${config.logoBorderWidth}px solid ${config.logoBorderColor}` }}>
                <img src={config.logoUrl} className="w-full h-full object-cover" alt="logo" style={{ transform: `translate(${config.logoOffsetX}%, ${config.logoOffsetY}%) scale(${config.logoZoom / 100})` }} />
              </div>
              <h2 className="mt-4 font-bold text-center" style={{ color: config.titleColor, fontSize: config.titleSize }}>
                {config.title}
              </h2>
              <div className="w-full mt-6 flex flex-col items-center" style={{ gap: config.gap }}>
                {config.links.map((block) => {
                  if (isDivider(block)) {
                    const d = block.divider;
                    if (!d.enabled) return null;
                    return (
                      <div key={block.id} className="w-full flex items-center justify-center gap-3 py-3">
                        <div className="flex-1 h-[2px] rounded-full" style={{ background: d.lineColor, height: `${d.height}px` }} />
                        <div className="px-2.5 py-1 rounded-full text-[10px] font-bold border bg-white" style={{ background: d.pillColor, color: d.textColor }}>
                          {d.text || "•"}
                        </div>
                        <div className="flex-1 h-[2px] rounded-full" style={{ background: d.lineColor, height: `${d.height}px` }} />
                      </div>
                    );
                  }
                  const link = block as LinkItem;
                  const src = link.custom ? link : config.buttonDefaults;
                  const bgAlpha = src.alpha;
                  const backdropFilter = `blur(${src.backdrop}px) saturate(${src.saturate}%) brightness(${src.brightness}%) contrast(${100 + src.refraction * 2}%)`;
                  const filterSelf = `blur(${src.blur}px) saturate(${src.saturate}%) brightness(${src.brightness}%)`;
                  const rawColor = src.bgColor;
                  let bgColor: string;
                  if (rawColor.startsWith("#")) {
                    bgColor = `rgba(${parseInt(rawColor.slice(1, 3), 16)},${parseInt(rawColor.slice(3, 5), 16)},${parseInt(rawColor.slice(5, 7), 16)},${bgAlpha / 100})`;
                  } else {
                    const inner = rawColor.replace(/rgba?\(/, "").replace(/\)/, "");
                    const parts = inner.split(",").map((s) => s.trim());
                    bgColor = `rgba(${parts[0] || "255"},${parts[1] || "255"},${parts[2] || "255"},${bgAlpha / 100})`;
                  }
                  const isTorn = src.shapeType === "torn";
                  const radiusVal = isTorn ? "4px" : src.radius >= 999 ? "9999px" : `${src.radius}px`;
                  const clipPath = isTorn ? getTornClipPath(src.tornAmount) : undefined;

                  const borderStyle: React.CSSProperties = {};
                  if (src.borderWidth > 0) {
                    const from = src.borderGradientFrom;
                    const to = src.borderGradientTo;
                    if (from && to && from !== to) {
                      borderStyle.border = `${src.borderWidth}px solid transparent`;
                      borderStyle.borderImage = `linear-gradient(${src.borderRotation}deg, ${from}, ${to}) 1`;
                    } else {
                      borderStyle.border = `${src.borderWidth}px solid ${src.borderColor}`;
                    }
                  }

                  return (
                    <div
                      key={link.id}
                      className={`jelly-card flex items-center justify-center text-center px-5 cursor-pointer w-full relative overflow-hidden ${heightMap(link.height)}`}
                      style={{
                        width: link.custom ? `${link.width}%` : "100%",
                        maxWidth: "100%",
                        borderRadius: radiusVal,
                        clipPath,
                        fontSize: link.fontSize,
                        fontWeight: src.bold ? 700 : 500,
                        fontStyle: src.italic ? "italic" : "normal",
                        backdropFilter,
                        WebkitBackdropFilter: backdropFilter,
                        isolation: "isolate",
                        ...borderStyle,
                      }}
                    >
                      <span className="absolute inset-0 pointer-events-none" style={{ background: bgColor, filter: filterSelf, borderRadius: radiusVal, clipPath }} />
                      <span className="relative z-10" style={{ color: src.textColor }}>
                        {link.title}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
