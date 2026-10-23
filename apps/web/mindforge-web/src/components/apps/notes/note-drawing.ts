export const MAX_DRAWING_CONTENT_LENGTH = 4_000_000;

export function isDrawingNote(title: string) {
  return title.trim().toLowerCase().endsWith('.excalidraw');
}

export function createEmptyDrawing() {
  return JSON.stringify({
    type: 'excalidraw',
    version: 2,
    source: 'https://excalidraw.com',
    elements: [],
    appState: { viewBackgroundColor: '#ffffff' },
    files: {},
  });
}

export function validateDrawingContent(content: string) {
  if (content.length > MAX_DRAWING_CONTENT_LENGTH) {
    throw new Error('绘图超过 4,000,000 字符，请减少图片或拆分绘图后再保存。');
  }
  const scene: unknown = JSON.parse(content);
  if (
    !scene ||
    typeof scene !== 'object' ||
    !('type' in scene) ||
    scene.type !== 'excalidraw' ||
    !('elements' in scene) ||
    !Array.isArray(scene.elements)
  ) {
    throw new Error('请选择有效的 .excalidraw 绘图文件。');
  }
}
