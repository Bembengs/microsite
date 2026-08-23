import { Block, Microsite } from '@/types/biolink'

function buttonRadiusClass(style: Microsite['theme']['buttonStyle']) {
  if (style === 'sharp') return 'rounded-none'
  if (style === 'outline') return 'rounded-md border-2 bg-transparent'
  return 'rounded-full'
}

interface Props {
  microsite: Pick<Microsite, 'title' | 'bio' | 'avatarUrl' | 'theme'>
  blocks: Block[]
}

export default function PreviewFrame({ microsite, blocks }: Props) {
  const { theme } = microsite
  const activeBlocks = blocks
    .filter((b) => b.isActive)
    .sort((a, b) => a.order - b.order)

  return (
    <div className="mx-auto w-[300px] rounded-[2rem] border-8 border-neutral-900 bg-neutral-900 shadow-xl">
      <div
        className="h-[560px] w-full overflow-y-auto rounded-[1.4rem] px-5 py-8 flex flex-col items-center"
        style={{ backgroundColor: theme.bg, color: theme.textColor }}
      >
        <div className="w-16 h-16 rounded-full bg-black/20 overflow-hidden mb-3 shrink-0">
          {microsite.avatarUrl && (
            <img
              src={microsite.avatarUrl}
              alt={microsite.title}
              className="w-full h-full object-cover"
            />
          )}
        </div>
        <h2 className="font-semibold text-center">{microsite.title || 'Judul'}</h2>
        {microsite.bio && (
          <p className="text-xs text-center opacity-80 mt-1">{microsite.bio}</p>
        )}

        <div className="w-full space-y-3 mt-6">
          {activeBlocks.length === 0 && (
            <p className="text-xs text-center opacity-60">Belum ada block aktif</p>
          )}
          {activeBlocks.map((b) => {
            if (b.type === 'text') {
              return (
                <p key={b.id} className="text-sm text-center opacity-90">
                  {b.content}
                </p>
              )
            }
            if (b.type === 'image') {
              return (
                <div
                  key={b.id}
                  className={`w-full aspect-video overflow-hidden ${buttonRadiusClass(
                    theme.buttonStyle
                  )} bg-black/10`}
                >
                  {b.url && (
                    <img
                      src={b.url}
                      alt={b.title}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              )
            }
            // link
            return (
              <div
                key={b.id}
                className={`w-full py-2.5 text-center text-sm font-medium ${buttonRadiusClass(
                  theme.buttonStyle
                )}`}
                style={{
                  backgroundColor:
                    theme.buttonStyle === 'outline' ? 'transparent' : theme.textColor + '22',
                  borderColor: theme.textColor,
                }}
              >
                {b.title || 'Link'}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
