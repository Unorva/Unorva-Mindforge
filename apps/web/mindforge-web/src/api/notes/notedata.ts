import { http, HttpResponse } from 'msw';
import { noteFolderType, notesType } from 'src/types/apps/notes';

export let NotesFolders: noteFolderType[] = [
  { id: 'inbox', name: '收件箱', parentId: null },
  { id: 'work', name: '工作', parentId: null },
  { id: 'product', name: '产品规划', parentId: 'work' },
  { id: 'meetings', name: '会议记录', parentId: 'work' },
  { id: 'personal', name: '个人', parentId: null },
  { id: 'reading', name: '阅读笔记', parentId: 'personal' },
  { id: 'ideas', name: '灵感', parentId: 'personal' },
  { id: 'archive', name: '归档', parentId: null },
];

export let NotesData: notesType[] = [
  {
    id: 1,
    color: 'primary',
    title: '本周重点',
    content: '## 本周目标\n\n完成项目规划，整理下一阶段里程碑，并为最重要的三个任务预留不被打扰的时间。\n\n### 关键任务\n\n- 明确产品范围和优先级\n- 完成第一版里程碑拆分\n- 为深度工作预留三个时间块',
    folderId: 'product',
    datef: '2023-06-03T23:28:56.782Z',
    deleted: false,
  },
  {
    id: 2,
    color: 'destructive',
    title: '知识管理的价值',
    content: '真正有用的知识管理，不是收藏更多信息，而是在需要时能够快速找到并转化为行动。\n\n> 笔记的价值，发生在再次使用它的那一刻。\n\n可以尝试把每条阅读笔记都关联到一个正在推进的项目。',
    folderId: 'reading',
    datef: '2023-06-02T23:28:56.782Z',
    deleted: false,
  },
  {
    id: 3,
    color: 'chart-4',
    title: '灵感清单',
    content: '- 尝试用更短的句子记录想法\n- 每条笔记只聚焦一个主题\n- 在一天结束前补充相关标签\n- 每周回顾一次未整理的灵感',
    folderId: 'ideas',
    datef: '2023-06-01T23:28:56.782Z',
    deleted: false,
  },
  {
    id: 4,
    color: 'chart-2',
    title: '产品例会 · 6 月 3 日',
    content: '## 会议结论\n\n确认需求范围与交付时间，风险项由负责人在周三前更新，下一次同步安排在周五下午。\n\n### 待办\n\n- [ ] 更新需求边界\n- [ ] 补充风险负责人\n- [ ] 准备周五演示',
    folderId: 'meetings',
    datef: '2023-06-03T23:28:56.782Z',
    deleted: false,
  },
];

export const NotesHandlers = [
  // GET request to retrieve Notes data
  http.get('/api/data/notes/NotesData', () => {
    try {
      return HttpResponse.json({ status: 200, msg: '获取成功', data: NotesData, folders: NotesFolders });
    } catch (error) {
      return HttpResponse.json({
        status: 400,
        msg: '服务器内部错误',
        error,
      });
    }
  }),

  // DELETE endpoint for deleting a note
  http.delete('/api/notes/delete', async ({ request }) => {
    try {
      const { id } = (await request.json()) as { id: string | number };
      const remainingNotes = NotesData.filter(note => note.id !== id);
      NotesData = remainingNotes;
      return HttpResponse.json({ status: 200, msg: '删除成功', data: NotesData, folders: NotesFolders });
    } catch (error) {
      return HttpResponse.json({
        status: 400,
        msg: '服务器内部错误',
        error,
      });
    }
  }),

  http.post('/api/notes/folders/add', async ({ request }) => {
    try {
      const { name, parentId } = (await request.json()) as {
        name: string;
        parentId: string | null;
      };
      const folder = {
        id: `folder-${Date.now()}`,
        name,
        parentId,
      };
      NotesFolders.push(folder);
      return HttpResponse.json({ status: 200, msg: '添加成功', data: NotesFolders, folder });
    } catch (error) {
      return HttpResponse.json({ status: 400, msg: '服务器内部错误', error });
    }
  }),

  http.delete('/api/notes/folders/delete', async ({ request }) => {
    try {
      const { id } = (await request.json()) as { id: string };
      const folderIds = new Set([id]);
      let changed = true;

      while (changed) {
        changed = false;
        NotesFolders.forEach((folder) => {
          if (folder.parentId && folderIds.has(folder.parentId) && !folderIds.has(folder.id)) {
            folderIds.add(folder.id);
            changed = true;
          }
        });
      }

      NotesFolders = NotesFolders.filter((folder) => !folderIds.has(folder.id));
      NotesData = NotesData.filter((note) => !note.folderId || !folderIds.has(note.folderId));
      return HttpResponse.json({
        status: 200,
        msg: '删除成功',
        data: NotesFolders,
        notes: NotesData,
      });
    } catch (error) {
      return HttpResponse.json({ status: 400, msg: '服务器内部错误', error });
    }
  }),

  //  POST endpoint for adding a new note

  http.post('/api/notes/add', async ({ request }) => {
    const currentDate = new Date();
    try {
      const { title, color, content, folderId } = (await request.json()) as {
        title: string;
        color: string;
        content?: string;
        folderId?: string;
      };

      // Find the highest ID currently in the NotesData array
      const highestId = NotesData.reduce((maxId, note) => Math.max(maxId, note.id), 0);

      // Create a new note with the next unique ID
      const newNote = {
        id: highestId + 1,
        title,
        content: content ?? '',
        folderId: folderId ?? 'inbox',
        color,
        deleted: false,
        datef: currentDate.toISOString(),
      };

      NotesData.push(newNote);
      return HttpResponse.json({ status: 200, msg: '添加成功', data: NotesData, folders: NotesFolders });
    } catch (error) {
      return HttpResponse.json({
        status: 400,
        msg: '服务器内部错误',
        error,
      });
    }
  }),

  // PUT endpoint for updating a note
  http.put('/api/notes/update', async ({ request }) => {
    try {
      const { id, ...updates } = (await request.json()) as {
        id: string | number;
      } & Partial<notesType>;
      const index = NotesData.findIndex((note) => note.id === id);

      if (index !== -1) {
        NotesData[index] = {
          ...NotesData[index],
          ...updates,
          datef: new Date().toISOString(),
        };
        return HttpResponse.json({
          status: 200,
          msg: '更新成功',
          data: NotesData,
          folders: NotesFolders,
        });
      } else {
        return HttpResponse.json({ status: 400, msg: '未找到笔记' });
      }
    } catch (error) {
      return HttpResponse.json({
        status: 400,
        msg: '服务器内部错误',
        error,
      });
    }
  }),
];
