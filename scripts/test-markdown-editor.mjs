/**
 * Browser regression for Markdown clipboard images and save shortcuts.
 * Start the web app, then run:
 *   node scripts/test-markdown-editor.mjs http://127.0.0.1:5174
 * Uses an existing Playwright installation; PLAYWRIGHT_MODULE_PATH can point
 * to its package directory. All image requests and credentials are fixtures.
 */
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { setTimeout as delay } from "node:timers/promises";

const require = createRequire(import.meta.url);
function loadPlaywright() {
  try {
    return require("playwright");
  } catch {
    /* Use the desktop runtime if available. */
  }
  const candidates = [
    process.env.PLAYWRIGHT_MODULE_PATH,
    path.join(
      homedir(),
      ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
    ),
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (existsSync(candidate))
      return createRequire(path.join(candidate, "package.json"))("playwright");
  }
  throw new Error(
    "Playwright was not found. Set PLAYWRIGHT_MODULE_PATH to an existing installation.",
  );
}

const { chromium } = loadPlaywright();
const baseUrl = (
  process.argv[2] ||
  process.env.MARKDOWN_TEST_URL ||
  "http://127.0.0.1:5174"
).replace(/\/$/, "");
const storageKey = "mindforge-markdown-editor-preview";
const token = "markdown-browser-regression-fixture";
const pngBase64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aB1kAAAAASUVORK5CYII=";
const png = Buffer.from(pngBase64, "base64");
const browser = await chromium.launch({ headless: true });
const failures = [];
let passed = 0;

async function waitUntil(check, description, timeout = 8000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await check()) return;
    await delay(30);
  }
  throw new Error(`Timed out: ${description}`);
}

async function fixture(initial = "before after") {
  const context = await browser.newContext({
    permissions: ["clipboard-read", "clipboard-write"],
  });
  await context.addInitScript(
    ({ storageKey, initial, token }) => {
      if (localStorage.getItem(storageKey) === null)
        localStorage.setItem(storageKey, initial);
      localStorage.setItem("mindforge_access_token", token);
      window.__markdownSaves = [];
      const setItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        if (this === localStorage && key === storageKey)
          window.__markdownSaves.push(value);
        return setItem.call(this, key, value);
      };
    },
    { storageKey, initial, token },
  );
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const uploads = [];
  const reads = [];
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/files/images**", async (route) => {
    const request = route.request();
    if (request.method() === "POST") {
      const body = request.postDataBuffer()?.toString("latin1") || "";
      const name =
        /filename="([^"]+)"/.exec(body)?.[1] || `image-${uploads.length}.png`;
      let release;
      const gate = new Promise((resolve) => {
        release = resolve;
      });
      const upload = {
        name,
        headers: request.headers(),
        url: `/api/files/images/42/${String(uploads.length + 1).padStart(32, "0")}.png`,
        finish: (success = true) => release(success),
      };
      uploads.push(upload);
      const success = await gate;
      await route
        .fulfill({
          status: success ? 200 : 503,
          contentType: "application/json",
          body: JSON.stringify(
            success
              ? {
                  code: 200,
                  success: true,
                  data: {
                    url: upload.url,
                    name,
                    contentType: "image/png",
                    size: png.length,
                  },
                }
              : { code: 503, success: false, message: "fixture upload failed" },
          ),
        })
        .catch(() => {});
    } else {
      reads.push({ url: request.url(), headers: request.headers() });
      await route.fulfill({ status: 200, contentType: "image/png", body: png });
    }
  });
  await page.goto(`${baseUrl}/preview/markdown-editor`);
  try {
    await page.locator('[contenteditable="true"]').waitFor();
  } catch (error) {
    throw new Error(`${error.message}\nPage errors: ${errors.join("\n")}`);
  }
  const visual = page.getByLabel("Markdown 可视化编辑器", { exact: true });
  const source = page.getByLabel("Markdown 源码编辑器", { exact: true });
  const saved = () =>
    page.evaluate((key) => localStorage.getItem(key), storageKey);
  const saveCount = () => page.evaluate(() => window.__markdownSaves.length);
  return {
    context,
    page,
    visual,
    source,
    uploads,
    reads,
    errors,
    saved,
    saveCount,
  };
}

