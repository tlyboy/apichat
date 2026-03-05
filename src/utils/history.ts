import { historyStore } from '@/utils/store'
import type { HistoryRecord } from '@/types'

export type { HistoryRecord }

export async function addHistoryRecord(
  record: Omit<HistoryRecord, 'id' | 'timestamp'>,
) {
  try {
    const newRecord = await historyStore.add(record)
    window.dispatchEvent(new CustomEvent('apichat-history-updated'))
    return newRecord
  } catch (err) {
    console.error('Failed to add history:', err)
  }
}

export async function getHistoryRecords(): Promise<HistoryRecord[]> {
  try {
    return await historyStore.list()
  } catch {
    return []
  }
}

export async function deleteHistoryRecord(id: string) {
  try {
    await historyStore.delete(id)
    window.dispatchEvent(new CustomEvent('apichat-history-updated'))
  } catch (err) {
    console.error('Failed to delete history:', err)
  }
}

export async function clearHistoryRecords() {
  try {
    await historyStore.clear()
    window.dispatchEvent(new CustomEvent('apichat-history-updated'))
  } catch (err) {
    console.error('Failed to clear history:', err)
  }
}
