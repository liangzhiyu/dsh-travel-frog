const React = require('react')
const h = React.createElement
const KEY = 'dsh-travel-frog.state.v1'
const LOCK = 'dsh-travel-frog.state'
const EVENT = 'dsh-travel-frog:change'
const PANEL = 'travel-frog'

function readState() {
  const raw = localStorage.getItem(KEY)
  return raw === null ? freshState() : validateState(JSON.parse(raw))
}

function writeState(state) {
  localStorage.setItem(KEY, JSON.stringify(state))
  window.dispatchEvent(new Event(EVENT))
}

function withLock(fn) {
  if (!navigator.locks) throw new Error('请使用支持 Web Locks 的浏览器，通过 localhost 或 HTTPS 打开。')
  return navigator.locks.request(LOCK, fn)
}

async function transact(fn) {
  return withLock(() => {
    const current = readState()
    const next = fn(current)
    if (next !== current) writeState(next)
    return next
  })
}

function download(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function useTravelState(setError) {
  const [state, setState] = React.useState(null)
  const [clock, setClock] = React.useState(Date.now)
  React.useEffect(() => {
    function sync(event) {
      if (event?.type === 'storage' && event.key !== null && event.key !== KEY) return
      try {
        setState(readState())
        setClock(Date.now())
      } catch {
        setState(null)
        setError('无法读取存档。请到相册导出备份，或导入有效存档。')
      }
    }
    sync()
    window.addEventListener('storage', sync)
    window.addEventListener(EVENT, sync)
    window.addEventListener('focus', sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener(EVENT, sync)
      window.removeEventListener('focus', sync)
    }
  }, [setError])

  React.useEffect(() => {
    if (!state?.trip) return
    const { startedAt, returnAt } = state.trip
    const next = clock < startedAt ? startedAt : returnAt
    const timer = setTimeout(() => {
      const now = Date.now()
      if (now >= returnAt) {
        transact(current => settleTrip(current, Date.now()))
          .then(() => setClock(Date.now()))
          .catch(() => setError('暂时无法保存明信片，请检查浏览器的存储权限。'))
      } else {
        setClock(now)
      }
    }, Math.min(2_147_483_647, Math.max(0, next - Date.now())))
    return () => clearTimeout(timer)
  }, [state, clock, setError])

  return [state, clock]
}

function Art({ source }) {
  return source ? h('img', { className: 'tf-art', alt: '', src: source }) : null
}

function Paper({ title, label, source, cardId, live, children }) {
  return h('article', {
    className: source ? 'tf-paper tf-paper-illustrated' : 'tf-paper',
    'data-card-id': cardId,
    'aria-live': live ? 'polite' : undefined,
  },
  source && h('div', { className: 'tf-artwork' }, h(Art, { source })),
  h('div', { className: 'tf-paper-content' },
    label && h('p', { className: 'tf-kicker' }, label),
    h('h2', null, title),
    children))
}

function Postcard({ card, onOpenSession, onPack, showStory }) {
  const place = PLACES.find(item => item.id === card.placeId)
  return h(Paper, {
    title: showStory ? place.name : '小蛙回来了',
    label: showStory ? '旅途来信' : place.name,
    source: POSTCARD_ART[card.placeId],
    cardId: card.id,
  },
  card.note && h('p', { className: 'tf-note' }, card.note),
  (showStory || !card.note) && h('p', { className: 'tf-story' }, showStory ? card.story : place.description),
  (card.sessionId || onPack) && h('div', { className: 'tf-card-actions' },
    card.sessionId && h('button', {
      type: 'button',
      className: 'tf-primary',
      onClick: () => onOpenSession(card.sessionId),
    }, '回到会话'),
    onPack && h('button', {
      type: 'button',
      className: card.sessionId ? 'tf-secondary' : 'tf-primary',
      onClick: onPack,
    }, '准备下一份便当')))
}

function TravelHouse({ sourceSessionId, openSession }) {
  const [sessionId, setSessionId] = React.useState(sourceSessionId)
  const [error, setError] = React.useState('')
  const [state, clock] = useTravelState(setError)
  const [album, setAlbum] = React.useState(false)
  const [selected, setSelected] = React.useState(null)
  const [packing, setPacking] = React.useState(Boolean(sessionId))
  const [note, setNote] = React.useState('')
  const [working, setWorking] = React.useState(false)
  const fileInput = React.useRef(null)

  async function change(action) {
    setWorking(true)
    setError('')
    try {
      return await action()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '无法保存，请稍后重试。')
      return false
    } finally {
      setWorking(false)
    }
  }

  async function prepare(event) {
    event.preventDefault()
    const result = await change(() => transact(current =>
      prepareTrip(current, { sessionId, note }, Date.now(), crypto.randomUUID())))
    if (result) {
      setPacking(false)
      setNote('')
      setSessionId(undefined)
    }
  }

  async function returnToSession(id) {
    setError('')
    try {
      await openSession(id)
    } catch {
      setError('这段会话当前无法打开。你的明信片仍保存在相册。')
    }
  }

  async function importSave(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    await change(async () => {
      if (file.size > 1024 * 1024) throw new Error('存档超过 1 MB，无法导入。')
      let restored
      try {
        restored = validateState(JSON.parse(await file.text()))
      } catch {
        throw new Error('存档格式无效，当前存档未改变。')
      }
      if (!window.confirm('导入会覆盖此浏览器的蛙旅存档。确认继续？')) return false
      await withLock(() => writeState(restored))
      setSelected(null)
      return true
    })
  }

  function exportSave() {
    try {
      download('frog-travel-backup.json', localStorage.getItem(KEY) ?? JSON.stringify(freshState()))
    } catch {
      setError('无法读取存档，导出失败。')
    }
  }

  function reset() {
    if (!window.confirm('重置会删除此浏览器的全部旅行和明信片。确认重置？')) return
    void change(() => withLock(() => writeState(freshState())))
  }

  const latest = state?.cards.at(-1)
  const selectedCard = state?.cards.find(card => card.id === selected)
  const trip = state?.trip
  let content

  if (album) {
    content = h('section', { className: 'tf-album', 'aria-label': '明信片相册' },
      h('h2', null, '相册'),
      state?.cards.length
        ? h('ul', { className: 'tf-album-list' }, [...state.cards].reverse().map(card =>
          h('li', { key: card.id }, h('button', {
            type: 'button',
            'aria-expanded': selected === card.id,
            onClick: () => setSelected(selected === card.id ? null : card.id),
          },
          PLACES.find(place => place.id === card.placeId).name,
          h('time', { className: 'tf-quiet' }, new Date(card.returnedAt).toLocaleDateString('zh-CN'))
          ))))
        : h('p', { className: 'tf-quiet' }, '明信片会收在这里。'),
      selectedCard && h(Postcard, { card: selectedCard, onOpenSession: returnToSession, showStory: true }),
      h('details', { className: 'tf-tools tf-quiet' },
        h('summary', null, '管理存档'),
        h('div', { className: 'tf-actions' },
          h('button', { type: 'button', onClick: exportSave }, '导出存档'),
          h('button', { type: 'button', disabled: working, onClick: () => fileInput.current?.click() }, '导入存档'),
          h('button', { type: 'button', disabled: working, onClick: reset }, '重置存档')),
        h('input', { ref: fileInput, type: 'file', accept: '.json,application/json', onChange: importSave, hidden: true }))
    )
  } else if (trip) {
    const waiting = clock < trip.startedAt
    content = h('div', { className: 'tf-stage' },
      h(Paper, {
        title: waiting ? '便当备好了' : '小蛙出门了',
        label: waiting ? '小屋' : '旅途中',
        source: waiting ? HOME_ART : undefined,
        live: true,
      },
      h('p', { className: 'tf-quiet' }, waiting ? '它会自己挑个时候出门。' : '回来时，看看它去了哪里。')))
  } else if (latest && !packing) {
    content = h('div', { className: 'tf-stage' },
      h(Postcard, { card: latest, onOpenSession: returnToSession, onPack: () => setPacking(true) }))
  } else {
    content = h('div', { className: 'tf-stage' },
      h(Paper, { title: '小蛙在家', label: '小屋', source: HOME_ART },
        h('form', { className: 'tf-form', onSubmit: prepare },
          sessionId && h('label', { className: 'tf-quiet' }, '留一句下次要做的事（选填）',
            h('input', { value: note, maxLength: 80, onChange: event => setNote(event.target.value) })),
          h('button', { className: 'tf-primary', type: 'submit', disabled: !state || working }, '备好便当'))))
  }

  return h('main', { className: 'tf', 'data-travel-frog': '' },
    h('style', null, TRAVEL_CSS),
    h('div', { className: 'tf-wrap' },
      h('header', { className: 'tf-top' },
        h('h1', null, '蛙旅'),
        h('button', { type: 'button', className: 'tf-secondary', onClick: () => setAlbum(!album) }, album ? '回到小屋' : '相册')),
      error && h('p', { className: 'tf-alert', role: 'alert' }, error),
      content))
}

