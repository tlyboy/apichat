import {
  Search,
  Plus,
  Send,
  Clock,
  Trash2,
  X,
  Copy,
  Save,
  Import,
  Download,
} from 'lucide-react'
import { useHttpClient } from '@/hooks/use-http-client'
import { KeyValueEditor } from '@/components/key-value-editor'
import { CodeEditor } from '@/components/code-editor'
import { openapi as openapiStore } from '@/utils/store'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTranslations } from '@/i18n'
import { Textarea } from '@/components/ui/textarea'
import { METHODS, METHOD_COLORS, type HttpMethod, type BodyType, type FormItem, type ActiveTab } from '@/types'

export function HttpClient() {
  const t = useTranslations()
  const {
    url,
    setUrl,
    method,
    setMethod,
    params,
    setParams,
    headers,
    setHeaders,
    bodyType,
    setBodyType,
    jsonBody,
    setJsonBody,
    textBody,
    setTextBody,
    formBody,
    setFormBody,
    response,
    loading,
    error,
    apis,
    searchKeyword,
    setSearchKeyword,
    filterMethod,
    setFilterMethod,
    activeTab,
    setActiveTab,
    copySuccess,
    filteredList,
    responseLanguage,
    apiName,
    setApiName,
    apiDescription,
    setApiDescription,
    hasUnsavedChanges,
    isApiSelected,
    handleSend,
    handleApiClick,
    saveApi,
    deleteApi,
    clearAllApis,
    createNewApi,
    refreshApis,
    copyResponse,
    copyRequest,
  } = useHttpClient(t)

  const handleEnter = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSend()
  }

  const bodyTypes: { value: BodyType; labelKey: string }[] = [
    { value: 'json', labelKey: 'http.json' },
    { value: 'form', labelKey: 'http.form' },
    { value: 'text', labelKey: 'http.text' },
  ]

  const handleImportOpenAPI = async () => {
    try {
      const [fileHandle] = await (window as any).showOpenFilePicker({
        types: [
          {
            description: 'OpenAPI Spec',
            accept: {
              'application/json': ['.json'],
              'text/yaml': ['.yaml', '.yml'],
            },
          },
        ],
      })
      const file = await fileHandle.getFile()
      const text = await file.text()
      const result = await openapiStore.import(text)
      refreshApis()
      alert(`${t('http.importSuccess')}: ${result.imported} APIs`)
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      console.error('Import failed:', err)
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
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="h-8 pr-7 pl-8 text-sm"
              placeholder={t('http.search')}
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
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={createNewApi}
              >
                <Plus className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('http.newRequest')}</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex flex-1 flex-col">
          <div className="flex items-center px-4 py-1.5">
            <input
              className="text-foreground placeholder:text-muted-foreground h-7 flex-1 bg-transparent text-sm font-medium outline-none"
              value={apiName}
              onChange={(e) => setApiName(e.target.value)}
              placeholder={t('http.apiNamePlaceholder')}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
            {hasUnsavedChanges && (
              <span className="text-muted-foreground mr-2 text-xs">{t('http.unsaved')}</span>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="size-7"
                  onClick={saveApi}
                  disabled={!apiName.trim() && !url.trim()}
                >
                  <Save className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('http.save')}</TooltipContent>
            </Tooltip>
          </div>
          <div className="flex items-center gap-2 px-4 py-1.5">
            <Select
              value={method}
              onValueChange={(v) => setMethod(v as HttpMethod)}
              disabled={loading}
            >
              <SelectTrigger className="w-[110px]" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="url"
              className="h-8 flex-1"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={handleEnter}
              placeholder={t('http.urlPlaceholder')}
              disabled={loading}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />

            <Button
              size="sm"
              onClick={handleSend}
              disabled={loading || !url.trim()}
            >
              {loading ? t('http.sending') : t('http.send')}
              {loading ? (
                <Clock className="ml-1 size-4" />
              ) : (
                <Send className="ml-1 size-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar - API list */}
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
                <SelectItem value="ALL">{t('http.all')}</SelectItem>
                {METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center justify-between">
              <div className="text-muted-foreground text-xs">
                {t('http.apiCount', { count: filteredList.length })}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground h-6 px-1.5 text-xs"
                  >
                    <Import className="mr-1 size-3" />
                    {t('http.import')}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={handleImportOpenAPI}>
                    <Import className="mr-2 size-4" />
                    {t('http.importOpenApi')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      openapiStore.exportJson().then((spec) => {
                        const blob = new Blob(
                          [JSON.stringify(spec, null, 2)],
                          { type: 'application/json' },
                        )
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = 'apichat-openapi.json'
                        a.click()
                        URL.revokeObjectURL(url)
                      })
                    }
                  >
                    <Download className="mr-2 size-4" />
                    {t('http.exportJson')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      openapiStore.exportYaml().then((yaml) => {
                        const blob = new Blob([yaml], {
                          type: 'text/yaml',
                        })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = 'apichat-openapi.yaml'
                        a.click()
                        URL.revokeObjectURL(url)
                      })
                    }
                  >
                    <Download className="mr-2 size-4" />
                    {t('http.exportYaml')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <ScrollArea className="h-0 flex-1">
            {filteredList.length > 0 ? (
              filteredList.map((item) => (
                <div
                  key={item.id}
                  className={`group flex w-full cursor-pointer items-center gap-2.5 overflow-hidden px-3 py-2 transition-colors ${
                    isApiSelected(item)
                      ? 'bg-accent text-accent-foreground'
                      : 'hover:bg-accent/50'
                  }`}
                  onClick={() => handleApiClick(item)}
                >
                  <Badge
                    variant="secondary"
                    className={`w-14 shrink-0 justify-center rounded px-1.5 py-0.5 text-[10px] font-semibold ${METHOD_COLORS[item.method]}`}
                  >
                    {item.method}
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
                          onClick={() => deleteApi(item.id)}
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
                  {searchKeyword
                    ? t('http.noSearchResult', { keyword: searchKeyword })
                    : filterMethod !== 'ALL'
                      ? t('http.noMethodResult', { method: filterMethod })
                      : t('http.noApis')}
                </div>
              </div>
            )}
          </ScrollArea>

          {apis.length > 0 && (
            <div className="border-t p-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive w-full text-xs"
                  >
                    {t('http.clearAllApis')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3" side="top">
                  <p className="mb-2 text-sm">{t('common.confirmClearApis')}</p>
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
                      onClick={clearAllApis}
                    >
                      {t('common.confirm')}
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>

        {/* Right content area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {error && (
            <div className="bg-destructive/10 text-destructive px-4 py-2 text-sm">
              {error}
            </div>
          )}

          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as ActiveTab)}
            className="flex flex-1 flex-col gap-0 overflow-hidden"
          >
            <TabsList
              variant="line"
              className="w-full justify-start rounded-none px-2"
            >
              <TabsTrigger value="description">{t('http.description')}</TabsTrigger>
              <TabsTrigger value="params">{t('http.params')}</TabsTrigger>
              <TabsTrigger value="body">{t('http.body')}</TabsTrigger>
              <TabsTrigger value="headers">{t('http.headers')}</TabsTrigger>
            </TabsList>

            <TabsContent
              value="description"
              className="flex-1 overflow-auto"
            >
              <div className="flex h-full flex-col gap-2 p-2">
                <Textarea
                  value={apiDescription}
                  onChange={(e) => setApiDescription(e.target.value)}
                  placeholder={t('http.apiDescriptionPlaceholder')}
                  className="min-h-32 flex-1 resize-none text-sm"
                  spellCheck={false}
                />
              </div>
            </TabsContent>

            <TabsContent
              value="params"
              className="flex-1 overflow-hidden"
            >
              <div className="flex h-full flex-col gap-2 p-2">
                <div className="flex items-center justify-between">
                  <div className="text-muted-foreground text-sm font-medium">
                    {t('http.queryParams')}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs"
                      onClick={() =>
                        setParams([
                          { key: 'name', value: 'john', enabled: true },
                          { key: 'age', value: '25', enabled: true },
                          { key: 'city', value: 'beijing', enabled: true },
                          { key: '', value: '', enabled: false },
                        ])
                      }
                      disabled={loading}
                    >
                      {t('http.example')}
                    </Button>
                    <Button
                      variant="link"
                      size="sm"
                      className="text-muted-foreground h-auto p-0 text-xs"
                      onClick={() =>
                        setParams([{ key: '', value: '', enabled: false }])
                      }
                      disabled={loading}
                    >
                      {t('http.reset')}
                    </Button>
                  </div>
                </div>
                <KeyValueEditor
                  items={params}
                  onChange={setParams}
                  keyPlaceholder={t('http.paramName')}
                  valuePlaceholder={t('http.paramValue')}
                  disabled={loading}
                />
              </div>
            </TabsContent>

            <TabsContent
              value="body"
              className="flex-1 overflow-hidden"
            >
              <div className="flex h-full flex-col gap-2 p-2">
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    {bodyTypes.map((type) => (
                      <Button
                        key={type.value}
                        variant={
                          bodyType === type.value ? 'default' : 'outline'
                        }
                        size="sm"
                        className="h-7 rounded-full px-3 text-xs"
                        onClick={() => setBodyType(type.value)}
                      >
                        {t(type.labelKey)}
                      </Button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    {bodyType === 'json' && (
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs"
                        onClick={() =>
                          setJsonBody(
                            JSON.stringify(
                              { name: 'john', age: 25, city: 'beijing' },
                              null,
                              2,
                            ),
                          )
                        }
                        disabled={loading}
                      >
                        {t('http.example')}
                      </Button>
                    )}
                    {bodyType === 'form' && (
                      <>
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-xs"
                          onClick={() =>
                            setFormBody([
                              { key: 'name', value: 'john', enabled: true },
                              { key: 'age', value: '25', enabled: true },
                              { key: 'city', value: 'beijing', enabled: true },
                              { key: '', value: '', enabled: false },
                            ])
                          }
                          disabled={loading}
                        >
                          {t('http.example')}
                        </Button>
                        <Button
                          variant="link"
                          size="sm"
                          className="text-muted-foreground h-auto p-0 text-xs"
                          onClick={() =>
                            setFormBody([
                              { key: '', value: '', enabled: false },
                            ])
                          }
                          disabled={loading}
                        >
                          {t('http.reset')}
                        </Button>
                      </>
                    )}
                    {bodyType === 'text' && (
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs"
                        onClick={() => setTextBody('hello world')}
                        disabled={loading}
                      >
                        {t('http.example')}
                      </Button>
                    )}
                  </div>
                </div>
                {bodyType === 'json' && (
                  <CodeEditor
                    language="json"
                    value={jsonBody}
                    onChange={setJsonBody}
                    className="flex-1"
                  />
                )}
                {bodyType === 'form' && (
                  <KeyValueEditor
                    items={formBody}
                    onChange={(items) => setFormBody(items as FormItem[])}
                    keyPlaceholder={t('http.fieldName')}
                    valuePlaceholder={t('http.fieldValue')}
                    disabled={loading}
                  />
                )}
                {bodyType === 'text' && (
                  <CodeEditor
                    language="plaintext"
                    value={textBody}
                    onChange={setTextBody}
                    className="flex-1"
                  />
                )}
              </div>
            </TabsContent>

            <TabsContent
              value="headers"
              className="flex-1 overflow-hidden"
            >
              <div className="flex h-full flex-col gap-2 p-2">
                <div className="flex items-center justify-between">
                  <div className="text-muted-foreground text-sm font-medium">
                    {t('http.headers')}
                  </div>
                  <Button
                    variant="link"
                    size="sm"
                    className="text-muted-foreground h-auto p-0 text-xs"
                    onClick={() =>
                      setHeaders([
                        {
                          key: 'Content-Type',
                          value: 'application/json',
                          enabled: true,
                        },
                        {
                          key: 'User-Agent',
                          value: `ApiChat/${__APP_VERSION__}`,
                          enabled: true,
                        },
                        { key: 'Authorization', value: '', enabled: false },
                        { key: '', value: '', enabled: false },
                      ])
                    }
                    disabled={loading}
                  >
                    {t('http.reset')}
                  </Button>
                </div>
                <KeyValueEditor
                  items={headers}
                  onChange={setHeaders}
                  keyPlaceholder={t('http.headerName')}
                  valuePlaceholder={t('http.headerValue')}
                  disabled={loading}
                />
              </div>
            </TabsContent>
          </Tabs>

          {/* Response area */}
          <div className="flex-1 overflow-y-auto border-t">
            <div className="flex h-full flex-col gap-2 p-2">
              <div className="flex items-center justify-between">
                <div className="text-muted-foreground text-sm font-medium">
                  {t('http.response')}
                </div>
                {response && (
                  <div className="flex gap-2">
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs"
                      onClick={copyRequest}
                      disabled={copySuccess}
                    >
                      <Copy className="mr-1 size-3" />
                      {t('http.copyRequest')}
                    </Button>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs"
                      onClick={copyResponse}
                      disabled={copySuccess}
                    >
                      <Copy className="mr-1 size-3" />
                      {t('http.copyResponse')}
                    </Button>
                  </div>
                )}
              </div>
              <CodeEditor
                language={responseLanguage}
                value={response}
                readonly
                className="flex-1"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
