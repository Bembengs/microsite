import { useEffect, useState, useRef } from "react";
import { BrowserRouter, Routes, Route, useParams } from "react-router-dom";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";

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

export type BgConfig = {
  type: "color" | "gradient" | "image" | "video" | "transparent";
  value: string;
  gradientFrom?: string;
  gradientTo?: string;
  hue: number;
  alpha: number;
  blur: number;
  backdrop: number;
  saturate: number;
  brightness: number;
  refraction: number;
  opacity: number;
  overlay: string;
};

export type ButtonDefaults = {
  bgColor: string;
  textColor: string;
  alpha: number;
  blur: number;
  backdrop: number;
  saturate: number;
  brightness: number;
  refraction: number;
  shapeType: "pill" | "torn";
  tornAmount: number;
  radius: number;
  bold: boolean;
  italic: boolean;
  borderWidth: number;
  borderColor: string;
  borderGradientFrom: string;
  borderGradientTo: string;
  borderRotation: number;
};

export type LinkItem = {
  id: string;
  title: string;
  url: string;
  bgColor: string;
  textColor: string;
  width: number;
  fontSize: number;
  height: "sm" | "md" | "lg" | "xl";
  radius: number;
  type?: "link";
  custom: boolean;
  shapeType: "pill" | "torn";
  tornAmount: number;
  bold?: boolean;
  italic?: boolean;
  alpha: number;
  blur: number;
  backdrop: number;
  saturate: number;
  brightness: number;
  refraction: number;
  borderWidth: number;
  borderColor: string;
  borderGradientFrom: string;
  borderGradientTo: string;
  borderRotation: number;
};

export type DividerConfig = {
  enabled: boolean;
  text: string;
  lineColor: string;
  pillColor: string;
  textColor: string;
  height: number;
  showDot: boolean;
};
export type DividerBlock = { id: string; type: "divider"; divider: DividerConfig };
export type ContentBlock = LinkItem | DividerBlock;

export type MicrositeConfig = {
  slug: string;
  logoUrl: string;
  logoShape: "circle" | "square" | "rounded" | "hexagon" | "blob" | "jelly";
  logoRadius: number;
  logoSize: number;
  logoBorderWidth: number;
  logoBorderColor: string;
  logoOffsetX: number;
  logoOffsetY: number;
  logoZoom: number;
  logoAnimation: "none" | "float" | "pulse" | "spin" | "bounce" | "jelly" | "wiggle" | "glow";
  logoAnimationSpeed: number;
  logoAnimationOnHover: boolean;
  title: string;
  titleColor: string;
  titleSize: number;
  desc: string;
  descColor: string;
  descSize: number;
  outerBg: BgConfig;
  innerBg: BgConfig;
  phoneFrame: { thickness: number; radius: number; color: string; shadow: number };
  buttonDefaults: ButtonDefaults;
  links: ContentBlock[];
  gap: number;
  jelly: { enabled: boolean; intensity: number; glassBlur: number; float: boolean; wobbleOnHover: boolean };
  divider: DividerConfig;
  scrollHint: { enabled: boolean; text: string; bgColor: string; textColor: string; iconColor: string };
};

