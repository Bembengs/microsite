import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2, Link2, Type, Image as ImageIcon } from 'lucide-react'
import { Block } from '@/types/biolink'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const TYPE_ICON: Record<Block['type'], any> = {
  link: Link2,
  text: Type,
  image: ImageIcon,
}

interface Props {
  block: Block
  onChange: (id: string, patch: Partial<Block>) => void
  onDelete: (id: string) => void
}

export default function BlockItem({ block, onChange, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const Icon = TYPE_ICON[block.type]

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-lg border bg-card p-3 space-y-2"
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground shrink-0"
          aria-label="Drag untuk urutkan"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <Icon className="w-4 h-4 shrink-0 text-muted-foreground" />
        <Input
          value={block.title}
          onChange={(e) => onChange(block.id, { title: e.target.value })}
          placeholder="Judul block"
          className="h-8"
        />
        <button
          type="button"
          onClick={() => onChange(block.id, { isActive: !block.isActive })}
          className={`shrink-0 w-9 h-5 rounded-full transition-colors relative ${
            block.isActive ? 'bg-primary' : 'bg-muted'
          }`}
          aria-label="Toggle aktif"
        >
          <span
            className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
              block.isActive ? 'translate-x-4' : ''
            }`}
          />
        </button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="shrink-0 h-8 w-8 text-destructive"
          onClick={() => onDelete(block.id)}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {block.type === 'link' && (
        <Input
          value={block.url}
          onChange={(e) => onChange(block.id, { url: e.target.value })}
          placeholder="https://..."
          className="h-8 ml-8"
        />
      )}

      {block.type === 'text' && (
        <Input
          value={block.content}
          onChange={(e) => onChange(block.id, { content: e.target.value })}
          placeholder="Isi teks"
          className="h-8 ml-8"
        />
      )}
    </div>
  )
}
