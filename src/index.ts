import * as pull from 'pull-stream'
import looper from '@jacobbubu/looper'

export type CloseWindow<U> = (end: pull.EndOrError, _data: U) => void
export type WindowUpdater<T> = (end: pull.EndOrError, data: T, nextId?: number) => void
export type WindowInit<T, U> = (
  data: T,
  closeWindow: CloseWindow<U>,
  nextId?: number
) => WindowUpdater<T> | void

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

    let storedCb: pull.SourceCallback<any> | null = null
    let reading = false
    let aborted: pull.Abort = null

    return function newRead(abort: pull.Abort, cb: pull.SourceCallback<any>) {
      if (abort) {
        aborted = abort
        if (storedCb) {
          if (output.length) {
            const _cb = storedCb
            storedCb = null
            _cb(null, output.shift())
          }
        }
        if (!reading) {
          return rawRead(abort, cb)
        }
        return
      }

      if (output.length) return cb(null, output.shift())
      if (ended) return cb(ended)

      storedCb = cb

      if (reading) return

      function callback(end?: pull.EndOrError) {
        if (storedCb) {
          const _cb = storedCb
          storedCb = null
          if (end) {
            _cb(end)
          } else {
            _cb(null, output.shift())
          }
        }
      }
      const next = looper(function () {
        reading = true
        rawRead(aborted, function (end: pull.EndOrError, data?: T) {
          reading = false
          let windowUpdater: WindowUpdater<T> | void
          let once = false
          const start = data

          if (end) {
            ended = end
          }

          const closeWindow = (_: pull.EndOrError, _data: U) => {
            if (once) {
              return
            }

            once = true
            delete windows[windows.indexOf(windowUpdater as WindowUpdater<T>)]
            output.push(mapper!(start!, _data))
            callback()
          }

          if (!ended) {
            // Check if a new window should be opened
            windowUpdater = init(data!, closeWindow)
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

          if (storedCb) {
            if (output.length) {
              return callback()
            } else if (ended) {
              return callback(ended)
            } else {
              // We need more data to fill the window
              next()
            }
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
    function (_: T, closeWindow: CloseWindow<U>) {
      if (current) return

      current = []
      let timer: NodeJS.Timeout | null = null

      function done() {
        let _current = current
        current = null
        if (timer) {
          clearTimeout(timer)
          timer = null
        }
        closeWindow(null, (_current as any) as U)
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
  return window(function (data: T, closeWindow: CloseWindow<T[]>) {
    let acc: T[]
    let i = 0

    return function (end, data) {
      if (end) return
      acc = reduce(acc, data)
      if (width <= ++i) {
        closeWindow(null, acc)
      }
    }
  })
}
export { window }
