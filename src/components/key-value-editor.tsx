import { X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'

interface KeyValueItem {
  key: string
  value: string
  enabled: boolean
}

interface KeyValueEditorProps {
  items: KeyValueItem[]
  onChange: (items: KeyValueItem[]) => void
  keyPlaceholder?: string
  valuePlaceholder?: string
  disabled?: boolean
}

export function KeyValueEditor({
  items,
  onChange,
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
  disabled,
}: KeyValueEditorProps) {
  const autoAdd = (index: number, newItems: KeyValueItem[]) => {
    const current = newItems[index]
    current.enabled = !!(current.key.trim() || current.value.trim())

    const last = newItems[newItems.length - 1]
    if (last.key.trim() || last.value.trim()) {
      newItems.push({ key: '', value: '', enabled: false })
    }
    for (let i = newItems.length - 2; i >= 0; i--) {
      if (!newItems[i].key.trim() && !newItems[i].value.trim()) {
        newItems.splice(i, 1)
      }
    }
    return newItems
  }

  const handleKeyChange = (index: number, value: string) => {
    const newItems = items.map((item, i) =>
      i === index ? { ...item, key: value } : { ...item },
    )
    onChange(autoAdd(index, newItems))
  }

  const handleValueChange = (index: number, value: string) => {
    const newItems = items.map((item, i) =>
      i === index ? { ...item, value: value } : { ...item },
    )
    onChange(autoAdd(index, newItems))
  }

  const handleToggle = (index: number) => {
    const newItems = items.map((item, i) =>
      i === index ? { ...item, enabled: !item.enabled } : { ...item },
    )
    onChange(newItems)
  }

  const handleRemove = (index: number) => {
    let newItems = items.filter((_, i) => i !== index)
    for (let i = newItems.length - 2; i >= 0; i--) {
      if (!newItems[i].key.trim() && !newItems[i].value.trim()) {
        newItems.splice(i, 1)
      }
    }
    if (newItems.length === 0) {
      newItems = [{ key: '', value: '', enabled: false }]
    }
    onChange(newItems)
  }

  return (
    <div className="flex-1 space-y-1.5 overflow-y-auto">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <Checkbox
            checked={item.enabled}
            onCheckedChange={() => handleToggle(index)}
            disabled={disabled}
          />
          <Input
            value={item.key}
            onChange={(e) => handleKeyChange(index, e.target.value)}
            placeholder={keyPlaceholder}
            disabled={disabled}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            className="h-7 flex-1 text-xs"
          />
          <Input
            value={item.value}
            onChange={(e) => handleValueChange(index, e.target.value)}
            placeholder={valuePlaceholder}
            disabled={disabled}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            className="h-7 flex-1 text-xs"
          />
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive size-7"
            onClick={() => handleRemove(index)}
            disabled={
              disabled ||
              items.length <= 1 ||
              (!item.key.trim() && !item.value.trim())
            }
          >
            <X className="size-3.5" />
          </Button>
        </div>
      ))}
    </div>
  )
}
