const pendingSaves = new Map<number, Promise<void>>();

/** Preserve each drawing's save order, including saves from an editor that was just closed. */
export function queueDrawingSave(id: number, operation: () => Promise<void>): Promise<void> {
  const previous = pendingSaves.get(id) ?? Promise.resolve();
  const pending = previous.catch(() => undefined).then(operation);
  pendingSaves.set(id, pending);

  const clear = () => {
    if (pendingSaves.get(id) === pending) pendingSaves.delete(id);
  };
  void pending.then(clear, clear);
  return pending;
}
