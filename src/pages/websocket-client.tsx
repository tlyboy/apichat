import {
  Search,
  Plus,
  Send,
  Trash2,
  X,
  Plug,
  MessageSquare,
  Save,
  Clock,
} from 'lucide-react'
import { useWebSocketTabs } from '@/hooks/use-websocket-tabs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useTranslations } from '@/i18n'
import { useState } from 'react'

const STATUS_STYLES = {
  disconnected: {
    badge: 'bg-muted text-muted-foreground',
    dot: 'bg-muted-foreground/50',
  },
  connecting: {
    badge: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400',
    dot: 'bg-yellow-500',
  },
  connected: {
    badge: 'bg-green-500/15 text-green-700 dark:text-green-400',
    dot: 'bg-green-500',
  },
  error: {
    badge: 'bg-red-500/15 text-red-700 dark:text-red-400',
    dot: 'bg-red-500',
  },
}

export function WebSocketClientPage() {
  const t = useTranslations()
  const [activeTab, setActiveTab] = useState<
    'description' | 'messages' | 'history'
  >('description')
  const ws = useWebSocketTabs(t)

  const handleEnter = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      ws.handleSend()
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Top toolbar */}
      <div className="flex items-stretch border-b">
        <div className="flex w-64 items-center gap-2 border-r px-2 py-4">
          <div className="relative flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-2 size-3.5 -translate-y-1/2" />
            <Input
              value={ws.searchKeyword}
              onChange={(e) => ws.setSearchKeyword(e.target.value)}
              className="h-8 pr-7 pl-8 text-sm"
              placeholder={t('ws.search')}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
            {ws.searchKeyword && (
              <button
                onClick={() => ws.setSearchKeyword('')}
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 flex size-4 -translate-y-1/2 cursor-pointer items-center justify-center"
              >
                <X className="size-3" />
              </button>
            )}
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={ws.createNew}
              >
                <Plus className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('ws.newTab')}</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex flex-1 flex-col">
          <div className="flex items-center px-4 py-1.5">
            <input
              className="text-foreground placeholder:text-muted-foreground h-7 flex-1 bg-transparent text-sm font-medium outline-none"
              value={ws.name}
              onChange={(e) => ws.setName(e.target.value)}
              placeholder={t('ws.namePlaceholder')}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
            {ws.hasUnsavedChanges && (
              <span className="text-muted-foreground mr-2 text-xs">
                {t('http.unsaved')}
              </span>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="size-7"
                  onClick={ws.saveItem}
                  disabled={!ws.name.trim() && !ws.url.trim()}
                >
                  <Save className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('http.save')}</TooltipContent>
            </Tooltip>
          </div>
          <div className="flex items-center gap-2 px-4 py-1.5">
            <Badge
              variant="outline"
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 ${STATUS_STYLES[ws.status].badge}`}
            >
              <span
                className={`size-1.5 rounded-full ${STATUS_STYLES[ws.status].dot}`}
              />
              {ws.statusText}
            </Badge>

            <Input
              type="url"
              className="h-8 flex-1"
              value={ws.url}
              onChange={(e) => ws.setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') ws.handleConnect()
              }}
              placeholder={t('ws.urlPlaceholder')}
              disabled={ws.loading || ws.status === 'connected'}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />

            {ws.status === 'connected' ? (
              <Button
                size="sm"
                variant="destructive"
                onClick={ws.handleDisconnect}
                disabled={ws.loading}
              >
                {ws.connectButtonText}
                <X className="ml-1 size-4" />
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={ws.handleConnect}
                disabled={ws.loading || !ws.url.trim()}
              >
                {ws.connectButtonText}
                <Plug className="ml-1 size-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <div className="flex w-64 flex-col border-r">
          <ScrollArea className="h-0 flex-1">
            {ws.filteredList.length > 0 ? (
              ws.filteredList.map((item) => (
                <div
                  key={item.id}
                  className={`group flex w-full cursor-pointer items-center gap-2.5 overflow-hidden px-3 py-2 transition-colors ${
                    ws.isSelected(item)
                      ? 'bg-accent text-accent-foreground'
                      : 'hover:bg-accent/50'
                  }`}
                  onClick={() => ws.handleItemClick(item)}
                >
                  <Badge
                    variant="secondary"
                    className={`w-8 shrink-0 justify-center rounded px-1 py-0.5 text-[10px] font-semibold ${STATUS_STYLES.disconnected.badge}`}
                  >
                    WS
                  </Badge>
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {item.name}
                  </span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive size-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Trash2 className="size-3" />
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
                          onClick={() => ws.deleteItem(item.id)}
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
                <Search className="mb-2 size-6" />
                <div className="text-center text-sm">
                  {!ws.searchKeyword.trim()
                    ? t('ws.noTabs')
                    : t('ws.noSearchResult', { keyword: ws.searchKeyword })}
                </div>
              </div>
            )}
          </ScrollArea>

          {ws.savedList.length > 0 && (
            <div className="border-t p-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive w-full text-xs"
                  >
                    {t('ws.clearAllTabs')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3" side="top">
                  <p className="mb-2 text-sm">{t('common.confirmClearTabs')}</p>
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
                      onClick={ws.clearAll}
                    >
                      {t('common.confirm')}
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>

        {/* Right content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {ws.error && (
            <div className="bg-destructive/10 text-destructive px-4 py-2 text-sm">
              {ws.error}
            </div>
          )}

          <Tabs
            value={activeTab}
            onValueChange={(v) =>
              setActiveTab(v as 'description' | 'messages' | 'history')
            }
            className="flex flex-1 flex-col gap-0 overflow-hidden"
          >
            <TabsList
              variant="line"
              className="w-full justify-start rounded-none px-2"
            >
              <TabsTrigger value="description">
                {t('http.description')}
              </TabsTrigger>
              <TabsTrigger value="messages">{t('ws.messages')}</TabsTrigger>
              <TabsTrigger value="history">{t('ws.history')}</TabsTrigger>
            </TabsList>

            <TabsContent
              value="messages"
              className="flex flex-1 flex-col overflow-hidden"
            >
              {/* Messages area */}
              <ScrollArea className="h-0 flex-1">
                <div className="p-2">
                  {ws.messages.length > 0 ? (
                    <div className="space-y-2">
                      {ws.messages.map((message) => (
                        <div
                          key={message.id}
                          className={`rounded-md p-2 ${
                            {
                              sent: 'bg-blue-50 dark:bg-blue-900/20',
                              received: 'bg-green-50 dark:bg-green-900/20',
                              system: 'bg-muted',
                            }[message.type]
                          }`}
                        >
                          <div className="mb-1 flex items-center justify-between">
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                {
                                  sent: 'text-blue-600 dark:text-blue-400',
                                  received:
                                    'text-green-600 dark:text-green-400',
                                  system: 'text-muted-foreground',
                                }[message.type]
                              }`}
                            >
                              {message.type === 'sent'
                                ? t('ws.sent')
                                : message.type === 'received'
                                  ? t('ws.received')
                                  : t('ws.system')}
                            </Badge>
                            <span className="text-muted-foreground text-xs">
                              {ws.formatMessageTime(message.timestamp)}
                            </span>
                          </div>
                          <div className="text-sm break-all">
                            {message.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-muted-foreground flex flex-col items-center justify-center py-16">
                      <MessageSquare className="mb-2 size-10" />
                      <div className="text-center text-sm">
                        {t('ws.noMessages')}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Message input */}
              <div className="flex items-center gap-2 border-t p-2">
                <Input
                  className="h-8 flex-1"
                  value={ws.messageInput}
                  onChange={(e) => ws.setMessageInput(e.target.value)}
                  onKeyDown={handleEnter}
                  placeholder={t('ws.messagePlaceholder')}
                  disabled={ws.status !== 'connected'}
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
                {ws.messages.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground h-8 text-xs"
                    onClick={ws.clearMessages}
                  >
                    {t('ws.clearMessages')}
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={ws.handleSend}
                  disabled={
                    ws.status !== 'connected' || !ws.messageInput.trim()
                  }
                >
                  {t('ws.send')}
                  <Send className="ml-1 size-4" />
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="description" className="flex-1 overflow-auto">
              <div className="flex h-full flex-col gap-2 p-2">
                <Textarea
                  value={ws.description}
                  onChange={(e) => ws.setDescription(e.target.value)}
                  placeholder={t('http.apiDescriptionPlaceholder')}
                  className="min-h-32 flex-1 resize-none text-sm"
                  spellCheck={false}
                />
              </div>
            </TabsContent>

            <TabsContent
              value="history"
              className="flex flex-1 flex-col overflow-hidden"
            >
              <div className="flex flex-1 overflow-hidden">
                {/* Session list */}
                <ScrollArea className="w-64 border-r">
                  {ws.sessions.length > 0 ? (
                    <>
                      {ws.sessions.map((session) => (
                        <div
                          key={session.id}
                          className={`group flex cursor-pointer items-center gap-2 px-3 py-2 transition-colors ${
                            ws.selectedSessionId === session.id
                              ? 'bg-accent text-accent-foreground'
                              : 'hover:bg-accent/50'
                          }`}
                          onClick={() => ws.setSelectedSessionId(session.id)}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">
                              {session.wsName}
                            </div>
                            <div className="text-muted-foreground flex items-center gap-2 text-xs">
                              <span>
                                {new Date(session.connectedAt).toLocaleString()}
                              </span>
                              <span>·</span>
                              <span>
                                {t('ws.messageCount', {
                                  count: session.messages.length,
                                })}
                              </span>
                            </div>
                          </div>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground hover:text-destructive size-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Trash2 className="size-3" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-3" side="right">
                              <p className="mb-2 text-sm">
                                {t('common.confirmDelete')}
                              </p>
                              <div className="flex justify-end gap-2">
                                <PopoverClose asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7"
                                  >
                                    {t('common.cancel')}
                                  </Button>
                                </PopoverClose>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="h-7"
                                  onClick={() => ws.deleteSession(session.id)}
                                >
                                  {t('common.confirm')}
                                </Button>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      ))}
                      <div className="border-t p-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground hover:text-destructive w-full text-xs"
                            >
                              {t('ws.clearSessions')}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-3" side="top">
                            <p className="mb-2 text-sm">
                              {t('ws.confirmClearSessions')}
                            </p>
                            <div className="flex justify-end gap-2">
                              <PopoverClose asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7"
                                >
                                  {t('common.cancel')}
                                </Button>
                              </PopoverClose>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="h-7"
                                onClick={ws.clearSessions}
                              >
                                {t('common.confirm')}
                              </Button>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </>
                  ) : (
                    <div className="text-muted-foreground flex flex-col items-center justify-center py-16">
                      <Clock className="mb-2 size-6" />
                      <div className="text-center text-sm">
                        {t('ws.noSessions')}
                      </div>
                    </div>
                  )}
                </ScrollArea>

                {/* Session detail */}
                <ScrollArea className="flex-1">
                  {ws.selectedSession ? (
                    <div className="space-y-2 p-2">
                      {ws.selectedSession.messages.map((message, idx) => (
                        <div
                          key={idx}
                          className={`rounded-md p-2 ${
                            {
                              sent: 'bg-blue-50 dark:bg-blue-900/20',
                              received: 'bg-green-50 dark:bg-green-900/20',
                              system: 'bg-muted',
                            }[message.type]
                          }`}
                        >
                          <div className="mb-1 flex items-center justify-between">
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                {
                                  sent: 'text-blue-600 dark:text-blue-400',
                                  received:
                                    'text-green-600 dark:text-green-400',
                                  system: 'text-muted-foreground',
                                }[message.type]
                              }`}
                            >
                              {message.type === 'sent'
                                ? t('ws.sent')
                                : message.type === 'received'
                                  ? t('ws.received')
                                  : t('ws.system')}
                            </Badge>
                            <span className="text-muted-foreground text-xs">
                              {ws.formatMessageTime(message.timestamp)}
                            </span>
                          </div>
                          <div className="text-sm break-all">
                            {message.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-muted-foreground flex flex-col items-center justify-center py-16">
                      <Clock className="mb-2 size-10 opacity-30" />
                      <div className="text-sm">{t('history.selectRecord')}</div>
                    </div>
                  )}
                </ScrollArea>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
