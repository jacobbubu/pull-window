import * as pull from 'pull-stream'
import looper from '@jacobbubu/looper'

export type WindowClosed<U> = (end: pull.EndOrError, _data: U) => void
export type WindowUpdater<T> = (end: pull.EndOrError, data: T) => void
export type WindowInit<T, U> = (data: T, cb: WindowClosed<U>) => WindowUpdater<T> | void

export interface Result<T, U> {
  start: T
  data: U
}
export type ResultMapper<T, U> = (start: T, _data: U) => any

const window = function <T, U>(init: WindowInit<T, U>, mapper?: ResultMapper<T, U>) {
  return function (rawRead: pull.Source<T>) {
    mapper =
      mapper ||
      function (start: T, _data: U) {
        return { start, data: _data }
      }

    // Save all update functions of opened windows
    const windows: WindowUpdater<T>[] = []

    // Final window output stores here
    const output: Result<T, U>[] = []
    let ended: pull.EndOrError | null = null

    return function newRead(abort: pull.Abort, cb: pull.SourceCallback<any>) {
      if (output.length) return cb(null, output.shift())
      if (ended) return cb(ended)

      const next = looper(function () {
        rawRead(null, function (end: pull.EndOrError, data?: T) {
          let windowUpdater: WindowUpdater<T> | void
          let once = false

          if (end) {
            ended = end
          }

          const windowClosed = (_: pull.EndOrError, _data: U) => {
            if (once) return

            once = true
            delete windows[windows.indexOf(windowUpdater as WindowUpdater<T>)]
            output.push(mapper!(data!, _data))
          }

          if (!ended) {
            // Check if a new window should be opened
            windowUpdater = init(data!, windowClosed)
          }

          if (windowUpdater) {
            // If so, a new data updater for this window stores in window updater cache
            windows.push(windowUpdater)
          } else {
            // Don't allow data unless a window started here!
            once = true
          }

          windows.forEach(function (updater) {
            updater(end, data!)
          })

          if (output.length) {
            return cb(null, output.shift())
          } else if (ended) {
            return cb(ended)
          } else {
            next()
          }
        })
      })
      next()
    }
  }
}

window.recent = function <T, U>(size: number | null, time?: number) {
  let current: T[] | null = null
  return window<T, U>(
    function (_: T, windowClosed: WindowClosed<U>) {
      if (current) return

      current = []
      let timer: NodeJS.Timeout | null = null

      function done() {
        let _current = current
        current = null
        if (timer) {
          clearTimeout(timer)
        }
        windowClosed(null, (_current as any) as U)
      }

      if (time) {
        timer = setTimeout(done, time)
      }

      // Open a new window with an updater
      return function (end, data) {
        if (end) {
          return done()
        }
        current!.push(data)
        if (size !== null && current!.length >= size) {
          done()
        }
      }
    },
    function (_, data) {
      return data
    }
  )
}

window.sliding = function <T>(reduce: (acc: T[], curr: T) => T[], width: number = 10) {
  return window(function (data: T, cb: WindowClosed<T[]>) {
    let acc: T[]
    let i = 0

    return function (end, data) {
      if (end) return
      acc = reduce(acc, data)
      if (width <= ++i) {
        cb(null, acc)
      }
    }
  })
}
export { window }
