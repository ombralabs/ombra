import { type Ref, ref } from 'vue'

/** Обновление списка: один запрос в полёте и не больше одного отложенного. */
export interface Refresher {
  /** Свежие данные. Во время запроса ставит один отложенный; все, кто попросил во время запроса, ждут его ответа. */
  refresh(): Promise<void>
  /** Обновление не чаще раза в `delay` мс: пока одно запланировано, новые не ставятся. Ошибка не всплывает. */
  schedule(delay?: number): void
  /** Отменить запланированное `schedule`; запрос в полёте и отложенный доходят. */
  cancel(): void
  /** Запрос в полёте или отложен. */
  loading: Ref<boolean>
}

interface Deferred {
  promise: Promise<void>
  resolve: () => void
  reject: (error: unknown) => void
}

function deferred(): Deferred {
  let resolve!: () => void
  let reject!: (error: unknown) => void
  const promise = new Promise<void>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

/**
 * `fetch` читает данные, `apply` кладёт ответ в хранилище. Каждый ответ применяется: запросы идут по одному,
 * следующий ответ всегда свежее. Ошибка запроса, за которым уже отложен следующий, не всплывает — ответит следующий.
 */
export function createRefresher<T>(fetch: () => Promise<T>, apply: (value: T) => void): Refresher {
  const loading = ref(false)
  let inFlight = false
  let queued: Deferred | null = null
  let timer: ReturnType<typeof setTimeout> | undefined

  async function run(): Promise<void> {
    inFlight = true
    loading.value = true
    try {
      apply(await fetch())
    } catch (error) {
      if (queued === null) throw error
    } finally {
      inFlight = false
      const next = queued
      queued = null
      // Отложенный уходит сразу: ждущий этого запроса продолжит работу, когда следующий уже в полёте.
      if (next) run().then(next.resolve, next.reject)
      else loading.value = false
    }
  }

  function refresh(): Promise<void> {
    if (!inFlight) return run()
    queued ??= deferred()
    return queued.promise
  }

  function schedule(delay = 500) {
    if (timer !== undefined) return
    timer = setTimeout(() => {
      timer = undefined
      // Фоновое обновление по событию: ошибку покажет следующее действие пользователя.
      refresh().catch(() => undefined)
    }, delay)
  }

  function cancel() {
    clearTimeout(timer)
    timer = undefined
  }

  return { refresh, schedule, cancel, loading }
}
