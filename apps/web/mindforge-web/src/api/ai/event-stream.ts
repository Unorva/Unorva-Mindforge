export interface ServerEvent {
  event: string;
  data: unknown;
}

/** Reads complete SSE events across arbitrary UTF-8 and network chunk boundaries. */
export async function consumeEventStream(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: ServerEvent) => boolean | void,
) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let event = 'message';
  let data: string[] = [];
  let eventLength = 0;
  let finished = false;

  const dispatch = () => {
    if (data.length) {
      const parsed: unknown = JSON.parse(data.join('\n'));
      finished = onEvent({ event, data: parsed }) === false;
    }
    event = 'message';
    data = [];
    eventLength = 0;
  };
  const line = (value: string) => {
    if (!value) {
      dispatch();
      return;
    }
    if (value.startsWith(':')) return;
    const separator = value.indexOf(':');
    const field = separator < 0 ? value : value.slice(0, separator);
    const content = separator < 0 ? '' : value.slice(separator + 1).replace(/^ /, '');
    if (field === 'event') event = content;
    if (field === 'data') {
      eventLength += content.length;
      if (eventLength > 1024 * 1024) throw new Error('AI 单条事件超过最大长度');
      data.push(content);
    }
  };

  try {
    while (!finished) {
      const { value, done } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      let newline: number;
      while (!finished && (newline = buffer.indexOf('\n')) >= 0) {
        line(buffer.slice(0, newline).replace(/\r$/, ''));
        buffer = buffer.slice(newline + 1);
      }
      if (buffer.length > 1024 * 1024) throw new Error('AI 单条事件超过最大长度');
      if (done) {
        if (!finished && buffer) line(buffer.replace(/\r$/, ''));
        if (!finished) dispatch();
        break;
      }
    }
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
