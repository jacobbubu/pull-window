import * as pull from 'pull-stream'
import { window } from '../src'

describe('pull-window', () => {
  it('sliding', (done) => {
    const expected = [
      { start: 0, data: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] },
      { start: 1, data: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
      { start: 2, data: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
      { start: 3, data: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
      { start: 4, data: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13] },
      { start: 5, data: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14] },
      { start: 6, data: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15] },
      { start: 7, data: [7, 8, 9, 10, 11, 12, 13, 14, 15, 16] },
      { start: 8, data: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17] },
      { start: 9, data: [9, 10, 11, 12, 13, 14, 15, 16, 17, 18] },
      { start: 10, data: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19] },
    ]

    pull(
      pull.count(19),
      window.sliding(function (acc, curr) {
        ;(acc = acc || []).push(curr)
        return acc
      }, 10),
      pull.collect(function (err, ary) {
        expect(err).toBeFalsy()
        expect(ary).toEqual(expected)
        done()
      })
    )
  })
})
