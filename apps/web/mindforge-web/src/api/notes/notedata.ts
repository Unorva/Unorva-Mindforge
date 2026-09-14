import { http, HttpResponse } from 'msw';
import { notesType } from 'src/types/apps/notes';

export let NotesData: notesType[] = [
  {
    id: 1,
    color: 'primary',
    title:
      '本周重点：完成项目规划，整理下一阶段里程碑，并为最重要的三个任务预留不被打扰的时间。',
    datef: '2023-06-03T23:28:56.782Z',
    deleted: false,
  },
  {
    id: 2,
    color: 'destructive',
    title:
      '阅读笔记：真正有用的知识管理，不是收藏更多信息，而是在需要时能够快速找到并转化为行动。',
    datef: '2023-06-02T23:28:56.782Z',
    deleted: false,
  },
  {
    id: 3,
    color: 'chart-4',
    title:
      '灵感清单：尝试用更短的句子记录想法；每条笔记只聚焦一个主题；在一天结束前补充相关标签。',
    datef: '2023-06-01T23:28:56.782Z',
    deleted: false,
  },
  {
    id: 4,
    color: 'chart-2',
    title:
      '会议记录：确认需求范围与交付时间，风险项由负责人在周三前更新，下一次同步安排在周五下午。',
    datef: '2023-06-03T23:28:56.782Z',
    deleted: false,
  },
];

export const NotesHandlers = [
  // GET request to retrieve Notes data
  http.get('/api/data/notes/NotesData', () => {
    try {
      return HttpResponse.json({ status: 200, msg: '获取成功', data: NotesData });
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
      return HttpResponse.json({ status: 200, msg: '删除成功', data: NotesData });
    } catch (error) {
      return HttpResponse.json({
        status: 400,
        msg: '服务器内部错误',
        error,
      });
    }
  }),

  //  POST endpoint for adding a new note

  http.post('/api/notes/add', async ({ request }) => {
    const currentDate = new Date();
    try {
      const { title, color } = (await request.json()) as { title: string; color: string };

      // Find the highest ID currently in the NotesData array
      const highestId = NotesData.reduce((maxId, note) => Math.max(maxId, note.id), 0);

      // Create a new note with the next unique ID
      const newNote = {
        id: highestId + 1,
        title,
        color,
        deleted: false,
        datef: currentDate.toISOString(),
      };

      NotesData.push(newNote);
      return HttpResponse.json({ status: 200, msg: '添加成功', data: NotesData });
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
      const { id, title, color } = (await request.json()) as {
        id: string | number;
        title: string;
        color: string;
      };
      const index = NotesData.findIndex((note) => note.id === id);

      if (index !== -1) {
        NotesData[index] = { ...NotesData[index], title, color };
        return HttpResponse.json({
          status: 200,
          msg: '更新成功',
          data: NotesData,
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
