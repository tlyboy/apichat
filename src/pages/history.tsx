import { useState, useEffect } from 'react'
import { Search, Trash2, X, Clock, CheckCircle, XCircle } from 'lucide-react'
import {
  getHistoryRecords,
  deleteHistoryRecord,
  clearHistoryRecords,
  type HistoryRecord,
} from '@/utils/history'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { CodeEditor } from '@/components/code-editor'
import { useTranslations } from '@/i18n'
import { METHODS, METHOD_COLORS, type HttpMethod } from '@/types'

function useHistoryRecords() {
  const [records, setRecords] = useState<HistoryRecord[]>([])

  const refresh = () => {
    getHistoryRecords().then(setRecords).catch(console.error)
  }

  useEffect(() => {
    refresh()
    const handler = () => refresh()
    window.addEventListener('apichat-history-updated', handler)
    const visHandler = () => refresh()
    window.addEventListener('app-focus', visHandler)
    return () => {
      window.removeEventListener('apichat-history-updated', handler)
      window.removeEventListener('app-focus', visHandler)
    }
  }, [])

  return records
}

function generateTitle(url: string) {
  try {
    const urlObj = new URL(url)
    return urlObj.pathname.split('/').filter(Boolean).pop() || urlObj.hostname
  } catch {
    return url.split('/').pop() || 'api'
  }
}

function detectLanguage(text: string) {
  if (!text) return 'plaintext'
  try {
    JSON.parse(text)
    return 'json'
  } catch {
    if (text.trim().startsWith('<?xml')) return 'xml'
    if (text.trim().startsWith('<')) return 'html'
    return 'plaintext'
  }
}

