import * as pull from 'pull-stream'
import { window } from '../src'

const delay = async (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

let i = 0
pull(
  (function () {
    return async function (abort: pull.Abort, cb: pull.SourceCallback<number>) {
      if (abort) return cb(true)
      while (i >= 3) {
        await delay(2)
      }
      cb(null, i++)
    }
  })(),
  pull.take(20),
  window.recent(null, 100),
  pull.drain(function (data: number[]) {
    console.log('windowed data:', data)
    if (data.includes(2)) {
      i = 0
    }
  })
)
