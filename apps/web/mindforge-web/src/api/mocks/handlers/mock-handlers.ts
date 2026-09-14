

import { Bloghandlers } from 'src/api/blog/blogdata';
import { NotesHandlers } from 'src/api/notes/notedata';
import { HealthHandlers } from 'src/api/health/health-data';
import { FinanceHandlers } from 'src/api/finance/finance-data';
import { SettingsHandlers } from 'src/api/settings/settings-data';


export const mockHandlers = [
  ...Bloghandlers,
  ...NotesHandlers,
  ...HealthHandlers,
  ...FinanceHandlers,
  ...SettingsHandlers,
];
