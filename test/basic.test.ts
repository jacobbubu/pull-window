import * as pull from 'pull-stream'
import { window } from '../src'

describe('pull-window', () => {
  it('basic', (done) => {
    let all: number[] = []
    pull(
      (function () {
        let i = 0

        return function (abort: pull.Abort, cb: pull.SourceCallback<number>) {
          if (abort) return cb(true)
          setTimeout(function () {
            cb(null, i++)
          }, Math.random() * 75)
        }
      })(),
      pull.take(50),
      pull.through((e) => all.push(e)),
      window.recent(20, 200),
      pull.collect(function (err, ary) {
        expect(err).toBeFalsy()

        ary.forEach(function (e) {
          expect(Array.isArray(e)).toBe(true)
        })
        expect(ary.reduce((acc, item) => acc.concat(item), [])).toEqual(all)
        done()
      })
    )
  })
})
