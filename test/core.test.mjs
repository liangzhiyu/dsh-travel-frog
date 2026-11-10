import test from 'node:test';
import assert from 'node:assert/strict';
import { BAGS, PLACES, DURATIONS, freshState, validateState, startTrip, prepareTrip, settleTrip, updateCardStory, remainingMs } from '../core.js';

const start = (state = freshState(), now = 1000, id = 'trip-1', extra = {}) => startTrip(state, { bagId: 'forest', durationMs: 60_000, theme: '', ...extra }, now, id, () => 0);

test('six destinations are partitioned by three meaningful bags', () => {
  assert.equal(PLACES.length, 6);
  assert.equal(BAGS.length, 3);
  assert.equal(new Set(BAGS.flatMap(bag => bag.placeIds)).size, 6);
  for (const bag of BAGS) assert.ok(bag.placeIds.includes(start(freshState(), 0, 'a', { bagId: bag.id }).trip.placeId));
  assert.deepEqual(DURATIONS.map(item => item.durationMs), [60_000, 1_500_000, 3_600_000]);
});

test('trip completes once after offline jump without mutating original', () => {
  const original = freshState();
  const traveling = start(original);
  assert.equal(original.trip, null);
  assert.equal(settleTrip(traveling, 60_999), traveling);
  const result = settleTrip(traveling, 99_000_000);
  assert.equal(result.trip, null);
  assert.equal(result.cards.length, 1);
  assert.equal(result.cards[0].returnedAt, 61_000);
  assert.equal(result.cards[0].ai, false);
  assert.ok(result.cards[0].story.length > 30);
  assert.equal(settleTrip(result, 99_000_001), result);
  assert.equal(traveling.cards.length, 0);
});

test('clock rollback does not return early or extend displayed duration', () => {
  const state = start();
  assert.equal(remainingMs(state, 0), 60_000);
  assert.equal(settleTrip(state, 0), state);
  assert.equal(remainingMs(state, 31_000), 30_000);
  assert.equal(remainingMs(state, 100_000), 0);
  assert.equal(remainingMs(freshState(), 0), 0);
});

test('unseen destinations take priority within chosen bag', () => {
  const first = settleTrip(start(), 61_000);
  const second = start(first, 62_000, 'trip-2');
  assert.notEqual(first.cards[0].placeId, second.trip.placeId);
  assert.ok(BAGS[0].placeIds.includes(second.trip.placeId));
});

test('collection keeps latest 200 cards', () => {
  let state = freshState();
  for (let i = 0; i < 205; i++) state = settleTrip(start(state, i * 60_000, `trip-${i}`), (i + 1) * 60_000);
  assert.equal(state.cards.length, 200);
  assert.equal(state.cards[0].id, 'trip-5');
  assert.equal(state.cards.at(-1).id, 'trip-204');
  assert.equal(validateState(state), state);
});

test('manual AI story updates one existing card immutably', () => {
  const state = settleTrip(start(), 61_000);
  const changed = updateCardStory(state, 'trip-1', '  一阵风送来了新的故事。  ');
  assert.equal(changed.cards[0].story, '一阵风送来了新的故事。');
  assert.equal(changed.cards[0].ai, true);
  assert.equal(state.cards[0].ai, false);
  assert.throws(() => updateCardStory(state, 'missing', '故事'));
  assert.throws(() => updateCardStory(state, 'trip-1', ' '.repeat(10)));
  assert.throws(() => updateCardStory(state, 'trip-1', '字'.repeat(2001)));
});

test('strict import rejects corrupt shapes, timestamps, IDs and fields', () => {
  const cardState = settleTrip(start(), 61_000);
  const bad = [null, [], {}, { ...freshState(), version: 2 }, { ...freshState(), secret: 'x' }, { ...freshState(), cards: Array(201).fill(cardState.cards[0]) }, { ...cardState, cards: [cardState.cards[0], cardState.cards[0]] }];
  for (const value of [NaN, Infinity, -1, 0.5, '1000']) bad.push({ ...start(), trip: { ...start().trip, startedAt: value } });
  for (const patch of [{ returnAt: 1000 }, { placeId: 'shell-bay' }, { id: '<script>' }, { theme: 'x'.repeat(81) }]) bad.push({ ...start(), trip: { ...start().trip, ...patch } });
  for (const patch of [{ ai: 'false' }, { story: '' }, { returnedAt: Infinity }, { story: 'x'.repeat(2001) }]) bad.push({ ...cardState, cards: [{ ...cardState.cards[0], ...patch }] });
  bad.push({ ...start(), cards: cardState.cards });
  for (const value of bad) assert.throws(() => validateState(value));
  assert.deepEqual(validateState(JSON.parse(JSON.stringify(cardState))), cardState);
});

test('start rejects invalid and overlong inputs without changing state', () => {
  assert.throws(() => start(start()));
  assert.throws(() => start(freshState(), 0, 'id', { theme: 'x'.repeat(81) }));
  assert.throws(() => start(freshState(), 0, 'id', { durationMs: 1 }));
  assert.throws(() => start(freshState(), 0, 'id', { bagId: 'unknown' }));
  assert.throws(() => start(freshState(), 8_640_000_000_000_000));
  for (const random of [-1, 1, NaN, Infinity]) assert.throws(() => startTrip(freshState(), { bagId: 'forest', durationMs: 60_000 }, 0, 'id', () => random));
  assert.throws(() => start(settleTrip(start(), 61_000)));
});

test('a packed lunch departs on its own and keeps the chosen session on the postcard', () => {
  const original = freshState();
  const packed = prepareTrip(original, { sessionId: 'session-a', note: ' 验证断网重试 ' }, 1000, 'linked', () => 0);
  assert.equal(packed.trip.startedAt, 9000);
  assert.equal(packed.trip.returnAt, 69000);
  assert.equal(settleTrip(packed, 8999), packed);
  const returned = settleTrip(packed, 70000);
  assert.equal(returned.cards[0].sessionId, 'session-a');
  assert.equal(returned.cards[0].note, '验证断网重试');
  assert.equal(settleTrip(returned, 71000), returned);
  assert.equal(original.trip, null);
  assert.throws(() => prepareTrip(original, { sessionId: 'https://example.org' }, 1000, 'invalid', () => 0));
});

test('unlinked travel can follow an existing v1 postcard', () => {
  const legacy = settleTrip(start(), 61000);
  const packed = prepareTrip(legacy, {}, 62000, 'unlinked', () => 0);
  assert.equal(packed.trip.returnAt - packed.trip.startedAt, 1_500_000);
  const returned = settleTrip(packed, packed.trip.returnAt);
  assert.deepEqual(returned.cards[0], legacy.cards[0]);
  assert.equal(Object.hasOwn(returned.cards[1], 'sessionId'), false);
  assert.equal(Object.hasOwn(returned.cards[1], 'note'), false);
});
