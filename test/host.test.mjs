import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { apply } from '../index.js'
import { PLACES, BAGS } from '../core.js'

const valid = () => ({ id: 'trip-1', placeId: PLACES[0].id, bagId: BAGS[0].id, theme: '听雨' })
function setup(options = {}) {
  let handler, calls = 0, received, lastSignal
  const disposers = []
  const ctx = {
    effect(fn) { disposers.push(fn()) },
    connection: { admit: () => options.admission ?? { peer: { principal: { kind: 'owner' } } } },
    webServer: { register(route) { assert.equal(route.path, '/travel-frog/story'); handler = route.handler; return () => {} } },
    get(name) { assert.equal(name, 'agentDefaultModel'); return { currentSelection: () => options.noModel ? undefined : { provider: 'fixture', model: 'local' } } },
    llm: {
      async prepareCall(route, signal, controls) {
        calls++; received = { route, controls: controls({}, { reasoning: { efforts: [{ id: 'off' }] } }) }; lastSignal = signal
        if (options.error) throw new Error('secret API key is never exposed')
        return { config: {}, async *stream(args) {
          received.args = args
          if (options.wait) await new Promise((resolve, reject) => {
            if (signal.aborted) return reject(new Error('abort'))
            signal.addEventListener('abort', () => reject(new Error('abort')), { once: true })
          })
          yield { type: 'text-delta', text: options.output ?? '我在山间听见了雨。' }
          if (!options.noFinish) yield { type: 'finish', reason: options.finish ?? { kind: 'stop' } }
        } }
      },
    },
  }
  apply(ctx, options.config)
  function request(body = valid(), attrs = {}) {
    const req = Object.assign(new EventEmitter(), { method: 'POST', headers: { 'content-type': 'application/json' } }, attrs)
    const res = Object.assign(new EventEmitter(), {
      writableEnded: false, destroyed: false, headersSent: false,
      writeHead(status, headers) { this.status = status; this.headers = headers; this.headersSent = true },
      end(body) { this.body = JSON.parse(body); this.writableEnded = true },
    })
    const done = handler(req, res)
    queueMicrotask(() => { req.emit('data', typeof body === 'string' ? body : JSON.stringify(body)); req.emit('end') })
    return { req, res, done }
  }
  return { request, dispose() { for (const fn of disposers.reverse()) fn?.() }, get calls() { return calls }, get received() { return received }, get signal() { return lastSignal } }
}

test('owner-only endpoint rejects missing auth and guests without model calls', async () => {
  for (const [admission, status] of [[{ rejection: 401 }, 401], [{ peer: { principal: { kind: 'guest' } } }, 403]]) {
    const host = setup({ admission }); const q = host.request(); await q.done
    assert.equal(q.res.status, status); assert.equal(host.calls, 0); host.dispose()
  }
})
test('method, content type, malformed, oversized and unknown fields are rejected', async () => {
  const host = setup()
  for (const [body, attrs, status] of [
    [valid(), { method: 'GET' }, 405], [valid(), { headers: {} }, 415],
    ['{', {}, 400], ['x'.repeat(4097), {}, 400], [null, {}, 400],
    [{ ...valid(), sessionId: 'secret-session' }, {}, 400],
    [{ ...valid(), theme: 'x'.repeat(81) }, {}, 400],
    [{ ...valid(), id: 'x'.repeat(101) }, {}, 400],
    [{ ...valid(), placeId: 'fake' }, {}, 400],
    [{ ...valid(), bagId: 'fake' }, {}, 400],
    [{ ...valid(), bagId: BAGS[1].id }, {}, 400],
  ]) { const q = host.request(body, attrs); await q.done; assert.equal(q.res.status, status) }
  assert.equal(host.calls, 0); host.dispose()
})
test('default route gets bounded game facts only; successful retry hits cache', async () => {
  const host = setup(); const first = host.request(); await first.done
  assert.equal(first.res.status, 200)
  assert.deepEqual(host.received.route, { provider: 'fixture', model: 'local', maxTokens: 220 })
  assert.equal(host.received.controls.reasoningEffort, 'off')
  assert.equal(host.received.args.tools, undefined)
  const prompt = JSON.parse(host.received.args.messages[0].content[0].text)
  assert.deepEqual(prompt, { destination: PLACES[0].name, luggage: BAGS[0].name, theme: '听雨' })
  const second = host.request(); await second.done; assert.deepEqual(second.res.body, first.res.body); assert.equal(host.calls, 1)
  const altered = host.request({ ...valid(), theme: '看云' }); await altered.done; assert.equal(altered.res.status, 429)
  host.dispose()
})
test('explicit route wins and token count is capped', async () => {
  const host = setup({ config: { provider: 'chosen', model: 'chosen-model', maxOutputTokens: 9000 } })
  const q = host.request(); await q.done
  assert.deepEqual(host.received.route, { provider: 'chosen', model: 'chosen-model', maxTokens: 220 }); host.dispose()
})
test('missing default route reports no-model', async () => {
  const host = setup({ noModel: true }); const q = host.request(); await q.done
  assert.equal(q.res.status, 503); assert.equal(q.res.body.error, 'no-model'); assert.equal(host.calls, 0); host.dispose()
})
test('missing, error and truncated finish are failures', async () => {
  for (const options of [{ noFinish: true }, { finish: { kind: 'error', failure: { message: 'private details' } } }, { finish: { kind: 'max-tokens' } }, { finish: {} }, { error: true }]) {
    const host = setup(options); const q = host.request(); await q.done
    assert.equal(q.res.status, 502); assert.ok(!JSON.stringify(q.res.body).includes('private')); assert.ok(!JSON.stringify(q.res.body).includes('secret')); host.dispose()
  }
})
test('global inflight guard, disconnect and disposal cancel the model', async () => {
  for (const stop of ['disconnect', 'dispose']) {
    const host = setup({ wait: true }); const first = host.request()
    await new Promise(resolve => setImmediate(resolve))
    const second = host.request({ ...valid(), id: 'trip-2' }); await second.done
    assert.equal(second.res.status, 429); assert.equal(host.calls, 1)
    if (stop === 'disconnect') { first.res.destroyed = true; first.res.emit('close') } else host.dispose()
    await first.done; assert.equal(host.signal.aborted, true)
    if (stop === 'disconnect') { assert.equal(first.res.body, undefined); host.dispose() }
    else assert.equal(first.res.status, 408)
  }
})
test('deadline cancels an unfinished model call', async () => {
  const host = setup({ wait: true, config: { timeoutMs: 100 } }); const q = host.request(); await q.done
  assert.equal(q.res.status, 408); assert.equal(host.signal.aborted, true); host.dispose()
})
test('model output above the core postcard limit is rejected', async () => {
  const host = setup({ output: '蛙'.repeat(2001) }); const q = host.request(); await q.done
  assert.equal(q.res.status, 502); assert.equal(q.res.body.error, 'story-unavailable'); host.dispose()
})
