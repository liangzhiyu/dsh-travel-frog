export const PLACES = Object.freeze([
  { id: 'moss-post', name: '苔邮小站', icon: '🌿', souvenir: '叶脉书签', description: '山间的小邮局把风声装进信封。' },
  { id: 'fern-bridge', name: '蕨影木桥', icon: '🌱', souvenir: '蕨叶拓印', description: '溪水绕过木桥，叶尖留着晨露。' },
  { id: 'shell-bay', name: '贝灯浅湾', icon: '🐚', souvenir: '月纹贝壳', description: '潮水退去后，小贝壳像灯一样闪亮。' },
  { id: 'rain-harbor', name: '听雨小港', icon: '⛵', souvenir: '蓝色船票', description: '港边的屋檐收集了一整天的雨声。' },
  { id: 'star-hill', name: '星茶山丘', icon: '✨', souvenir: '星点茶罐', description: '夜色里，山顶茶棚亮起温柔的灯。' },
  { id: 'cloud-orchard', name: '云朵果园', icon: '☁️', souvenir: '云形果签', description: '白云低低掠过树梢，果香随风散开。' },
].map(Object.freeze));

export const BAGS = Object.freeze([
  { id: 'forest', name: '山野饭团', description: '循着草木香，去苔邮小站或蕨影木桥。', placeIds: Object.freeze(['moss-post', 'fern-bridge']) },
  { id: 'coast', name: '海盐便当', description: '沿着海风，去贝灯浅湾或听雨小港。', placeIds: Object.freeze(['shell-bay', 'rain-harbor']) },
  { id: 'sky', name: '星光茶包', description: '追着云与星，去星茶山丘或云朵果园。', placeIds: Object.freeze(['star-hill', 'cloud-orchard']) },
].map(Object.freeze));

export const DURATIONS = Object.freeze([
  { id: 'first', name: '初旅 · 1 分钟', durationMs: 60_000 },
  { id: 'stroll', name: '漫游 · 25 分钟', durationMs: 1_500_000 },
  { id: 'far', name: '远行 · 60 分钟', durationMs: 3_600_000 },
].map(Object.freeze));

const MAX_TIME = 8_640_000_000_000_000;
function fail(message) { throw new Error(message); }
function timestamp(value) {
  if (!Number.isSafeInteger(value) || value < 0 || value > MAX_TIME) fail('时间必须是有效的非负整数。');
}
function string(value, max, label, nonempty = false) {
  if (typeof value !== 'string' || value.length > max || (nonempty && !value.trim()) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(value)) fail(`${label}格式或长度无效。`);
}
function identifier(value) {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(value)) fail('旅行编号无效。');
}
function object(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) fail('存档对象无效。');
  if (Object.keys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key))) fail('存档字段无效。');
}
function destination(value) {
  identifier(value.id);
  const bag = BAGS.find(item => item.id === value.bagId);
  if (!bag || !bag.placeIds.includes(value.placeId)) fail('目的地与行囊不匹配。');
  string(value.theme, 80, '旅行主题');
}

export function freshState() { return { version: 1, trip: null, cards: [] }; }

export function validateState(state) {
  object(state, ['version', 'trip', 'cards']);
  if (state.version !== 1 || !Array.isArray(state.cards) || state.cards.length > 200) fail('存档版本或卡片数量无效。');
  const ids = new Set();
  for (const card of state.cards) {
    object(card, ['id', 'placeId', 'bagId', 'theme', 'returnedAt', 'story', 'ai']);
    destination(card);
    timestamp(card.returnedAt);
    string(card.story, 2000, '明信片正文', true);
    if (typeof card.ai !== 'boolean' || ids.has(card.id)) fail('卡片标记或编号无效。');
    ids.add(card.id);
  }
  if (state.trip !== null) {
    object(state.trip, ['id', 'startedAt', 'returnAt', 'placeId', 'bagId', 'theme']);
    destination(state.trip);
    timestamp(state.trip.startedAt);
    timestamp(state.trip.returnAt);
    if (!DURATIONS.some(item => item.durationMs === state.trip.returnAt - state.trip.startedAt) || ids.has(state.trip.id)) fail('旅行时长或编号无效。');
  }
  return state;
}

export function startTrip(state, { bagId, durationMs, theme = '' }, now, id, random = Math.random) {
  validateState(state);
  timestamp(now);
  identifier(id);
  string(theme, 80, '旅行主题');
  if (state.trip) fail('小蛙还在旅行中。');
  if (state.cards.some(card => card.id === id)) fail('旅行编号重复。');
  const bag = BAGS.find(item => item.id === bagId);
  if (!bag || !DURATIONS.some(item => item.durationMs === durationMs)) fail('请选择有效的行囊与时长。');
  timestamp(now + durationMs);
  const unseen = bag.placeIds.filter(placeId => !state.cards.some(card => card.placeId === placeId));
  const choices = unseen.length ? unseen : bag.placeIds;
  const roll = random();
  if (typeof roll !== 'number' || !Number.isFinite(roll) || roll < 0 || roll >= 1) fail('随机数必须在 0（含）至 1（不含）之间。');
  return { ...state, trip: { id, startedAt: now, returnAt: now + durationMs, placeId: choices[Math.floor(roll * choices.length)], bagId, theme: theme.trim() } };
}

export function settleTrip(state, now) {
  validateState(state);
  timestamp(now);
  if (!state.trip || now < state.trip.returnAt) return state;
  const trip = state.trip;
  const place = PLACES.find(item => item.id === trip.placeId);
  const card = {
    id: trip.id, placeId: trip.placeId, bagId: trip.bagId, theme: trip.theme,
    returnedAt: trip.returnAt,
    story: `今天走到了${place.name}。${place.description}我坐下来歇了歇，把这份${place.souvenir}收进行囊，想带回来给你看看。路上的风很轻，回家的路也很近。`,
    ai: false,
  };
  return { ...state, trip: null, cards: [...state.cards, card].slice(-200) };
}

export function updateCardStory(state, cardId, story) {
  validateState(state);
  identifier(cardId);
  string(story, 2000, '明信片正文', true);
  if (!state.cards.some(card => card.id === cardId)) fail('没有找到这张明信片。');
  return { ...state, cards: state.cards.map(card => card.id === cardId ? { ...card, story: story.trim(), ai: true } : card) };
}

export function remainingMs(state, now) {
  validateState(state);
  timestamp(now);
  if (!state.trip) return 0;
  return Math.max(0, state.trip.returnAt - Math.max(now, state.trip.startedAt));
}