return {
  inject: ['slots', 'layout', 'uiWorkspace', 'sessions'],
  apply(ctx) {
    const sessionAction = 'conversation.session.header.actions'
    const lifetime = new AbortController()
    ctx.effect(() => () => lifetime.abort())
    let pendingSessionId

    async function openSession(id) {
      const signal = AbortSignal.any([lifetime.signal, ctx.layout.beginNavigation(), AbortSignal.timeout(12000)])
      const ref = ctx.sessions.retain(id, { source: 'travel-frog-return', signal })
      try {
        const binding = await ref.ready
        signal.throwIfAborted()
        const state = binding.session.getSnapshot()
        if (state.removed || state.openState !== 'open') throw new Error('Session unavailable')
        ctx.uiWorkspace.openSession(id)
      } finally {
        ref.release()
      }
    }

    function Main() {
      const [sourceSessionId] = React.useState(() => pendingSessionId)
      React.useEffect(() => { pendingSessionId = undefined }, [])
      return h(TravelHouse, { sourceSessionId, openSession })
    }

    function prepareFromSession(id) {
      try {
        pendingSessionId = readState().trip ? undefined : id
      } catch {
        pendingSessionId = undefined
      }
      ctx.layout.selectPanel(PANEL)
    }

    ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: PANEL }, Main))
    ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
      name: 'sidebar.panellist',
      id: PANEL,
      order: 50,
      label: () => '蛙旅',
    }, ({ size }) => h('img', { className: 'tf-sidebar-icon', alt: '', width: size || 18, height: size || 18, src: MAIL_ICON })))
    ctx.slots.inject(sessionAction, () => ctx.slots.register({
      name: sessionAction,
      id: 'travel-frog-prepare',
      order: 100,
      label: () => '给小蛙备便当',
    }, ({ sessionId }) => h('button', {
      type: 'button',
      title: '给小蛙备便当',
      'aria-label': '给小蛙备便当',
      'data-window-no-drag': '',
      onClick: () => prepareFromSession(sessionId),
      style: { background: 'none', border: 0, padding: '6px 8px', color: 'inherit', cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap' },
    }, '给小蛙备便当')))
  },
}
