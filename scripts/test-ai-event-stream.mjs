import assert from 'node:assert/strict';
import test from 'node:test';
import { consumeEventStream } from '../apps/web/mindforge-web/src/api/ai/event-stream.ts';

function chunks(text, size = 1) {
  const bytes = new TextEncoder().encode(text);
  return new ReadableStream({
    start(controller) {
      for (let offset = 0; offset < bytes.length; offset += size) {
        controller.enqueue(bytes.slice(offset, offset + size));
      }
      controller.close();
    },
  });
}

test('preserves split UTF-8, CRLF and multiline events while ignoring heartbeats', async () => {
  const received = [];
  await consumeEventStream(
    chunks(': ping\r\nevent: content\r\ndata: {"delta":\r\ndata: "你好🌍"}\r\n\r\nevent: done\ndata: {}\n\n'),
    (event) => received.push(event),
  );
  assert.deepEqual(received, [
    { event: 'content', data: { delta: '你好🌍' } },
    { event: 'done', data: {} },
  ]);
});

test('flushes final event without a trailing blank line', async () => {
  const received = [];
  await consumeEventStream(chunks('event: reasoning\ndata: {"delta":"计算"}'), (event) => {
    received.push(event);
  });
  assert.deepEqual(received, [{ event: 'reasoning', data: { delta: '计算' } }]);
});

test('stops and cancels the reader after a done event', async () => {
  let cancelled = false;
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('event: done\ndata: {}\n\nevent: content\ndata: invalid\n\n'));
    },
    cancel() {
      cancelled = true;
    },
  });
  await consumeEventStream(body, () => false);
  assert.equal(cancelled, true);
});

test('rejects malformed JSON and oversized events', async () => {
  await assert.rejects(consumeEventStream(chunks('data: invalid\n\n'), () => {}), SyntaxError);
  await assert.rejects(
    consumeEventStream(chunks(`data: ${'x'.repeat(1024 * 1024 + 1)}\n\n`, 65536), () => {}),
    /最大长度/,
  );
});
