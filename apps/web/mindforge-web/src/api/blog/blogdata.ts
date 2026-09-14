import { Chance } from 'chance';
import { random } from 'lodash';
import { sub } from 'date-fns';
import { uniqueId } from 'lodash';
import { BlogType, BlogPostType } from 'src/types/apps/blog';
import { http, HttpResponse } from 'msw';

import blogImg1 from '@/assets/images/blog/blog-img1.png';
import blogImg2 from '@/assets/images/blog/blog-img2.png';
import blogImg3 from '@/assets/images/blog/blog-img3.png';
import blogImg4 from '@/assets/images/blog/blog-img4.png';
import blogImg5 from '@/assets/images/blog/blog-img5.png';
import blogImg6 from '@/assets/images/blog/blog-img6.png';
import blogImg8 from '@/assets/images/blog/blog-img8.png';
import blogImg9 from '@/assets/images/blog/blog-img9.png';
import blogImg12 from '@/assets/images/blog/blog-img12.png';

import userImg2 from '@/assets/images/profile/user-2.png';
import userImg3 from '@/assets/images/profile/user-3.png';
import userImg4 from '@/assets/images/profile/user-4.png';
import userImg5 from '@/assets/images/profile/user-5.png';
import userImg6 from '@/assets/images/profile/user-6.png';

const chance = new Chance();
const blogSummary =
  '在信息不断涌入的时代，清晰的整理方式能帮助我们保留重要想法、减少干扰，并把零散内容转化为可以持续复用的知识。';

const BlogComment: BlogType[] = [
  {
    id: uniqueId('#comm_'),
    profile: {
      id: uniqueId(),
      avatar: userImg5,
      name: chance.name(),
    },
    time: chance.date(),
    comment: '这篇文章很有启发，尤其是关于保持专注的部分。',
    replies: [],
  },
  {
    id: uniqueId('#comm_'),
    profile: {
      id: uniqueId(),
      avatar: userImg3,
      name: chance.name(),
    },
    time: chance.date(),
    comment: '内容整理得很清晰，我准备按照文中的方法试一试。',
    replies: [
      {
        id: uniqueId('#comm_'),
        profile: {
          id: uniqueId(),
          avatar: userImg3,
          name: chance.name(),
        },
        time: chance.date(),
        comment: '感谢分享，期待看到后续的实践总结。',
      },
    ],
  },
  {
    id: uniqueId('#comm_'),
    profile: {
      id: uniqueId(),
      avatar: userImg4,
      name: chance.name(),
    },
    time: chance.date(),
    comment: '很实用的建议，已经收藏了。',
    replies: [],
  },
]