async function pasteImages(locator, names) {
  return locator.evaluate(
    (element, { names, pngBase64 }) => {
      const data = new DataTransfer();
      const bytes = Uint8Array.from(atob(pngBase64), (char) =>
        char.charCodeAt(0),
      );
      for (const name of names)
        data.items.add(new File([bytes], name, { type: "image/png" }));
      const event = new ClipboardEvent("paste", {
        clipboardData: data,
        bubbles: true,
        cancelable: true,
      });
      element.dispatchEvent(event);
      return event.defaultPrevented;
    },
    { names, pngBase64 },
  );
}

async function sourceMode(f) {
  await f.page.getByRole("tab", { name: "Markdown 源码", exact: true }).click();
  await f.source.waitFor();
}

async function test(name, callback) {
  let f;
  try {
    f = await fixture();
    await callback(f);
    assert.deepEqual(f.errors, [], "no uncaught browser errors");
    passed++;
    console.log(`PASS ${name}`);
  } catch (error) {
    failures.push({ name, message: error.stack || error.message });
    console.error(`FAIL ${name}\n${error.stack || error.message}`);
  } finally {
    if (f) {
      f.uploads.forEach((upload) => upload.finish(false));
      await f.context.close();
    }
  }
}

try {
  await test("visual paste keeps typing, blocks pending save, reloads stable authenticated images", async (f) => {
    await f.visual.click();
    await f.visual.press("Control+End");
    assert.equal(await pasteImages(f.visual, ["visual.png"]), true);
    await waitUntil(() => f.uploads.length === 1, "visual upload starts");
    assert.equal(f.uploads[0].headers.authorization, `Bearer ${token}`);
    assert.match(
      f.uploads[0].headers["content-type"],
      /^multipart\/form-data; boundary=/,
    );
    assert.equal(
      await f.page
        .getByRole("button", { name: "保存", exact: true })
        .isDisabled(),
      true,
    );
    assert.equal(
      await f.page
        .getByRole("tab", { name: "Markdown 源码", exact: true })
        .isDisabled(),
      true,
    );
    await f.visual.press("Control+s");
    await f.visual.press("End");
    await f.page.keyboard.insertText(" typed-while-pending");
    assert.equal(await f.saveCount(), 0);
    f.uploads[0].finish();
    await f.page.locator(".markdown-image-view img:not([hidden])").waitFor();
    assert.match(await f.visual.innerText(), /typed-while-pending/);
    await f.visual.press("Control+s");
    await waitUntil(async () => (await f.saveCount()) === 1, "visual save");
    const markdown = await f.saved();
    assert.ok(markdown.includes(f.uploads[0].url));
    assert.ok(markdown.includes("typed-while-pending"));
    assert.doesNotMatch(markdown, /blob:|data:image/);
    const readsBefore = f.reads.length;
    await f.page.reload();
    await f.page.locator(".markdown-image-view img:not([hidden])").waitFor();
    assert.ok(f.reads.length > readsBefore);
    assert.ok(
      f.reads.every((read) => read.headers.authorization === `Bearer ${token}`),
    );
    assert.equal(
      await f.page
        .locator(".markdown-image-view img")
        .evaluate((img) => img.naturalWidth),
      1,
    );
  });

  await test("source paste maps anchor and replaces unchanged selection; later cursor is preserved", async (f) => {
    await sourceMode(f);
    await f.source.evaluate((element) => {
      element.focus();
      element.setSelectionRange(0, 6);
    });
    await pasteImages(f.source, ["source.png"]);
    await waitUntil(() => f.uploads.length === 1, "source upload starts");
    await f.source.evaluate((element) =>
      element.setSelectionRange(element.value.length, element.value.length),
    );
    await f.page.keyboard.insertText(" end");
    // Deliberately move away from the end before the response updates the controlled textarea.
    await f.source.evaluate((element) => element.setSelectionRange(8, 8));
    f.uploads[0].finish();
    await waitUntil(
      async () => (await f.source.inputValue()).includes(f.uploads[0].url),
      "source image insertion",
    );
    const value = await f.source.inputValue();
    assert.ok(value.includes("after end"));
    assert.ok(!value.includes("before"));
    const cursor = await f.source.evaluate((element) => element.selectionStart);
    assert.equal(
      cursor,
      value.indexOf("after") + 1,
      "asynchronous insertion must preserve current cursor relative to text",
    );
    await f.source.press("Control+s");
    await waitUntil(async () => (await f.saveCount()) === 1, "source save");
    assert.equal(await f.saved(), value);
  });

  await test("multiple images keep clipboard order even when network completes in reverse", async (f) => {
    await sourceMode(f);
    await f.source.press("Control+End");
    await pasteImages(f.source, ["first.png", "second.png"]);
    await waitUntil(() => f.uploads.length === 2, "two uploads");
    f.uploads.find((upload) => upload.name === "second.png").finish();
    assert.ok(!(await f.source.inputValue()).includes("second.png"));
    f.uploads.find((upload) => upload.name === "first.png").finish();
    await waitUntil(
      async () => (await f.source.inputValue()).includes("second.png"),
      "both inserted",
    );
    const value = await f.source.inputValue();
    assert.ok(value.indexOf("first.png") < value.indexOf("second.png"));
    assert.equal(
      (value.match(/!\[/g) || []).length,
      2,
      "clipboard files are not uploaded twice",
    );
  });

  await test("failed upload preserves selected text and allows retry/save", async (f) => {
    await sourceMode(f);
    await f.source.evaluate((element) => {
      element.focus();
      element.setSelectionRange(0, 6);
    });
    await pasteImages(f.source, ["failure.png"]);
    await waitUntil(() => f.uploads.length === 1, "failing upload");
    f.uploads[0].finish(false);
    await f.page
      .getByRole("alert")
      .filter({ hasText: "fixture upload failed" })
      .waitFor();
    assert.equal(await f.source.inputValue(), "before after");
    assert.equal(
      await f.page
        .getByRole("button", { name: "保存", exact: true })
        .isEnabled(),
      true,
    );
    await pasteImages(f.source, ["retry.png"]);
    await waitUntil(() => f.uploads.length === 2, "retry upload");
    f.uploads[1].finish();
    await waitUntil(
      async () => (await f.source.inputValue()).includes("retry.png"),
      "retry inserted",
    );
    assert.equal(await f.page.getByRole("alert").count(), 0);
  });

  await test("Ctrl/Cmd+S prevents default, serializes saves, and saves a snapshot", async (f) => {
    await sourceMode(f);
    await f.source.fill("first snapshot");
    const prevented = await f.source.evaluate((element) => {
      const event = new KeyboardEvent("keydown", {
        key: "s",
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      });
      element.dispatchEvent(event);
      return event.defaultPrevented;
    });
    assert.equal(prevented, true);
    await f.source.press("Control+s");
    await f.source.fill("edited during save");
    await f.source.press("Control+s");
    await waitUntil(
      async () => (await f.saveCount()) === 1,
      "single save completes",
    );
    assert.equal(await f.saved(), "first snapshot");
    await f.page.getByText("有未保存的修改", { exact: true }).waitFor();
    await f.source.press("Meta+s");
    await waitUntil(async () => (await f.saveCount()) === 2, "Cmd save");
    assert.equal(await f.saved(), "edited during save");
    assert.ok(
      !(await f.page
        .getByRole("button", { name: "保存", exact: true })
        .isDisabled()),
    );
    await f.page.locator("body").evaluate((element) => {
      const event = new KeyboardEvent("keydown", {
        key: "s",
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      });
      element.dispatchEvent(event);
      if (event.defaultPrevented)
        throw new Error("shortcut leaked outside the editor");
    });
  });

  await test("copying rendered image uses stable URLs when pasting into source", async (f) => {
    await f.visual.click();
    await f.visual.press("Control+End");
    await pasteImages(f.visual, ["copy.png"]);
    await waitUntil(() => f.uploads.length === 1, "copy fixture upload");
    f.uploads[0].finish();
    const image = f.page.locator(".markdown-image-view");
    await image.locator("img:not([hidden])").waitFor();
    await image.click();
    await f.page.keyboard.press("Control+c");
    const copied = await f.page.evaluate(async () =>
      navigator.clipboard.readText(),
    );
    assert.ok(
      copied.includes(f.uploads[0].url),
      "copied image text contains stable Markdown URL",
    );
    assert.doesNotMatch(copied, /blob:/);
    await sourceMode(f);
    await f.source.press("Control+End");
    await f.source.press("Control+v");
    await waitUntil(
      async () =>
        (await f.source.inputValue()).split(f.uploads[0].url).length === 3,
      "copy pasted source",
    );
    assert.equal(
      f.uploads.length,
      1,
      "existing stored image does not need re-upload",
    );
    assert.doesNotMatch(await f.source.inputValue(), /blob:/);
  });
} finally {
  await browser.close();
}

console.log(`${passed} passed; ${failures.length} failed`);
if (failures.length) process.exitCode = 1;
