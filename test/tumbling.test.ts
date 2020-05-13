import * as pull from 'pull-stream'
import { window } from '../src'

function rememberStart(start: number, data: number) {
  return { start: start, data: data }
}

describe('pull-window', () => {
  it('tumbling count', (done) => {
    let i = 0
    let last: Function | null = null

    const expected = [
      { start: 0, data: 78 },
      { start: 13, data: 247 },
      { start: 26, data: 416 },
      { start: 39, data: 585 },
      { start: 52, data: 754 },
      { start: 65, data: 923 },
      { start: 78, data: 1092 },
      { start: 91, data: 1261 },
      { start: 104, data: 1430 },
    ]

    pull(
      pull.count(127),
      window(function (_, cb) {
        if (!(i++ % 13)) {
          if (last) last()
          let acc = 0
          last = function () {
            cb(null, acc)
          }
          return function (end, data) {
            if (end) return
            acc = acc + data
          }
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
