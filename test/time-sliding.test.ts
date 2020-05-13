import * as pull from 'pull-stream'
import { window } from '../src'

function rememberStart(start: number, data: number) {
  return { start: start, data: data }
}

describe('pull-window', () => {
  it('timed window', (done) => {
    let timer: NodeJS.Timeout | null = null
    const expected = [
      { start: 0, data: 3 },
      { start: 3, data: 12 },
      { start: 6, data: 21 },
      { start: 9, data: 30 },
    ]

    pull(
      pull.count(13),
      pull.asyncMap(function (data, cb) {
        setTimeout(function () {
          cb(null, data)
        }, 200)
      }),
      window(function (_, cb) {
        if (timer) return
        let acc = 0
        timer = setTimeout(function () {
          timer = null
          cb(null, acc)
        }, 600)
        return function (end, data) {
          if (end) return
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
