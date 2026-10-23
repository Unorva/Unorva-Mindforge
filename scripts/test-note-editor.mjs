/**
 * Browser regression for note creation and editor switching.
 * Start Vite, then run: node scripts/test-note-editor.mjs http://127.0.0.1:5185
 * Uses the same Playwright runtime as test-markdown-editor.mjs. All API data is mocked.
 */
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { createEmptyDrawing } from "../apps/web/mindforge-web/src/components/apps/notes/note-drawing.ts";

const require = createRequire(import.meta.url);
function loadPlaywright() {
  try {
    return require("playwright");
  } catch {
    // Fall back to the desktop runtime, matching the other browser regression.
  }
  for (const candidate of [
    process.env.PLAYWRIGHT_MODULE_PATH,
    path.join(
      homedir(),
      ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
    ),
  ].filter(Boolean)) {
    if (existsSync(candidate))
      return createRequire(path.join(candidate, "package.json"))("playwright");
  }
  throw new Error(
    "Set PLAYWRIGHT_MODULE_PATH to an existing Playwright installation.",
  );
}

const { chromium } = loadPlaywright();
const baseUrl = (process.argv[2] || "http://127.0.0.1:5185").replace(/\/$/, "");
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
await context.addInitScript(() => {
  localStorage.setItem(
    "mindforge_access_token",
    "notes-browser-regression-fixture",
  );
});
const notes = [
  {
    id: 1,
    title: "草图.excalidraw",
    content: createEmptyDrawing(),
    folderId: "work",
    deleted: false,
  },
  {
    id: 2,
    title: "已有笔记",
    content: "这是已有笔记的正文",
    folderId: "work",
    deleted: false,
  },
];
const folders = [{ id: "work", name: "回归测试", parentId: null }];
const creates = [];
const saves = [];
const errors = [];
const page = await context.newPage();
page.setDefaultTimeout(30000);
page.on("pageerror", (error) => errors.push(error.message));
const success = (data) => ({ code: 200, success: true, data });
await page.route(
  (url) => url.pathname.startsWith("/api/"),
  async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (pathname === "/api/notes/add") {
      const body = request.postDataJSON();
      creates.push(body);
      notes.push({ ...body, id: notes.length + 1 });
    } else if (pathname === "/api/notes/update") {
      const body = request.postDataJSON();
      saves.push(body);
      Object.assign(
        notes.find((note) => note.id === body.id),
        body,
      );
    }
    const data =
      pathname === "/api/data/settings/SettingsData"
        ? {
            appearance: {},
            apps: [{ id: "mail", enabled: false, options: {} }],
          }
        : { notes, folders };
    await route.fulfill({ json: success(data) });
  },
);
await page.route(
  (url) => url.pathname.startsWith("/users/"),
  (route) =>
    route.fulfill({
      json: success({
        id: 42,
        username: "notes-fixture",
        nickname: "回归测试",
      }),
    }),
);

const visual = page.getByLabel("Markdown 可视化编辑器", { exact: true });
const source = page.getByLabel("Markdown 源码编辑器", { exact: true });
const selectNote = (title) =>
  page.getByRole("button", { name: title, exact: true }).click();
async function createNote(title) {
  await page.getByRole("button", { name: "“回归测试”文件夹菜单" }).click();
  await page.getByRole("menuitem", { name: "新建笔记", exact: true }).click();
  await page.getByRole("textbox", { name: "名称", exact: true }).fill(title);
  await page.getByRole("button", { name: "创建", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await visual.waitFor();
}

try {
  await page.goto(`${baseUrl}/apps/notes`);
  await page.locator(".excalidraw canvas").first().waitFor();
  await createNote("绘图之后的新笔记");
  assert.equal(
    creates.at(-1).content,
    "",
    "New note API content must be empty",
  );
  assert.equal(
    (await visual.innerText()).trim(),
    "",
    "New note must not inherit drawing JSON",
  );
  await page.getByRole("tab", { name: "Markdown 源码", exact: true }).click();
  assert.equal(
    await source.inputValue(),
    "",
    "Source mode must also start empty",
  );
  const emptySaved = page.waitForResponse((response) =>
    response.url().endsWith("/api/notes/update"),
  );
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await emptySaved;
  assert.equal(
    saves.at(-1).content,
    "",
    "Saving must not persist the previous drawing",
  );
  console.log("PASS: creating and saving an empty note after a drawing");

  await selectNote("已有笔记");
  await visual.waitFor();
  assert.equal(await visual.innerText(), "这是已有笔记的正文");
  await createNote("普通笔记之后的新笔记");
  assert.equal(
    (await visual.innerText()).trim(),
    "",
    "New note must not inherit another note's text",
  );
  await visual.fill("新笔记独立的正文");
  const saved = page.waitForResponse((response) =>
    response.url().endsWith("/api/notes/update"),
  );
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await saved;
  assert.equal(saves.at(-1).content, "新笔记独立的正文");
  await selectNote("已有笔记");
  assert.equal(await visual.innerText(), "这是已有笔记的正文");
  await selectNote("普通笔记之后的新笔记");
  assert.equal(await visual.innerText(), "新笔记独立的正文");
  console.log(
    "PASS: new text note, saving, and switching between existing notes",
  );

  await selectNote("草图.excalidraw");
  await page.locator(".excalidraw canvas").first().waitFor();
  await selectNote("已有笔记");
  await visual.waitFor();
  assert.equal(await visual.innerText(), "这是已有笔记的正文");
  await selectNote("绘图之后的新笔记");
  assert.equal((await visual.innerText()).trim(), "");
  assert.deepEqual(errors, [], "Browser must not report runtime errors");
  console.log(
    "PASS: drawing-to-note switching preserves the selected note's content",
  );
} catch (error) {
  console.error("Page errors:", errors);
  console.error("Page text:", await page.locator("body").innerText());
  throw error;
} finally {
  await browser.close();
}
