export const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);

export function clipboardImages(data: DataTransfer): File[] {
  const items = Array.from(data.items ?? [])
    .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
    .map((item) => item.getAsFile())
    .filter((file): file is File => file !== null);
  // 浏览器通常同时提供 items 和 files，不能把同一图片上传两次。
  return items.length
    ? items
    : Array.from(data.files).filter((file) => file.type.startsWith('image/'));
}

export function validateClipboardImage(file: File) {
  if (!IMAGE_TYPES.has(file.type)) throw new Error('请粘贴 PNG、JPEG、GIF 或 WebP 图片。');
  if (!file.size) throw new Error('图片内容为空，请重新复制。');
  if (file.size > MAX_IMAGE_SIZE) throw new Error('单张图片不能超过 10 MB。');
}

export type SourceEdit = { from: number; to: number; inputType: string };

/** 优先使用 beforeinput 的选区定位修改，避免重复文本令插入点漂移。 */
export function mapSourcePosition(
  before: string,
  after: string,
  position: number,
  edit?: SourceEdit,
): number | null {
  if (edit) {
    let { from, to } = edit;
    const delta = after.length - before.length;
    if (from === to && delta < 0 && edit.inputType.startsWith('delete')) {
      if (edit.inputType.endsWith('Backward')) from += delta;
      else to -= delta;
    }
    const newEnd = to + delta;
    if (
      from >= 0 &&
      newEnd >= from &&
      after.slice(0, from) === before.slice(0, from) &&
      after.slice(newEnd) === before.slice(to)
    ) {
      if (position <= from) return position;
      if (position >= to) return position + delta;
      return null;
    }
  }
  // 程序设置 value、撤销等未提供 beforeinput 选区的情况使用文本差异回退。
  let start = 0;
  while (start < before.length && start < after.length && before[start] === after[start]) start++;
  let oldEnd = before.length;
  let newEnd = after.length;
  while (oldEnd > start && newEnd > start && before[oldEnd - 1] === after[newEnd - 1]) {
    oldEnd--;
    newEnd--;
  }
  if (position <= start) return position;
  if (position >= oldEnd) return position + newEnd - oldEnd;
  return null;
}

export function imageMarkdown(name: string, url: string) {
  const alt = name.replace(/[\\[\]\r\n]/g, ' ').trim() || '图片';
  return `![${alt}](${url})`;
}
