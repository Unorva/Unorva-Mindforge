import assert from "node:assert/strict";
import test from "node:test";
import {
  clipboardImages,
  imageMarkdown,
  mapSourcePosition,
  MAX_IMAGE_SIZE,
  validateClipboardImage,
} from "../apps/web/mindforge-web/src/components/markdown/image-clipboard.ts";

test("clipboard images are uploaded once when items and files both contain them", () => {
  const image = new File(["png"], "截图.png", { type: "image/png" });
  const text = new File(["text"], "notes.txt", { type: "text/plain" });
  const item = (file) => ({
    kind: "file",
    type: file.type,
    getAsFile: () => file,
  });
  assert.deepEqual(
    clipboardImages({ items: [item(image), item(text)], files: [image, text] }),
    [image],
  );
  assert.deepEqual(clipboardImages({ items: [], files: [text, image] }), [
    image,
  ]);
  assert.deepEqual(clipboardImages({ items: [], files: [] }), []);
});

test("rejects unsupported, empty and oversized images before any request", () => {
  assert.throws(
    () =>
      validateClipboardImage(
        new File(["<svg/>"], "test.svg", { type: "image/svg+xml" }),
      ),
    /PNG/,
  );
  assert.throws(
    () =>
      validateClipboardImage(new File([], "empty.png", { type: "image/png" })),
    /为空/,
  );
  assert.throws(
    () =>
      validateClipboardImage(
        new File([new Uint8Array(MAX_IMAGE_SIZE + 1)], "large.png", {
          type: "image/png",
        }),
      ),
    /10 MB/,
  );
  assert.doesNotThrow(() =>
    validateClipboardImage(
      new File([new Uint8Array(MAX_IMAGE_SIZE)], "max.png", {
        type: "image/png",
      }),
    ),
  );
});

test("typing at the upload position preserves the image before the new text", () => {
  assert.equal(mapSourcePosition("beforeafter", "beforeTYPEafter", 6), 6);
  assert.equal(mapSourcePosition("beforeafter", "Xbeforeafter", 6), 7);
  assert.equal(mapSourcePosition("beforeafter", "beforeafterX", 6), 6);
});

test("deleting text next to the anchor moves it; deleting across it cancels it", () => {
  assert.equal(mapSourcePosition("abcDEF", "abDEF", 3), 2);
  assert.equal(mapSourcePosition("abcDEF", "abcEF", 3), 3);
  assert.equal(mapSourcePosition("abcDEF", "abEF", 3), null);
  assert.equal(mapSourcePosition("abcDEF", "", 3), null);
});

test("beforeinput positions disambiguate identical characters and backward deletion", () => {
  assert.equal(
    mapSourcePosition("aaaa", "aaaaa", 3, {
      from: 1,
      to: 1,
      inputType: "insertText",
    }),
    4,
  );
  assert.equal(
    mapSourcePosition("aaaa", "aaa", 3, {
      from: 2,
      to: 2,
      inputType: "deleteContentBackward",
    }),
    2,
  );
  assert.equal(
    mapSourcePosition("aaaa", "aa", 3, {
      from: 1,
      to: 3,
      inputType: "deleteContentBackward",
    }),
    1,
  );
});

test("selection ranges map in UTF-16 offsets used by the textarea", () => {
  const edit = { from: 0, to: 0, inputType: "insertText" };
  assert.equal(mapSourcePosition("你好🌍abc", "X你好🌍abc", 4, edit), 5);
  assert.equal(
    mapSourcePosition("abcdef", "abXYZef", 2, {
      from: 2,
      to: 4,
      inputType: "insertFromPaste",
    }),
    2,
  );
  assert.equal(
    mapSourcePosition("abcdef", "abXYZef", 4, {
      from: 2,
      to: 4,
      inputType: "insertFromPaste",
    }),
    5,
  );
});

test("clipboard filenames cannot break the generated Markdown image syntax", () => {
  assert.equal(
    imageMarkdown("截图.png", "/api/files/images/7/id.png"),
    "![截图.png](/api/files/images/7/id.png)",
  );
  assert.equal(
    imageMarkdown("a]\\[b\n.png", "/image.png"),
    "![a   b .png](/image.png)",
  );
});
