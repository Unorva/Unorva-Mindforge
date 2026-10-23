import { Extension } from '@tiptap/core';
import { Image } from '@tiptap/extension-image';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

import { isStoredMarkdownImage, loadMarkdownImage } from '@/api/files/images';
import { imageMarkdown } from './image-clipboard';

export const imageUploadKey = new PluginKey<DecorationSet>('markdownImageUploads');

type UploadDecoration = {
  add?: { id: string; from: number; position: number; preview: string };
  remove?: string;
  clear?: boolean;
};

export const ImageUploadPlaceholders = Extension.create({
  name: 'imageUploadPlaceholders',
  addProseMirrorPlugins() {
    return [
      new Plugin<DecorationSet>({
        key: imageUploadKey,
        state: {
          init: () => DecorationSet.empty,
          apply(transaction, decorations) {
            let next = decorations.map(transaction.mapping, transaction.doc);
            const action = transaction.getMeta(imageUploadKey) as UploadDecoration | undefined;
            if (action?.clear) return DecorationSet.empty;
            if (action?.add) {
              const { id, from, position, preview } = action.add;
              if (from < position) {
                next = next.add(transaction.doc, [
                  Decoration.inline(from, position, {}, { id, selection: true }),
                ]);
              }
              next = next.add(transaction.doc, [
                Decoration.widget(
                  position,
                  () => {
                    const wrapper = document.createElement('span');
                    wrapper.className = 'markdown-image-upload';
                    wrapper.contentEditable = 'false';
                    const image = document.createElement('img');
                    image.src = preview;
                    image.alt = '正在上传图片';
                    const label = document.createElement('span');
                    label.textContent = '正在上传图片…';
                    wrapper.append(image, label);
                    return wrapper;
                  },
                  { id, side: -1 },
                ),
              ]);
            }
            if (action?.remove)
              next = next.remove(
                next.find(undefined, undefined, (spec) => spec.id === action.remove),
              );
            return next;
          },
        },
        props: { decorations: (state) => imageUploadKey.getState(state) },
      }),
    ];
  },
});

/** Markdown 保留稳定的服务路径，DOM 用带鉴权请求产生的临时 URL 展示私有图片。 */
export const StoredImage = Image.extend({
  renderText({ node }) {
    return imageMarkdown(node.attrs.alt || '图片', node.attrs.src);
  },
  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('span');
      dom.className = 'markdown-image-view';
      dom.contentEditable = 'false';
      const img = document.createElement('img');
      const status = document.createElement('span');
      status.className = 'markdown-image-status';
      status.setAttribute('role', 'status');
      dom.append(img, status);
      let currentSrc = '';
      let controller: AbortController | undefined;
      let objectUrl: string | undefined;
      const render = (attrs: typeof node.attrs) => {
        img.alt = attrs.alt || '图片';
        img.title = attrs.title || '';
        if (currentSrc === attrs.src) return;
        currentSrc = attrs.src;
        controller?.abort();
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        objectUrl = undefined;
        img.removeAttribute('src');
        img.hidden = true;
        status.textContent = '正在加载图片…';
        const request = new AbortController();
        controller = request;
        const show = (src: string) => {
          img.onload = () => {
            status.textContent = '';
            img.hidden = false;
          };
          img.onerror = () => {
            status.textContent = '图片加载失败，请重新打开文档重试。';
          };
          img.src = src;
        };
        if (!isStoredMarkdownImage(currentSrc)) {
          show(currentSrc);
          return;
        }
        void loadMarkdownImage(currentSrc, request.signal)
          .then((blob) => {
            if (request.signal.aborted) return;
            objectUrl = URL.createObjectURL(blob);
            show(objectUrl);
          })
          .catch(() => {
            if (!request.signal.aborted)
              status.textContent = '图片加载失败，请确认登录状态后重新打开文档。';
          });
      };
      render(node.attrs);
      return {
        dom,
        update(nextNode) {
          if (nextNode.type !== node.type) return false;
          render(nextNode.attrs);
          return true;
        },
        destroy() {
          controller?.abort();
          if (objectUrl) URL.revokeObjectURL(objectUrl);
        },
      };
    };
  },
}).configure({ allowBase64: false, inline: false });
