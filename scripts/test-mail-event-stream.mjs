import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "../apps/web/mindforge-web/node_modules/typescript/lib/typescript.js";

const source = await readFile(
  new URL(
    "../apps/web/mindforge-web/src/context/mail-context/mail-event-stream.ts",
    import.meta.url,
  ),
  "utf8",
);
const compiled =
  ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText + "\n//# sourceURL=mail-event-stream.js";
const { startMailEventStream } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
);
const flush = () => new Promise((resolve) => setImmediate(resolve));

function environment(t, fetcher) {
  const originals = new Map();
  const replace = (name, value) => {
    originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, {
      configurable: true,
      writable: true,
      value,
    });
  };
  const browser = new EventTarget();
  const document = new EventTarget();
  document.visibilityState = "hidden";
  const timers = new Map();
  let nextTimer = 0;
  let now = 1000;
  const realNow = Date.now;
  const realRandom = Math.random;
  Date.now = () => now;
  Math.random = () => 0;
  replace("window", browser);
  replace("document", document);
  replace("navigator", { onLine: true });
  replace("fetch", fetcher);
  replace("setTimeout", (callback, delay = 0) => {
    const id = ++nextTimer;
    timers.set(id, { callback, at: now + delay });
    return id;
  });
  replace("clearTimeout", (id) => timers.delete(id));
  t.after(() => {
    for (const stop of t.mailStops ?? []) stop();
    Date.now = realNow;
    Math.random = realRandom;
    for (const [name, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  });
  return {
    browser,
    document,
    timers,
    elapseWithoutTimers(milliseconds) {
      now += milliseconds;
    },
    async advance(milliseconds) {
      const until = now + milliseconds;
      while (true) {
        const entry = [...timers]
          .filter(([, timer]) => timer.at <= until)
          .sort((a, b) => a[1].at - b[1].at)[0];
        if (!entry) break;
        const [id, timer] = entry;
        timers.delete(id);
        now = timer.at;
        timer.callback();
        await flush();
      }
      now = until;
      await flush();
    },
  };
}

function stream(text, size = 1, close = false) {
  let controller;
  let cancelled = false;
  const bytes = new TextEncoder().encode(text);
  const body = new ReadableStream({
    start(value) {
      controller = value;
      for (let offset = 0; offset < bytes.length; offset += size) {
        value.enqueue(bytes.slice(offset, offset + size));
      }
      if (close) value.close();
    },
    cancel() {
      cancelled = true;
    },
  });
  return {
    response: new Response(body, {
      headers: { "content-type": "text/event-stream;charset=UTF-8" },
    }),
    push(text) {
      controller.enqueue(new TextEncoder().encode(text));
    },
    close() {
      controller.close();
    },
    get cancelled() {
      return cancelled;
    },
  };
}

function subscribe(t, options = {}) {
  const received = [];
  const states = [];
  const stop = startMailEventStream({
    url: "/mail/events",
    token: "test-token",
    onMessage: (message) => received.push(message),
    onConnectionChange: (connected) => states.push(connected),
    ...options,
  });
  (t.mailStops ??= []).push(stop);
  return { received, states, stop };
}

test("reads authenticated SSE in a hidden tab across UTF-8, CRLF and multiline chunk boundaries", async (t) => {
  const body = stream(
    ': ping\r\nevent: mail\r\ndata: {"unreadCount":\r\ndata: 7,"revision":42,"note":"你好🌍"}\r\n\r\n',
  );
  let request;
  environment(t, async (url, options) => {
    request = { url, ...options };
    return body.response;
  });
  const subscription = subscribe(t);
  await flush();
  assert.deepEqual(subscription.received, [
    { unreadCount: 7, revision: 42, note: "你好🌍" },
  ]);
  assert.deepEqual(subscription.states, [true]);
  assert.equal(request.url, "/mail/events");
  assert.equal(request.headers.Authorization, "Bearer test-token");
  assert.equal(request.headers.Accept, "text/event-stream");
  assert.equal(request.cache, "no-store");
  subscription.stop();
  await flush();
  assert.equal(body.cancelled, true);
  assert.equal(request.signal.aborted, true);
  assert.deepEqual(subscription.states, [true, false]);
});

test("ignores malformed, incomplete, unrelated and unsafe snapshots without losing the connection", async (t) => {
  const body = stream(
    [
      "event: mail\ndata: invalid\n\n",
      'event: other\ndata: {"unreadCount":99,"revision":1}\n\n',
      'event: mail\ndata: {"unreadCount":-1,"revision":1}\n\n',
      'event: mail\ndata: {"unreadCount":1.5,"revision":1}\n\n',
      'event: mail\ndata: {"unreadCount":"2","revision":1}\n\n',
      'event: mail\ndata: {"unreadCount":2,"revision":9007199254740992}\n\n',
      'event: mail\ndata: {"unreadCount":0,"revision":9}\n\n',
      'event: mail\ndata: {"unreadCount":99,"revision":10}',
    ].join(""),
    17,
  );
  environment(t, async () => body.response);
  const subscription = subscribe(t);
  await flush();
  assert.deepEqual(subscription.received, [{ unreadCount: 0, revision: 9 }]);
  assert.deepEqual(subscription.states, [true]);
  body.close();
  await flush();
  assert.deepEqual(subscription.received, [{ unreadCount: 0, revision: 9 }]);
});

test("retries disconnected streams quietly and an online event immediately replaces the retry", async (t) => {
  const first = stream(
    'event: mail\ndata: {"unreadCount":1,"revision":1}\n\n',
    100,
    true,
  );
  const second = stream(
    'event: mail\ndata: {"unreadCount":2,"revision":2}\n\n',
    100,
  );
  let requests = 0;
  const runtime = environment(t, async () =>
    ++requests === 1 ? first.response : second.response,
  );
  const subscription = subscribe(t);
  await flush();
  assert.equal(requests, 1);
  assert.deepEqual(subscription.states, [true, false]);
  await runtime.advance(799);
  assert.equal(requests, 1);
  runtime.browser.dispatchEvent(new Event("online"));
  await flush();
  assert.equal(requests, 2);
  assert.deepEqual(subscription.received, [
    { unreadCount: 1, revision: 1 },
    { unreadCount: 2, revision: 2 },
  ]);
  assert.deepEqual(subscription.states, [true, false, true]);
  await runtime.advance(1000);
  assert.equal(requests, 2);
});

test("applies bounded exponential backoff to failing requests", async (t) => {
  let requests = 0;
  const runtime = environment(t, async () => {
    requests++;
    throw new TypeError("offline");
  });
  const subscription = subscribe(t);
  await flush();
  assert.equal(requests, 1);
  const delays = [800, 1600, 3200, 6400, 12800, 24000, 24000];
  for (let index = 0; index < delays.length; index++) {
    await runtime.advance(delays[index] - 1);
    assert.equal(requests, index + 1);
    await runtime.advance(1);
    assert.equal(requests, index + 2);
  }
  subscription.stop();
  assert.equal(runtime.timers.size, 0);
});

test("stops permanently after a 401 and releases timers and event listeners", async (t) => {
  let requests = 0;
  let unauthorized = 0;
  const runtime = environment(t, async () => {
    requests++;
    return new Response("", { status: 401 });
  });
  const subscription = subscribe(t, { onUnauthorized: () => unauthorized++ });
  await flush();
  assert.equal(unauthorized, 1);
  assert.equal(runtime.timers.size, 0);
  runtime.browser.dispatchEvent(new Event("online"));
  runtime.browser.dispatchEvent(new Event("focus"));
  runtime.document.dispatchEvent(new Event("visibilitychange"));
  await runtime.advance(100000);
  assert.equal(requests, 1);
  assert.deepEqual(subscription.received, []);
});

test("replaces a stalled initial request and ignores a late response from the cancelled request", async (t) => {
  let resolveFirst;
  let firstSignal;
  let requests = 0;
  const currentBody = stream(
    'event: mail\ndata: {"unreadCount":3,"revision":3}\n\n',
    100,
  );
  const staleBody = stream(
    'event: mail\ndata: {"unreadCount":99,"revision":1}\n\n',
    100,
  );
  const runtime = environment(t, (_url, options) => {
    requests++;
    if (requests === 1) {
      firstSignal = options.signal;
      return new Promise((resolve) => {
        resolveFirst = resolve;
      });
    }
    return Promise.resolve(currentBody.response);
  });
  const subscription = subscribe(t);
  await runtime.advance(45000);
  assert.equal(firstSignal.aborted, true);
  assert.equal(requests, 2);
  resolveFirst(staleBody.response);
  await flush();
  assert.deepEqual(subscription.received, [{ unreadCount: 3, revision: 3 }]);
  assert.equal(staleBody.cancelled, true);
});

test("heartbeats keep the connection alive while cleanup prevents later reconnects and callbacks", async (t) => {
  const body = stream(": ping\n\n", 100);
  let requests = 0;
  const runtime = environment(t, async () => {
    requests++;
    return body.response;
  });
  const subscription = subscribe(t);
  await flush();
  await runtime.advance(40000);
  body.push(": still alive\n\n");
  await flush();
  await runtime.advance(40000);
  assert.equal(requests, 1);
  subscription.stop();
  await flush();
  assert.equal(runtime.timers.size, 0);
  runtime.browser.dispatchEvent(new Event("online"));
  await runtime.advance(100000);
  assert.equal(requests, 1);
  assert.deepEqual(subscription.received, []);
});

test("visibility changes retain a healthy connection and focus recovers a connection stalled during sleep", async (t) => {
  const bodies = [
    stream(": ping\n\n", 100),
    stream('event: mail\ndata: {"unreadCount":4,"revision":4}\n\n', 100),
  ];
  let requests = 0;
  const runtime = environment(t, async () => bodies[requests++].response);
  const subscription = subscribe(t);
  await flush();
  runtime.document.dispatchEvent(new Event("visibilitychange"));
  await flush();
  assert.equal(requests, 1);
  runtime.elapseWithoutTimers(46000);
  runtime.browser.dispatchEvent(new Event("focus"));
  await flush();
  assert.equal(requests, 2);
  assert.equal(bodies[0].cancelled, true);
  assert.deepEqual(subscription.received, [{ unreadCount: 4, revision: 4 }]);
});

test("rejects buffered non-SSE responses and oversized events before applying a snapshot", async (t) => {
  let requests = 0;
  const oversized = stream(
    `event: mail\ndata: ${"x".repeat(65537)}\n\n`,
    65536,
  );
  const runtime = environment(t, async () => {
    requests++;
    return requests === 1
      ? new Response("{}", { headers: { "content-type": "application/json" } })
      : oversized.response;
  });
  const subscription = subscribe(t);
  await flush();
  assert.deepEqual(subscription.states, []);
  await runtime.advance(800);
  assert.equal(requests, 2);
  assert.equal(oversized.cancelled, true);
  assert.deepEqual(subscription.received, []);
  assert.deepEqual(subscription.states, [true, false]);
});