const BlogPost: BlogPostType[] = [
  {
    id: uniqueId(),
    title: '佳明 Instinct Crossover：坚固耐用的混合智能手表',
    content: blogSummary,
    coverImg: blogImg2,
    createdAt: sub(new Date(), { days: 8, hours: 6, minutes: 20 }),
    view: random(9999),
    share: random(9999),
    category: '数码',
    featured: false,
    author: {
      id: uniqueId(),
      avatar: userImg5,
      name: chance.name(),
    },
    comments: BlogComment,
    published: true,
  },
  {
    id: uniqueId(),
    title: '推特裁员之后：留下的员工面临沉默期',
    content: blogSummary,
    coverImg: blogImg1,
    createdAt: sub(new Date(), { days: 7, hours: 3, minutes: 20 }),
    view: random(9999),
    share: random(9999),
    category: '生活方式',
    featured: false,
    author: {
      id: uniqueId(),
      avatar: userImg2,
      name: chance.name(),
    },
    comments: BlogComment,
    published: true,
  },
  {
    id: uniqueId(),
    title:
      '苹果正在为 iOS 打造更简洁的辅助功能',
    content: blogSummary,
    coverImg: blogImg3,
    createdAt: sub(new Date(), { days: 5, hours: 2, minutes: 20 }),
    view: random(9999),
    share: random(9999),
    category: '设计',
    featured: false,
    author: {
      id: uniqueId(),
      avatar: userImg3,
      name: chance.name(),
    },
    comments: BlogComment,
    published: true,
  },
  {
    id: uniqueId(),
    title: 'Figma 为何以 200 亿美元出售给 Adobe',
    content: blogSummary,
    coverImg: blogImg4,
    createdAt: sub(new Date(), { days: 7, hours: 6, minutes: 20 }),
    view: random(9999),
    share: random(9999),
    category: '设计',
    featured: false,
    author: {
      id: uniqueId(),
      avatar: userImg4,
      name: chance.name(),
    },
    comments: BlogComment,
    published: true,
  },
  {
    id: uniqueId(),
    title: '流媒体视频还没流行就将在明天停服',
    content: blogSummary,
    coverImg: blogImg5,
    createdAt: sub(new Date(), { days: 4, hours: 6, minutes: 20 }),
    view: random(9999),
    share: random(9999),
    category: '生活方式',
    featured: false,
    author: {
      id: uniqueId(),
      avatar: userImg5,
      name: chance.name(),
    },
    comments: BlogComment,
    published: false,
  },
  {
    id: uniqueId(),
    title: '日元走低，日本消费者开始青睐二手 iPhone',
    content: blogSummary,
    coverImg: blogImg6,
    createdAt: sub(new Date(), { days: 2, hours: 6, minutes: 20 }),
    view: random(9999),
    share: random(9999),
    category: '数码',
    featured: false,
    author: {
      id: uniqueId(),
      avatar: userImg6,
      name: chance.name(),
    },
    comments: BlogComment,
    published: true,
  },
  {
    id: uniqueId(),
    title:
      '英特尔重启针对 Fortress 反垄断诉讼的请求被驳回',
    content: blogSummary,
    coverImg: blogImg9,
    createdAt: sub(new Date(), { days: 3, hours: 6, minutes: 20 }),
    view: random(9999),
    share: random(9999),
    category: '社交',
    featured: false,
    author: {
      id: uniqueId(),
      avatar: userImg2,
      name: chance.name(),
    },
    comments: BlogComment,
    published: true,
  },
  {
    id: uniqueId(),
    title: '如何在公共健康事件中保持理性与从容',
    content: blogSummary,
    coverImg: blogImg8,
    createdAt: sub(new Date(), { days: 4, hours: 6, minutes: 20 }),
    view: random(9999),
    share: random(9999),
    category: '健康',
    featured: false,
    author: {
      id: uniqueId(),
      avatar: userImg3,
      name: chance.name(),
    },
    comments: BlogComment,
    published: false,
  },
  {
    id: uniqueId(),
    title: '黑色星期五提前购：电视、耳机与笔记本精选',
    content: blogSummary,
    coverImg: blogImg9,
    createdAt: sub(new Date(), { days: 5, hours: 3, minutes: 20 }),
    view: random(9999),
    share: random(9999),
    category: '数码',
    featured: true,
    author: {
      id: uniqueId(),
      avatar: userImg4,
      name: chance.name(),
    },
    comments: BlogComment,
    published: true,
  },
  {
    id: uniqueId(),
    title: '运动与健康：建立能够长期坚持的生活节奏',
    content: blogSummary,
    coverImg: blogImg1,
    createdAt: sub(new Date(), { days: 0, hours: 1, minutes: 20 }),
    view: random(9999),
    share: random(9999),
    category: '健康',
    featured: true,
    author: {
      id: uniqueId(),
      avatar: userImg5,
      name: chance.name(),
    },
    comments: BlogComment,
    published: false,
  },
  {
    id: uniqueId(),
    title: '佳明 Instinct Crossover Solar：更耐用的太阳能智能手表',
    content: blogSummary,
    coverImg: blogImg12,
    createdAt: sub(new Date(), { days: 8, hours: 6, minutes: 20 }),
    view: random(9999),
    share: random(9999),
    category: '生活方式',
    featured: false,
    author: {
      id: uniqueId(),
      avatar: userImg6,
      name: chance.name(),
    },
    comments: BlogComment,
    published: true,
  },
]
// Mocked Apis
export const Bloghandlers = [
  // Mock api endpoint to fetch all blogposts
  http.get('/api/data/blog/BlogPosts', () => {
    try {
      return HttpResponse.json({ status: 200, data: BlogPost, msg: 'success' });
    } catch {
      return HttpResponse.json({ status: 400, msg: 'something went wrong' });
    }
  }),

  // Mock api endpoint to add post info
  http.post('/api/data/blog/post/add', async ({ request }) => {
    try {
      const { postId, comment } = (await request.json()) as { postId: string | number; comment: BlogType };
      const postIndex = BlogPost.findIndex((x) => x.id === postId);
      const post = BlogPost[postIndex];
      const cComments = post.comments || [];
      post.comments = [comment, ...cComments];
      return HttpResponse.json({
        status: 200,
        data: { posts: [...BlogPost] },
        msg: 'success',
      });
    } catch (error) {
      return HttpResponse.json({
        status: 400,
        msg: 'something went wrong',
        error,
      });
    }
  }),
];
