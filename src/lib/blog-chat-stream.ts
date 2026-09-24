/** Stateful SSE decoding: neither UTF-8 characters nor events align with network chunks. */
export function createSseDecoder(onData: (data: string) => void) {
  const decoder = new TextDecoder();
  let buffer = '';
  let data: string[] = [];
  let eventSize = 0;
  function line(value: string) {
    if (!value) {
      if (data.length) onData(data.join('\n'));
      data = [];
      eventSize = 0;
    } else if (value.startsWith('data:')) {
      eventSize += value.length;
      if (eventSize > 65536) throw new Error('AI 回复格式异常');
      data.push(value.slice(5).replace(/^ /, ''));
    }
  }
  function drain(final: boolean) {
    let match: RegExpExecArray | null;
    while ((match = /\r\n|\r|\n/.exec(buffer))) {
      if (!final && match[0] === '\r' && match.index === buffer.length - 1) break;
      line(buffer.slice(0, match.index));
      buffer = buffer.slice(match.index + match[0].length);
    }
    if (buffer.length + data.join('\n').length > 65536) throw new Error('AI 回复格式异常');
    if (final) {
      if (buffer) line(buffer);
      buffer = '';
      line('');
    }
  }
  return {
    push(chunk: Uint8Array) { buffer += decoder.decode(chunk, { stream: true }); drain(false); },
    finish() { buffer += decoder.decode(); drain(true); },
  };
}
export function readChatEvent(data: string): { text?: string; error?: string; done?: boolean } {
  if (data === '[DONE]') return { done: true };
  const event = JSON.parse(data) as { choices?: { delta?: { content?: unknown } }[]; error?: { message?: string } | string };
  if (event.error) return { error: typeof event.error === 'string' ? event.error : event.error.message || 'AI 暂时无法回答' };
  const content = event.choices?.[0]?.delta?.content;
  return typeof content === 'string' ? { text: content } : {};
}
