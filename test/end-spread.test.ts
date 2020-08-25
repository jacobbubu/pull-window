import * as pull from 'pull-stream'
import { window } from '../src'

describe('pull-window', () => {
  it('end-spread', (done) => {
    pull(
      (abort: pull.Abort, cb: pull.SourceCallback<number>) => {
        if (abort) return done()
        setTimeout(function () {
          cb(null, 1)
        }, 20)
      },
      window.recent(10, 10),
      (source: pull.Source<number>) => {
        source(null, (end, data) => {
          console.log(`first cb ${end}`)
        })
        // sink closed
        source(true, (end, data) => {
          console.log(`second cb ${end}`)
        })
      }
    )
  })
})
