import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const contentOverrides = sqliteTable('content_overrides', {
  kind: text('kind').notNull(),
  id: text('id').notNull(),
  value: text('value').notNull(),
  updatedAt: text('updated_at').notNull(),
}, table => [primaryKey({ columns: [table.kind, table.id] })]);

export const inquiries = sqliteTable('inquiries', {
  id: text('id').primaryKey(),
  requestId: text('request_id').notNull(),
  requestHash: text('request_hash').notNull(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  company: text('company').notNull(),
  country: text('country').notNull(),
  projectType: text('project_type').notNull(),
  message: text('message').notNull(),
  selectedSwatches: text('selected_swatches').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  status: text('status').notNull().default('new'),
  notes: text('notes').notNull().default(''),
  version: integer('version').notNull().default(1),
}, table => [
  uniqueIndex('inquiries_request_id_unique').on(table.requestId),
  index('inquiries_email_created').on(table.email, table.createdAt),
  index('inquiries_status_created').on(table.status, table.createdAt),
  index('inquiries_created').on(table.createdAt),
]);
