export interface ThemeConfig {
  bg: string
  textColor: string
  buttonStyle: 'rounded' | 'sharp' | 'outline'
}

export interface Microsite {
  id: string // = slug, doc ID
  userId: string
  title: string
  bio: string
  avatarUrl: string
  theme: ThemeConfig
  views: number
  createdAt: any
}

export type BlockType = 'link' | 'text' | 'image'

export interface Block {
  id: string
  type: BlockType
  order: number
  title: string
  url: string
  content: string
  isActive: boolean
  clicks: number
}

export const DEFAULT_THEME: ThemeConfig = {
  bg: '#0f172a',
  textColor: '#f8fafc',
  buttonStyle: 'rounded',
}
