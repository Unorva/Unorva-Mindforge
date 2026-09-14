

import { Bloghandlers } from 'src/api/blog/blogdata';
import { NotesHandlers } from 'src/api/notes/notedata';
import { TicketHandlers } from 'src/api/ticket/ticket-data';
import { HealthHandlers } from 'src/api/health/health-data';
import { FinanceHandlers } from 'src/api/finance/finance-data';
import { SettingsHandlers } from 'src/api/settings/settings-data';


export const mockHandlers = [
  ...Bloghandlers,
  ...NotesHandlers,
  ...TicketHandlers,
  ...HealthHandlers,
  ...FinanceHandlers,
  ...SettingsHandlers,
];
