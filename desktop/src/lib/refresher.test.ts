import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRefresher } from './refresher'

interface Call {
  resolve: (value: number) => void
  reject: (error: unknown) => void
}

function setup() {
  const calls: Call[] = []
  const fetch = vi.fn(() => new Promise<number>((resolve, reject) => calls.push({ resolve, reject })))
  const apply = vi.fn((_value: number) => undefined)
  return { calls, fetch, apply, refresher: createRefresher(fetch, apply) }
}

/** Дать отработать цепочкам промисов: таймеры поддельные, `flushPromises` с ними не дождётся. */
async function settle() {
  for (let i = 0; i < 10; i++) await Promise.resolve()
}

describe('помощник обновления', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('три refresh подряд — запрос в полёте и один отложенный; последним применяется ответ отложенного', async () => {
    const { calls, fetch, apply, refresher } = setup()
    const first = refresher.refresh()
    const second = refresher.refresh()
    const third = refresher.refresh()
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(third).toBe(second)
    calls[0]!.resolve(1)
    await first
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(refresher.loading.value).toBe(true)
    calls[1]!.resolve(2)
    await third
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(apply.mock.calls).toEqual([[1], [2]])
    expect(refresher.loading.value).toBe(false)
  })

  it('ошибка запроса, за которым отложен следующий, не всплывает; ошибка последнего — всплывает', async () => {
    const { calls, apply, refresher } = setup()
    const first = refresher.refresh()
    const second = refresher.refresh()
    calls[0]!.reject(new Error('stale'))
    await expect(first).resolves.toBeUndefined()
    calls[1]!.reject(new Error('latest'))
    await expect(second).rejects.toThrow('latest')
    expect(apply).not.toHaveBeenCalled()
    expect(refresher.loading.value).toBe(false)
  })

  it('loading не висит после пачки: снова в полёте только с новым запросом', async () => {
    const { calls, refresher } = setup()
    const first = refresher.refresh()
    const queued = refresher.refresh()
    refresher.refresh().catch(() => undefined)
    calls[0]!.resolve(1)
    await first
    calls[1]!.reject(new Error('fail'))
    await expect(queued).rejects.toThrow('fail')
    expect(refresher.loading.value).toBe(false)
    const next = refresher.refresh()
    expect(refresher.loading.value).toBe(true)
    calls[2]!.resolve(3)
    await next
    expect(refresher.loading.value).toBe(false)
  })

  it('schedule — не чаще раза в delay; cancel отменяет запланированное', () => {
    const { fetch, refresher } = setup()
    for (let i = 0; i < 5; i++) refresher.schedule(250)
    vi.advanceTimersByTime(249)
    expect(fetch).not.toHaveBeenCalled()
    expect(refresher.loading.value).toBe(false)
    vi.advanceTimersByTime(1)
    expect(fetch).toHaveBeenCalledTimes(1)
    refresher.schedule(250)
    refresher.cancel()
    vi.advanceTimersByTime(1000)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('события во время медленного запроса — один отложенный, ответ полёта применяется', async () => {
    const { calls, fetch, apply, refresher } = setup()
    refresher.schedule(250)
    vi.advanceTimersByTime(250)
    for (let i = 0; i < 4; i++) {
      refresher.schedule(250)
      vi.advanceTimersByTime(250)
    }
    expect(fetch).toHaveBeenCalledTimes(1)
    calls[0]!.resolve(1)
    await settle()
    expect(apply).toHaveBeenLastCalledWith(1)
    expect(fetch).toHaveBeenCalledTimes(2)
    calls[1]!.resolve(2)
    await settle()
    expect(apply).toHaveBeenLastCalledWith(2)
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(refresher.loading.value).toBe(false)
  })
})
