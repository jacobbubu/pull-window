import * as pull from 'pull-stream'
import { window } from '../src'

function rememberStart(start: number, data: number) {
  return { start, data }
}

describe('pull-window', () => {
  it('timed window', (done) => {
    let timer: NodeJS.Timeout | null = null
    let startTime = 0
    const expected = [
      { start: 0, data: 3 },
      { start: 3, data: 12 },
      { start: 6, data: 21 },
      { start: 9, data: 30 },
      { start: 12, data: 25 },
    ]

    pull(
      pull.count(13),
      pull.asyncMap(function (data, cb) {
        if (startTime === 0) {
          startTime = Date.now()
        }
        setTimeout(function () {
          cb(null, data)
        }, 100)
      }),
      window(function (data, closeWindow, nextId) {
        let windowOpenTime = 0
        if (timer) return
        let acc = 0
        timer = setTimeout(function () {
          closeWindow(null, acc)
          timer = null
        }, 300)
        if (windowOpenTime === 0) {
          windowOpenTime = Date.now()
        }
        return function (end, data, nextId) {
          if (end) {
            closeWindow(null, acc)
            return
          }
          acc += data
        }
      }, rememberStart),
      pull.collect(function (err, ary) {
        expect(err).toBeFalsy()
        expect(ary).toEqual(expected)
        done()
      })
    )
  })
})