function hexToRgba(hex: string, alphaPercent: number): string {
  const a = Math.max(0, Math.min(100, alphaPercent)) / 100;
  if (!hex.startsWith("#")) {
    if (hex.startsWith("rgba")) return hex.replace(/[\d.]+\)$/, `${a})`);
    if (hex.startsWith("rgb")) return hex.replace(")", `, ${a})`).replace("rgb", "rgba");
    return hex;
  }
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(full.substring(0, 2), 16);
  const g = parseInt(full.substring(2, 4), 16);
  const b = parseInt(full.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function getTornClipPath(amount: number): string {
  const j = Math.max(0, Math.min(100, amount)) / 100;
  const jitter = j * 8;
  return `polygon(${jitter}% ${jitter}%, ${22 + jitter}% ${0}%, ${38 - jitter}% ${jitter * 1.2}%, ${58 + jitter * 0.5}% ${0}%, ${78 - jitter}% ${jitter}%, 100% ${2 + jitter}%, 100% ${78 - jitter}%, ${82 + jitter}% ${100 - jitter}%, ${58 - jitter}% ${100}%, ${36 + jitter}% ${98 - jitter}%, ${18 - jitter}% ${100}%, 0% ${88 - jitter}%)`;
}

export function isVideoUrl(url: string): boolean {
  if (!url) return false;
  const u = url.split("?")[0].toLowerCase();
  return u.endsWith(".mp4") || u.endsWith(".webm") || u.endsWith(".mov") || u.endsWith(".m4v") || u.endsWith(".ogg");
}

function getLogoStyle(shape: MicrositeConfig["logoShape"], radius: number): React.CSSProperties {
  if (shape === "circle") return { borderRadius: "50%" };
  if (shape === "square") return { borderRadius: "8px" };
  if (shape === "rounded") return { borderRadius: `${radius}px` };
  if (shape === "hexagon") return { clipPath: "polygon(25% 0%,75% 0%,100% 50%,75% 100%,25% 100%,0% 50%)" };
  if (shape === "blob" || shape === "jelly") return { borderRadius: "42% 58% 62% 38% / 42% 38% 62% 58%" };
  return { borderRadius: `${radius}px` };
}

export function getBgLayerStyle(bg: BgConfig): React.CSSProperties {
  const alpha = bg.alpha ?? bg.opacity ?? 100;
  const backdropFilter = `blur(${bg.backdrop}px) saturate(${bg.saturate}%) brightness(${bg.brightness}%) contrast(${100 + bg.refraction * 2}%)`;
  const filterSelf = `blur(${bg.blur}px) hue-rotate(${bg.hue}deg) saturate(${bg.saturate}%) brightness(${bg.brightness}%)`;
  if (bg.type === "image") {
    return { backgroundImage: `url(${bg.value})`, backgroundSize: "cover", backgroundPosition: "center", backdropFilter, WebkitBackdropFilter: backdropFilter, filter: filterSelf, opacity: alpha / 100 } as React.CSSProperties;
  }
  if (bg.type === "video") {
    return { backdropFilter, WebkitBackdropFilter: backdropFilter, filter: filterSelf, opacity: alpha / 100 } as React.CSSProperties;
  }
  let background: string | undefined;
  if (bg.type === "color") background = hexToRgba(bg.value, alpha);
  else if (bg.type === "gradient") {
    const from = hexToRgba(bg.gradientFrom || "#a8edea", alpha);
    const to = hexToRgba(bg.gradientTo || "#fed6e3", alpha);
    background = `linear-gradient(135deg, ${from}, ${to})`;
  } else if (bg.type === "transparent") background = alpha <= 2 ? "transparent" : `rgba(255,255,255,${alpha / 100})`;
  if (bg.type === "transparent" && alpha <= 2) return { background: "transparent", backdropFilter, WebkitBackdropFilter: backdropFilter, filter: filterSelf };
  return { background, backdropFilter, WebkitBackdropFilter: backdropFilter, filter: filterSelf };
}

function heightMap(h: LinkItem["height"]) {
  if (h === "sm") return "py-2.5 text-[13px]";
  if (h === "md") return "py-3 text-[14px]";
  if (h === "lg") return "py-3.5 text-[15px]";
  if (h === "xl") return "py-4 text-[16px]";
  return "py-3.5";
}
function isDivider(b: ContentBlock): b is DividerBlock { return (b as DividerBlock).type === "divider"; }
function getButtonGlassParts(src: ButtonDefaults | LinkItem) {
  const alpha = src.alpha;
  const raw = src.bgColor;
  let bgColor: string;
  if (raw.startsWith("#")) { const r = parseInt(raw.slice(1, 3), 16); const g = parseInt(raw.slice(3, 5), 16); const b = parseInt(raw.slice(5, 7), 16); bgColor = `rgba(${r},${g},${b},${alpha / 100})`; }
  else if (raw.startsWith("rgba") || raw.startsWith("rgb")) { const inner = raw.replace(/rgba?\(/, "").replace(/\)/, ""); const parts = inner.split(",").map((s) => s.trim()); bgColor = `rgba(${parts[0] || "255"},${parts[1] || "255"},${parts[2] || "255"},${alpha / 100})`; }
  else bgColor = raw;
  const backdropFilter = `blur(${src.backdrop}px) saturate(${src.saturate}%) brightness(${src.brightness}%) contrast(${100 + src.refraction * 2}%)`;
  const filterSelf = `blur(${src.blur}px) saturate(${src.saturate}%) brightness(${src.brightness}%)`;
  return { bgColor, backdropFilter, filterSelf };
}
function JellyGlobalStyle() { return <style>{`
@keyframes jellyWobbleSubtle{0%{transform:translateY(0) scale3d(1,1,1)}50%{transform:translateY(-1px) scale3d(0.98,1.02,1)}100%{transform:translateY(-2px) scale3d(1,1,1)}}
.jelly-card{border:1.2px solid rgba(255,255,255,.65);will-change:transform;transform-origin:center bottom;transition:transform 0.25s ease, box-shadow 0.25s ease}
.jelly-card:hover{transform:translateY(-2px);animation:jellyWobbleSubtle 0.5s ease-out both}
.glass-refract{position:relative;overflow:hidden}
.glass-refract::after{content:'';position:absolute;inset:0;background:linear-gradient(105deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 40%);pointer-events:none}
.scrollbar-none::-webkit-scrollbar{display:none}
.scrollbar-none{-ms-overflow-style:none;scrollbar-width:none}
/* Logo animations */
@keyframes logoFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@keyframes logoPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}
@keyframes logoSpin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
@keyframes logoBounce{0%,100%{transform:translateY(0) scale(1,1)}25%{transform:translateY(-10px) scale(0.95,1.05)}50%{transform:translateY(0) scale(1.05,0.95)}75%{transform:translateY(-4px) scale(1,1)}}
@keyframes logoJelly{0%{transform:scale3d(1,1,1)}30%{transform:scale3d(1.15,0.85,1)}40%{transform:scale3d(0.9,1.1,1)}50%{transform:scale3d(1.05,0.95,1)}65%{transform:scale3d(0.98,1.02,1)}75%{transform:scale3d(1.02,0.98,1)}100%{transform:scale3d(1,1,1)}}
@keyframes logoWiggle{0%,100%{transform:rotate(0)}25%{transform:rotate(-6deg)}75%{transform:rotate(6deg)}}
@keyframes logoGlow{0%,100%{box-shadow:0 0 12px rgba(255,255,255,0.6), 0 0 24px rgba(255,255,255,0.3)}50%{box-shadow:0 0 20px rgba(255,255,255,0.9), 0 0 36px rgba(255,255,255,0.5)}}
.logo-anim-float{animation:logoFloat var(--logo-speed, 3s) ease-in-out infinite}
.logo-anim-pulse{animation:logoPulse var(--logo-speed, 2s) ease-in-out infinite}
.logo-anim-spin{animation:logoSpin var(--logo-speed, 6s) linear infinite}
.logo-anim-bounce{animation:logoBounce var(--logo-speed, 2s) ease infinite}
.logo-anim-jelly{animation:logoJelly var(--logo-speed, 1.2s) ease infinite}
.logo-anim-wiggle{animation:logoWiggle var(--logo-speed, 1.5s) ease-in-out infinite}
.logo-anim-glow{animation:logoGlow var(--logo-speed, 2.5s) ease-in-out infinite}
.logo-anim-hover:hover{animation-play-state:paused}
.logo-anim-on-hover{animation:none}
.logo-anim-on-hover:hover{animation:var(--logo-anim-name) var(--logo-speed) ease-in-out infinite}
`}</style>; }

function JellyButton({ link, defaults }: { link: LinkItem; defaults: ButtonDefaults }) {
  const src = link.custom ? link : defaults;
  const { bgColor, backdropFilter, filterSelf } = getButtonGlassParts(src as ButtonDefaults | LinkItem);
  const widthStyle = link.custom ? { width: `${link.width}%` } : { width: "100%" as const, maxWidth: "100%" as const };
  const isTorn = src.shapeType === "torn";
  const radiusValue = isTorn ? "4px" : src.radius >= 999 ? "9999px" : `${src.radius}px`;
  const clip = isTorn ? getTornClipPath(src.tornAmount) : undefined;
  const borderStyle: React.CSSProperties = {};
  if (src.borderWidth > 0) {
    const from = src.borderGradientFrom;
    const to = src.borderGradientTo;
    if (from && to && from !== to) { borderStyle.border = `${src.borderWidth}px solid transparent`; borderStyle.borderImage = `linear-gradient(${src.borderRotation}deg, ${from}, ${to}) 1`; }
    else borderStyle.border = `${src.borderWidth}px solid ${src.borderColor}`;
  }
  return (
    <a href={link.url} target="_blank" rel="noreferrer" className={`jelly-card glass-refract flex items-center justify-center text-center px-5 cursor-pointer relative ${heightMap(link.height)}`} style={{ ...widthStyle, fontSize: link.fontSize, boxShadow: `0 8px 24px ${bgColor}, inset 0 1px 0 rgba(255,255,255,0.8)`, backdropFilter, WebkitBackdropFilter: backdropFilter, borderRadius: radiusValue, clipPath: clip, ...borderStyle, isolation: "isolate" }}>
      <span className="absolute inset-0 pointer-events-none" style={{ background: bgColor, filter: filterSelf, borderRadius: radiusValue, clipPath: clip }} />
      <span className="relative z-10" style={{ color: src.textColor, fontWeight: src.bold ? 700 : 500, fontStyle: src.italic ? "italic" : "normal" }}>{link.title}</span>
    </a>
  );
}

function MicrositeView({ config }: { config: MicrositeConfig }) {
  const outerStyle = getBgLayerStyle(config.outerBg);
  const innerStyle = getBgLayerStyle(config.innerBg);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isVideoBg = (bg: BgConfig) => bg.type === "video" || isVideoUrl(bg.value);
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 md:p-8 relative overflow-hidden bg-transparent">
      <JellyGlobalStyle />
      {isVideoBg(config.outerBg) ? <video src={config.outerBg.value} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover pointer-events-none" style={outerStyle} /> : <div className="absolute inset-0 pointer-events-none" style={outerStyle} />}
      <div className="relative w-full max-w-[390px] max-h-[820px] h-[78vh] md:h-[800px] overflow-hidden flex flex-col" style={{ border: `${config.phoneFrame.thickness}px solid ${config.phoneFrame.color}`, borderRadius: `${config.phoneFrame.radius}px`, boxShadow: `0 ${config.phoneFrame.shadow}px ${config.phoneFrame.shadow * 2}px rgba(0,0,0,0.18)`, background: "transparent" }}>
        {isVideoBg(config.innerBg) ? <video src={config.innerBg.value} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover pointer-events-none" style={{ ...innerStyle, borderRadius: `${Math.max(0, config.phoneFrame.radius - config.phoneFrame.thickness)}px` }} /> : <div className="absolute inset-0 pointer-events-none" style={{ ...innerStyle, borderRadius: `${Math.max(0, config.phoneFrame.radius - config.phoneFrame.thickness)}px` }} />}
        <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-none relative z-10" style={{ borderRadius: `${Math.max(0, config.phoneFrame.radius - config.phoneFrame.thickness)}px` }}>
                    <div className="relative z-10 px-6 pt-12 pb-10 flex flex-col items-center">
            <div className="relative logo-wrapper" style={{ width: config.logoSize, height: config.logoSize, ...(config.logoAnimation !== "none" ? ({ ["--logo-speed" as any]: `${config.logoAnimationSpeed}s`, ["--logo-anim-name" as any]: `logo${config.logoAnimation.charAt(0).toUpperCase() + config.logoAnimation.slice(1)}` } as React.CSSProperties) : {}) }} >
              <div className={`w-full h-full overflow-hidden bg-white ${config.logoAnimation !== "none" ? (config.logoAnimationOnHover ? `logo-anim-on-hover` : `logo-anim-${config.logoAnimation}`) : ""}`} style={{ ...getLogoStyle(config.logoShape, config.logoRadius), border: `${config.logoBorderWidth}px solid ${config.logoBorderColor}`, animationDuration: `${config.logoAnimationSpeed}s` } as React.CSSProperties}>
                {isVideoUrl(config.logoUrl) ? <video src={config.logoUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" style={{ transform: `translate(${config.logoOffsetX}%, ${config.logoOffsetY}%) scale(${config.logoZoom / 100})` }} /> : <img src={config.logoUrl} alt="logo" className="w-full h-full object-cover" style={{ transform: `translate(${config.logoOffsetX}%, ${config.logoOffsetY}%) scale(${config.logoZoom / 100})` }} />}
              </div>
            </div>
            <h1 className="mt-5 font-bold text-center leading-tight" style={{ color: config.titleColor, fontSize: config.titleSize }}>{config.title}</h1>
            <p className="mt-1.5 text-center px-2 leading-snug" style={{ color: config.descColor, fontSize: config.descSize }}>{config.desc}</p>
            <div className="w-full mt-7 flex flex-col items-center" style={{ gap: config.gap }}>
              {config.links.map((block) => {
                if (isDivider(block)) { const d = block.divider; if (!d.enabled) return null; return <div key={block.id} className="w-full flex items-center justify-center gap-3 py-3"><div className="flex-1 h-[2px] rounded-full" style={{ background: d.lineColor, height: `${d.height}px` }} /><div className="px-2.5 py-1 rounded-full text-[10px] font-bold border bg-white" style={{ background: d.pillColor, color: d.textColor }}>{d.text || "•"}</div><div className="flex-1 h-[2px] rounded-full" style={{ background: d.lineColor, height: `${d.height}px` }} /></div>; }
                return <JellyButton key={block.id} link={block as LinkItem} defaults={config.buttonDefaults} />;
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// FIX ISSUE 1: Jangan render DEFAULT_CONFIG dulu. Mulai dari null + loading spinner.
function useMicrosite(slug: string) {
  const [config, setConfig] = useState<MicrositeConfig | null>(null);
  const [isReady, setIsReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setIsReady(false);
      try {
        const ref = doc(db, "microsites", slug || "main");
        const snap = await getDoc(ref);
        if (snap.exists() && !cancelled) {
          const data = snap.data() as MicrositeConfig;
          const migratedOuter = { ...DEFAULT_CONFIG.outerBg, ...(data.outerBg || {}) } as BgConfig;
          const migratedInner = { ...DEFAULT_CONFIG.innerBg, ...(data.innerBg || {}) } as BgConfig;
          const migratedLinks = (data.links || []).map((l) => {
            if ((l as DividerBlock).type === "divider") return l;
            return { ...DEFAULT_CONFIG.links[0], ...(l as LinkItem), bgColor: (l as LinkItem).bgColor ?? (DEFAULT_CONFIG.links[0] as LinkItem).bgColor, alpha: (l as LinkItem).alpha ?? 85, blur: (l as LinkItem).blur ?? 0, backdrop: (l as LinkItem).backdrop ?? 12, saturate: (l as LinkItem).saturate ?? 150, brightness: (l as LinkItem).brightness ?? 105, refraction: (l as LinkItem).refraction ?? 2, borderWidth: (l as LinkItem).borderWidth ?? 0, borderColor: (l as LinkItem).borderColor ?? "#ffffff", borderGradientFrom: (l as LinkItem).borderGradientFrom ?? "#ffffff", borderGradientTo: (l as LinkItem).borderGradientTo ?? "#ffffff", borderRotation: (l as LinkItem).borderRotation ?? 135 } as LinkItem;
          });
          const merged = { ...DEFAULT_CONFIG, ...data, outerBg: migratedOuter, innerBg: migratedInner, links: migratedLinks.length ? migratedLinks : DEFAULT_CONFIG.links, buttonDefaults: { ...DEFAULT_CONFIG.buttonDefaults, ...(data.buttonDefaults || {}) }, slug } as MicrositeConfig;
          setConfig(merged);
        } else if (!cancelled) {
          setConfig({ ...DEFAULT_CONFIG, slug } as MicrositeConfig);
        }
      } catch {
        if (!cancelled) setConfig({ ...DEFAULT_CONFIG, slug } as MicrositeConfig);
      } finally {
        if (!cancelled) setIsReady(true);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, [slug]);
  return { config, isReady };
}

function PublicPage() {
  const { slug } = useParams();
  const { config, isReady } = useMicrosite(slug || "main");
  if (!isReady || !config) {
    return <div className="min-h-screen w-full flex items-center justify-center bg-[#f6f5f2]"><div className="w-7 h-7 border-2 border-black/20 border-t-black rounded-full animate-spin" /></div>;
  }
  return <MicrositeView config={config} />;
}

const DEFAULT_OUTER: BgConfig = { type: "gradient", value: "linear-gradient(135deg,#a8edea 0%,#fed6e3 100%)", gradientFrom: "#a8edea", gradientTo: "#fed6e3", hue: 0, alpha: 100, blur: 0, backdrop: 0, saturate: 140, brightness: 100, refraction: 0, opacity: 100, overlay: "rgba(255,255,255,0.15)" };
const DEFAULT_INNER: BgConfig = { type: "color", value: "#ffffff", gradientFrom: "#ffffff", gradientTo: "#f0f0f0", hue: 0, alpha: 92, blur: 0, backdrop: 12, saturate: 140, brightness: 105, refraction: 0, opacity: 92, overlay: "transparent" };
const DEFAULT_BUTTON_DEFAULTS: ButtonDefaults = { bgColor: "rgba(255,255,255,0.75)", textColor: "#111827", alpha: 78, blur: 0, backdrop: 14, saturate: 160, brightness: 108, refraction: 4, shapeType: "pill", tornAmount: 22, radius: 22, bold: true, italic: false, borderWidth: 1, borderColor: "rgba(255,255,255,0.7)", borderGradientFrom: "#ffffff", borderGradientTo: "#ffffff", borderRotation: 135 };
const DEFAULT_DIVIDER: DividerConfig = { enabled: true, text: "", lineColor: "#ffffff", pillColor: "#ffffff", textColor: "#6b7280", height: 1.8, showDot: true };

export const DEFAULT_CONFIG: MicrositeConfig = {
  slug: "main", logoUrl: "https://i.imgur.com/8Km9tLL.png", logoShape: "jelly", logoRadius: 32, logoSize: 96, logoBorderWidth: 3, logoBorderColor: "#ffffff", logoOffsetX: 0, logoOffsetY: 0, logoZoom: 100, logoAnimation: "float", logoAnimationSpeed: 3, logoAnimationOnHover: false, title: "Bembengs Store", titleColor: "#1a1a1a", titleSize: 22, desc: "Thrift • Curated • Jelly Edition", descColor: "#6b7280", descSize: 14, outerBg: DEFAULT_OUTER, innerBg: DEFAULT_INNER, phoneFrame: { thickness: 8, radius: 42, color: "#ffffff", shadow: 24 }, buttonDefaults: DEFAULT_BUTTON_DEFAULTS, gap: 14, jelly: { enabled: true, intensity: 1, glassBlur: 18, float: true, wobbleOnHover: true }, divider: DEFAULT_DIVIDER, scrollHint: { enabled: true, text: "Geser", bgColor: "rgba(34,197,94,0.88)", textColor: "#ffffff", iconColor: "#ffffff" },
  links: [
    { id: "1", title: "Shopee Bembengs", url: "https://shopee.co.id", bgColor: "rgba(255,255,255,0.85)", textColor: "#111827", width: 100, fontSize: 15, height: "lg", radius: 20, type: "link", custom: false, shapeType: "pill", tornAmount: 22, bold: true, alpha: 85, blur: 0, backdrop: 12, saturate: 150, brightness: 105, refraction: 2, borderWidth: 1, borderColor: "rgba(255,255,255,0.8)", borderGradientFrom: "#ffffff", borderGradientTo: "#ffffff", borderRotation: 135 } as LinkItem,
    { id: "2", title: "Instagram", url: "https://instagram.com", bgColor: "rgba(255,255,255,0.65)", textColor: "#111827", width: 100, fontSize: 15, height: "lg", radius: 20, type: "link", custom: false, shapeType: "pill", tornAmount: 22, alpha: 72, blur: 0, backdrop: 16, saturate: 160, brightness: 108, refraction: 4, borderWidth: 1, borderColor: "rgba(255,255,255,0.7)", borderGradientFrom: "#ffffff", borderGradientTo: "#ffffff", borderRotation: 135 } as LinkItem,
    { id: "div-1", type: "divider", divider: { ...DEFAULT_DIVIDER, text: "" } } as DividerBlock,
    { id: "3", title: "WhatsApp Order", url: "https://wa.me/628000000", bgColor: "rgba(17,24,39,0.85)", textColor: "#ffffff", width: 100, fontSize: 15, height: "lg", radius: 20, type: "link", custom: false, shapeType: "pill", tornAmount: 22, bold: true, alpha: 85, blur: 0, backdrop: 10, saturate: 130, brightness: 105, refraction: 0, borderWidth: 0, borderColor: "#ffffff", borderGradientFrom: "#ffffff", borderGradientTo: "#ffffff", borderRotation: 135 } as LinkItem,
  ],
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PublicPage />} />
        <Route path="/:slug" element={<PublicPage />} />
        <Route path="/admin" element={<AdminLoader />} />
        <Route path="/admin/:slug" element={<AdminLoader />} />
      </Routes>
    </BrowserRouter>
  );
}
function AdminLoader() {
  const [Comp, setComp] = useState<React.ComponentType | null>(null);
  useEffect(() => { import("./Admin").then((m) => setComp(() => m.default)); }, []);
  if (!Comp) return <div className="p-10">Loading admin...</div>;
  return <Comp />;
}
