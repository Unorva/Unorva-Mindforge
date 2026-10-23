import assert from "node:assert/strict";
import test from "node:test";
import {
  createEmptyDrawing,
  isDrawingNote,
  MAX_DRAWING_CONTENT_LENGTH,
  validateDrawingContent,
} from "../apps/web/mindforge-web/src/components/apps/notes/note-drawing.ts";
import { queueDrawingSave } from "../apps/web/mindforge-web/src/components/apps/notes/drawing-save-queue.ts";

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

test("creates a standard empty Excalidraw scene", () => {
  const content = createEmptyDrawing();
  assert.deepEqual(JSON.parse(content), {
    type: "excalidraw",
    version: 2,
    source: "https://excalidraw.com",
    elements: [],
    appState: { viewBackgroundColor: "#ffffff" },
    files: {},
  });
  assert.doesNotThrow(() => validateDrawingContent(content));
});

test("recognizes drawing filenames regardless of extension case and outer whitespace", () => {
  for (const title of [
    "草图.excalidraw",
    "FLOW.EXCALIDRAW",
    "  设计.Excalidraw  ",
  ]) {
    assert.equal(isDrawingNote(title), true, title);
  }
  for (const title of ["记录.md", "diagram.excalidraw.md", "excalidraw", ""]) {
    assert.equal(isDrawingNote(title), false, title);
  }
});

test("rejects malformed JSON and unrelated JSON documents", () => {
  assert.throws(() => validateDrawingContent("not JSON"), SyntaxError);
  for (const scene of [
    null,
    [],
    "excalidraw",
    {},
    { type: "other", elements: [] },
    { type: "excalidraw" },
    { type: "excalidraw", elements: {} },
  ]) {
    assert.throws(
      () => validateDrawingContent(JSON.stringify(scene)),
      /有效的.*excalidraw/,
    );
  }
});

test("accepts the 4M content boundary and rejects a larger scene before parsing", () => {
  assert.equal(MAX_DRAWING_CONTENT_LENGTH, 4_000_000);
  const base = createEmptyDrawing();
  const maximum = base + " ".repeat(MAX_DRAWING_CONTENT_LENGTH - base.length);
  assert.equal(maximum.length, MAX_DRAWING_CONTENT_LENGTH);
  assert.doesNotThrow(() => validateDrawingContent(maximum));
  assert.throws(() => validateDrawingContent(maximum + " "), /4,000,000/);
  assert.throws(
    () => validateDrawingContent("x".repeat(MAX_DRAWING_CONTENT_LENGTH + 1)),
    /4,000,000/,
  );
});

test(
  "serializes overlapping saves for the same note in submission order",
  { timeout: 5000 },
  async () => {
    const firstStarted = deferred();
    const releaseFirst = deferred();
    const secondStarted = deferred();
    const releaseSecond = deferred();
    const events = [];

    const first = queueDrawingSave(101, async () => {
      events.push("first:start");
      firstStarted.resolve();
      await releaseFirst.promise;
      events.push("first:finish");
    });
    const second = queueDrawingSave(101, async () => {
      events.push("second:start");
      secondStarted.resolve();
      await releaseSecond.promise;
      events.push("second:finish");
    });
    await firstStarted.promise;
    assert.deepEqual(events, ["first:start"]);
    releaseFirst.resolve();
    await secondStarted.promise;
    assert.deepEqual(events, ["first:start", "first:finish", "second:start"]);
    releaseSecond.resolve();
    await Promise.all([first, second]);
    assert.deepEqual(events, [
      "first:start",
      "first:finish",
      "second:start",
      "second:finish",
    ]);
  },
);

test(
  "reports a failed save and still runs the next save for that note",
  { timeout: 5000 },
  async () => {
    const releaseFirst = deferred();
    const events = [];
    const failure = new Error("保存失败");
    const first = queueDrawingSave(102, async () => {
      events.push("first");
      await releaseFirst.promise;
      throw failure;
    });
    const rejected = assert.rejects(first, (error) => error === failure);
    const second = queueDrawingSave(102, async () => {
      events.push("second");
    });
    releaseFirst.resolve();
    await Promise.all([rejected, second]);
    assert.deepEqual(events, ["first", "second"]);

    await queueDrawingSave(102, async () => {
      events.push("third");
    });
    assert.deepEqual(events, ["first", "second", "third"]);
  },
);

test(
  "allows saves for different notes to run independently",
  { timeout: 5000 },
  async () => {
    const firstStarted = deferred();
    const releaseFirst = deferred();
    let firstFinished = false;
    const first = queueDrawingSave(103, async () => {
      firstStarted.resolve();
      await releaseFirst.promise;
      firstFinished = true;
    });
    await firstStarted.promise;
    try {
      await queueDrawingSave(104, async () => {
        assert.equal(firstFinished, false);
      });
      assert.equal(firstFinished, false);
    } finally {
      releaseFirst.resolve();
      await first;
    }
  },
);