export function HistoryPage() {
  const t = useTranslations()
  const records = useHistoryRecords()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [filterMethod, setFilterMethod] = useState<'ALL' | HttpMethod>('ALL')

  const filteredRecords = (() => {
    let filtered = records
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase()
      filtered = filtered.filter(
        (r) =>
          r.url.toLowerCase().includes(keyword) ||
          r.method.toLowerCase().includes(keyword),
      )
    }
    if (filterMethod !== 'ALL') {
      filtered = filtered.filter((r) => r.method === filterMethod)
    }
    return filtered
  })()

  const selectedRecord = records.find((r) => r.id === selectedId)

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp
    if (diff < 60000) return t('history.justNow')
    if (diff < 3600000)
      return t('history.minutesAgo', { count: Math.floor(diff / 60000) })
    if (diff < 86400000)
      return t('history.hoursAgo', { count: Math.floor(diff / 3600000) })
    return new Date(timestamp).toLocaleDateString()
  }

  return (
    <div className="flex h-full flex-col">
      {/* Top toolbar */}
      <div className="flex items-center border-b">
        <div className="flex w-64 items-center gap-2 border-r px-2 py-4">
          <div className="relative flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-2 size-3.5 -translate-y-1/2" />
            <Input
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="h-8 pr-7 pl-8 text-sm"
              placeholder={t('history.search')}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
            {searchKeyword && (
              <button
                onClick={() => setSearchKeyword('')}
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 flex size-4 -translate-y-1/2 cursor-pointer items-center justify-center"
              >
                <X className="size-3" />
              </button>
            )}
          </div>
        </div>

        <div className="flex h-full flex-1 items-center justify-between px-4">
          <div className="text-muted-foreground text-sm font-medium">
            {selectedRecord
              ? `${selectedRecord.method} ${selectedRecord.url}`
              : t('history.title')}
          </div>
          {selectedRecord && (
            <Badge
              variant="outline"
              className={`flex items-center gap-1.5 rounded-md px-2 py-0.5 ${
                selectedRecord.status === 'success'
                  ? 'bg-green-500/15 text-green-700 dark:text-green-400'
                  : 'bg-red-500/15 text-red-700 dark:text-red-400'
              }`}
            >
              {selectedRecord.status === 'success' ? (
                <CheckCircle className="size-3" />
              ) : (
                <XCircle className="size-3" />
              )}
              {selectedRecord.status === 'success'
                ? t('history.success')
                : t('history.error')}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <div className="flex w-64 flex-col border-r">
          <div className="p-2">
            <Select
              value={filterMethod}
              onValueChange={(v) => setFilterMethod(v as 'ALL' | HttpMethod)}
            >
              <SelectTrigger size="sm" className="mb-2 w-full text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t('history.all')}</SelectItem>
                {METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-muted-foreground text-xs">
              {t('history.records', { count: filteredRecords.length })}
            </div>
          </div>

          <ScrollArea className="h-0 flex-1">
            {filteredRecords.length > 0 ? (
              filteredRecords.map((record) => (
                <div
                  key={record.id}
                  className={`group flex cursor-pointer items-center gap-2 px-2 py-3 transition-colors ${
                    selectedId === record.id
                      ? 'bg-accent text-accent-foreground'
                      : 'hover:bg-accent/50'
                  }`}
                  onClick={() => setSelectedId(record.id)}
                >
                  <Badge
                    variant="secondary"
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${METHOD_COLORS[record.method]}`}
                  >
                    {record.method}
                  </Badge>
                  <div className="flex-1 overflow-hidden">
                    <div className="truncate text-sm font-medium">
                      {record.name || generateTitle(record.url)}
                    </div>
                    <div className="text-muted-foreground flex items-center gap-1 text-xs">
                      {record.status === 'error' && (
                        <XCircle className="size-3 text-red-500" />
                      )}
                      <span className="truncate">
                        {formatTime(record.timestamp)}
                      </span>
                    </div>
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive size-7 opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-3" side="right">
                      <p className="mb-2 text-sm">
                        {t('common.confirmDelete')}
                      </p>
                      <div className="flex justify-end gap-2">
                        <PopoverClose asChild>
                          <Button variant="outline" size="sm" className="h-7">
                            {t('common.cancel')}
                          </Button>
                        </PopoverClose>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-7"
                          onClick={() => {
                            deleteHistoryRecord(record.id)
                            if (selectedId === record.id) setSelectedId(null)
                          }}
                        >
                          {t('common.confirm')}
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              ))
            ) : (
              <div className="text-muted-foreground flex flex-col items-center justify-center py-8">
                <Clock className="mb-2 size-6" />
                <div className="text-center text-sm">
                  {searchKeyword
                    ? t('history.noSearchResult', { keyword: searchKeyword })
                    : filterMethod !== 'ALL'
                      ? t('history.noMethodResult', { method: filterMethod })
                      : t('history.noRecords')}
                </div>
              </div>
            )}
          </ScrollArea>

          {records.length > 0 && (
            <div className="border-t p-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive w-full text-xs"
                  >
                    {t('history.clearAll')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3" side="top">
                  <p className="mb-2 text-sm">
                    {t('history.confirmClear')}
                  </p>
                  <div className="flex justify-end gap-2">
                    <PopoverClose asChild>
                      <Button variant="outline" size="sm" className="h-7">
                        {t('common.cancel')}
                      </Button>
                    </PopoverClose>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-7"
                      onClick={() => {
                        clearHistoryRecords()
                        setSelectedId(null)
                      }}
                    >
                      {t('common.confirm')}
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>

        {/* Right content - response viewer */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {selectedRecord ? (
            <div className="flex h-full flex-col gap-2 p-2">
              <div className="text-muted-foreground text-sm font-medium">
                {t('history.response')}
              </div>
              <CodeEditor
                language={detectLanguage(selectedRecord.response || '')}
                value={selectedRecord.response || ''}
                readonly
                className="flex-1"
              />
            </div>
          ) : (
            <div className="text-muted-foreground flex h-full flex-col items-center justify-center">
              <Clock className="mb-2 size-10 opacity-30" />
              <div className="text-sm">{t('history.selectRecord')}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
