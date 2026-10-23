export interface MailEventSnapshot {
  unreadCount: number;
  revision: number;
}

interface MailEventStreamOptions {
  url: string;
  token: string;
  onMessage: (snapshot: MailEventSnapshot) => void;
  onConnectionChange: (connected: boolean) => void;
  onUnauthorized?: () => void;
}

const HEARTBEAT_TIMEOUT = 45_000;
const MAX_EVENT_LENGTH = 64 * 1024;

/** An authenticated, cancellable connection that stays active in background tabs. */
export function startMailEventStream(options: MailEventStreamOptions): () => void {
  let active = true;
  let connected = false;
  let failures = 0;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let watchdogTimer: ReturnType<typeof setTimeout> | undefined;
  let current:
    { controller: AbortController; reader?: ReadableStreamDefaultReader<Uint8Array> } | undefined;

  const setConnected = (value: boolean) => {
    if (connected === value) return;
    connected = value;
    options.onConnectionChange(value);
  };
  const clearTimers = () => {
    clearTimeout(retryTimer);
    clearTimeout(watchdogTimer);
    retryTimer = undefined;
    watchdogTimer = undefined;
  };
  const cancelCurrent = () => {
    const previous = current;
    current = undefined;
    previous?.controller.abort();
    void previous?.reader?.cancel().catch(() => undefined);
  };
  const stop = () => {
    if (!active) return;
    active = false;
    clearTimers();
    cancelCurrent();
    window.removeEventListener('online', reconnect);
    window.removeEventListener('focus', checkConnection);
    document.removeEventListener('visibilitychange', checkConnection);
    setConnected(false);
  };
  let lastActivityAt = Date.now();
  const reconnect = () => {
    if (!active) return;
    clearTimers();
    cancelCurrent();
    setConnected(false);
    void connect();
  };
  const checkConnection = () => {
    if (active && Date.now() - lastActivityAt >= HEARTBEAT_TIMEOUT) reconnect();
  };
  const retry = () => {
    if (!active) return;
    const delay = Math.min(30_000, 1000 * 2 ** Math.min(failures++, 5));
    retryTimer = setTimeout(reconnect, delay * (0.8 + Math.random() * 0.2));
  };

  const connect = async () => {
    if (!active) return;
    if (!navigator.onLine) {
      retry();
      return;
    }
    const request = {
      controller: new AbortController(),
      reader: undefined as ReadableStreamDefaultReader<Uint8Array> | undefined,
    };
    current = request;
    const isCurrent = () => active && current === request;
    const heartbeat = () => {
      lastActivityAt = Date.now();
      clearTimeout(watchdogTimer);
      watchdogTimer = setTimeout(() => {
        if (isCurrent()) reconnect();
      }, HEARTBEAT_TIMEOUT);
    };
    heartbeat();
    try {
      const response = await fetch(options.url, {
        headers: { Accept: 'text/event-stream', Authorization: `Bearer ${options.token}` },
        cache: 'no-store',
        signal: request.controller.signal,
      });
      if (!isCurrent()) {
        void response.body?.cancel().catch(() => undefined);
        return;
      }
      if (response.status === 401) {
        void response.body?.cancel().catch(() => undefined);
        stop();
        options.onUnauthorized?.();
        return;
      }
      if (
        !response.ok ||
        !response.body ||
        !response.headers.get('content-type')?.toLowerCase().includes('text/event-stream')
      ) {
        void response.body?.cancel().catch(() => undefined);
        return;
      }
      request.reader = response.body.getReader();
      setConnected(true);
      const decoder = new TextDecoder();
      let buffer = '';
      let event = 'message';
      let data: string[] = [];
      let eventLength = 0;
      const dispatch = () => {
        if (event === 'mail' && data.length) {
          let parsed: unknown;
          try {
            parsed = JSON.parse(data.join('\n'));
          } catch {
            // Ignore a malformed frame without replacing the last successful badge.
          }
          if (typeof parsed === 'object' && parsed !== null) {
            const snapshot = parsed as Partial<MailEventSnapshot>;
            if (
              Number.isSafeInteger(snapshot.unreadCount) &&
              (snapshot.unreadCount ?? -1) >= 0 &&
              Number.isSafeInteger(snapshot.revision) &&
              (snapshot.revision ?? -1) >= 0 &&
              isCurrent()
            ) {
              failures = 0;
              options.onMessage(snapshot as MailEventSnapshot);
            }
          }
        }
        event = 'message';
        data = [];
        eventLength = 0;
      };
      const line = (value: string) => {
        if (!value) return dispatch();
        if (value.startsWith(':')) return;
        const separator = value.indexOf(':');
        const field = separator < 0 ? value : value.slice(0, separator);
        const content = separator < 0 ? '' : value.slice(separator + 1).replace(/^ /, '');
        if (field === 'event') event = content;
        if (field === 'data') {
          eventLength += content.length;
          if (eventLength > MAX_EVENT_LENGTH) throw new Error('Mail event is too large');
          data.push(content);
        }
      };
      while (isCurrent()) {
        const { value, done } = await request.reader.read();
        if (!isCurrent()) return;
        if (done) break;
        heartbeat();
        buffer += decoder.decode(value, { stream: true });
        let newline: number;
        while (isCurrent() && (newline = buffer.indexOf('\n')) >= 0) {
          line(buffer.slice(0, newline).replace(/\r$/, ''));
          buffer = buffer.slice(newline + 1);
        }
        if (buffer.length > MAX_EVENT_LENGTH) throw new Error('Mail event is too large');
      }
      // Incomplete frames are discarded on disconnect and never applied as a snapshot.
    } catch {
      // Reconnect quietly; the provider retains its last successful snapshot.
    } finally {
      await request.reader?.cancel().catch(() => undefined);
      request.reader?.releaseLock();
      if (isCurrent()) {
        current = undefined;
        clearTimeout(watchdogTimer);
        watchdogTimer = undefined;
        setConnected(false);
        retry();
      }
    }
  };

  window.addEventListener('online', reconnect);
  window.addEventListener('focus', checkConnection);
  document.addEventListener('visibilitychange', checkConnection);
  void connect();
  return stop;
}
