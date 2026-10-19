import type { AutomationColorKey, AutomationIconKey } from './automation-icons';

export interface AutomationTemplate {
  id: string;
  title: string;
  description: string;
  prompt: string;
  iconKey: AutomationIconKey;
  colorKey: AutomationColorKey;
}

export interface AutomationCategory {
  name: string;
  /** 分类默认的图标底块颜色。 */
  colorKey: AutomationColorKey;
  templates: AutomationTemplate[];
}

export const AUTOMATION_CATEGORIES: AutomationCategory[] = [
  {
    name: '新闻',
    colorKey: 'blue',
    templates: [
      {
        id: 'morning-brief',
        title: 'Morning Brief',
        description: "Start the day with headlines, market moves, and your week ahead.",
        prompt:
          'Give me a morning brief: top headlines, key market moves, and what is ahead in my week. Keep it under 300 words and end with three priorities for today.',
        iconKey: 'newspaper',
        colorKey: 'blue',
      },
      {
        id: 'ai-news-digest',
        title: 'AI News Digest',
        description: 'Model releases, research, and funding that actually matter.',
        prompt:
          'Summarize the most important AI news from the last 24 hours: model releases, notable research, and funding rounds. Explain why each item matters in one sentence.',
        iconKey: 'sparkles',
        colorKey: 'blue',
      },
      {
        id: 'x-trends-digest',
        title: 'X Trends Digest',
        description: 'The five most interesting conversations on X right now.',
        prompt:
          'Find the five most interesting conversations on X right now. For each one, summarize the discussion and note why it is worth following.',
        iconKey: 'trending',
        colorKey: 'blue',
      },
      {
        id: 'competitor-watch',
        title: 'Competitor Watch',
        description: 'Weekly digest of competitor launches, pricing, and hires.',
        prompt:
          'Prepare a weekly competitor digest covering launches, pricing changes, and notable hires. Group the findings by competitor and highlight anything that needs a response.',
        iconKey: 'radar',
        colorKey: 'blue',
      },
    ],
  },
  {
    name: '生产力',
    colorKey: 'pink',
    templates: [
      {
        id: 'email-auto-responder',
        title: 'Email Auto-Responder',
        description: 'Draft concise replies for important email threads each morning.',
        prompt:
          'Review my unread email threads and draft concise replies for the important ones. Keep the tone professional, ask only necessary follow-up questions, and leave anything sensitive for me to review.',
        iconKey: 'mail',
        colorKey: 'pink',
      },
      {
        id: 'weekly-review',
        title: 'Weekly Review',
        description: 'Wrap the week: what you did, loose ends, and next priorities.',
        prompt:
          'Write my weekly review: what I accomplished, open loops, and the top priorities for next week. Be concise and specific, and call out anything that is blocked.',
        iconKey: 'calendar-check',
        colorKey: 'pink',
      },
      {
        id: 'task-extractor',
        title: 'Task Extractor',
        description: 'Extract action items from recent messages and summarize them.',
        prompt:
          'Extract action items from my recent messages and summarize them. For each item include the owner, due date if mentioned, and the source message.',
        iconKey: 'list',
        colorKey: 'pink',
      },
      {
        id: 'daily-planner',
        title: 'Daily Planner',
        description: 'A realistic plan for today with focus blocks and quick wins.',
        prompt:
          'Build a realistic plan for today from my open tasks. Include focus blocks, quick wins, and buffer time. Flag anything that should be deferred.',
        iconKey: 'calendar-days',
        colorKey: 'pink',
      },
    ],
  },
  {
    name: '金融',
    colorKey: 'orange',
    templates: [
      {
        id: 'daily-stock-tracker',
        title: 'Daily Stock Tracker',
        description: 'Prices, sentiment, and catalysts for your watchlist every day.',
        prompt:
          'Give me a daily update for my watchlist: price moves, market sentiment, and upcoming catalysts. Keep it factual and avoid investment advice.',
        iconKey: 'line-chart',
        colorKey: 'orange',
      },
      {
        id: 'earnings-calendar',
        title: 'Earnings Calendar',
        description: 'Who reports this week, expectations, and what to watch.',
        prompt:
          'List the companies reporting earnings this week that matter to me, along with consensus expectations and the key metrics to watch.',
        iconKey: 'calendar-clock',
        colorKey: 'orange',
      },
      {
        id: 'portfolio-news-scan',
        title: 'Portfolio News Scan',
        description: 'Only material news for your holdings — earnings, ratings, guidance.',
        prompt:
          'Scan the news for my holdings and surface only material updates: earnings, analyst rating changes, and guidance. Summarize each in one sentence and skip routine coverage.',
        iconKey: 'briefcase',
        colorKey: 'orange',
      },
    ],
  },
  {
    name: '研究',
    colorKey: 'violet',
    templates: [
      {
        id: 'competitor-watch-research',
        title: 'Competitor Watch',
        description: 'Weekly digest of competitor launches, pricing, and hires.',
        prompt:
          'Research competitors weekly and summarize launches, pricing changes, and hiring signals. Note the evidence for each finding and what it could mean for our roadmap.',
        iconKey: 'radar',
        colorKey: 'violet',
      },
      {
        id: 'paper-watch',
        title: 'Paper Watch',
        description: "The week's most interesting research, explained in plain language.",
        prompt:
          'Pick the most interesting research papers from this week and explain each in plain language: the problem, the approach, and why it matters.',
        iconKey: 'book',
        colorKey: 'violet',
      },
      {
        id: 'weekend-deep-dive',
        title: 'Weekend Deep Dive',
        description: "One briefing memo each week on a topic you're following.",
        prompt:
          'Write a weekend deep dive on a topic I am following. Cover the background, recent developments, open questions, and a short reading list.',
        iconKey: 'lightbulb',
        colorKey: 'violet',
      },
    ],
  },
  {
    name: '生活方式',
    colorKey: 'sky',
    templates: [
      {
        id: 'workout-coach',
        title: 'Workout Coach',
        description: 'A daily 45-minute session that rotates through the week.',
        prompt:
          'Plan a daily 45-minute workout that rotates through the week so muscle groups recover. Include warm-up, main sets, and cool-down.',
        iconKey: 'heart',
        colorKey: 'sky',
      },
      {
        id: 'meal-planner',
        title: 'Meal Planner',
        description: 'Seven weeknight dinners plus one consolidated grocery list.',
        prompt:
          'Plan seven weeknight dinners with a consolidated grocery list. Prefer simple recipes, reuse ingredients, and keep prep under 30 minutes.',
        iconKey: 'utensils',
        colorKey: 'sky',
      },
    ],
  },
];
