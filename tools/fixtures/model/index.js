import { LlmAdapter } from '@deepseek-ai/dsh-llm'

// Local, deterministic adapter. It has no network clients or credentials.
export const inject = ['llm']
const STORY = '我把饭团放在青石上，听了一会儿屋檐下的雨。邮局门口的小叶子晃来晃去，好像在向路过的人招手。回来的时候，我挑了一枚叶脉书签放进行囊，想把这一小段安静也寄给你。'
class TravelFixture extends LlmAdapter {
  providerInfo(provider) { return { id: provider, name: '旅行伙伴本地验证' } }
  async listModels(provider) { return [{ provider, id: 'fixture', name: 'Travel frog fixture' }] }
  async resolveModel(provider, model) {
    if (model !== 'fixture') throw new Error('Unknown fixture model')
    return { provider, id: model, name: 'Travel frog fixture', context: { contextWindow: 8192 }, defaultMaxTokens: 220 }
  }
  async *stream({ signal }) {
    signal?.throwIfAborted()
    yield { type: 'block-start', index: 0, blockType: 'text' }
    for (let offset = 0; offset < STORY.length; offset += 12) {
      signal?.throwIfAborted()
      yield { type: 'text-delta', index: 0, text: STORY.slice(offset, offset + 12) }
    }
    yield { type: 'block-end', index: 0, block: { type: 'text', text: STORY } }
    yield { type: 'usage', usage: { inputTokens: 32, outputTokens: STORY.length } }
    yield { type: 'finish', reason: { kind: 'stop' } }
  }
}
export function apply(ctx) {
  ctx.effect(() => ctx.llm.registerAdapter(['travel-frog-fixture'], new TravelFixture()))
}
