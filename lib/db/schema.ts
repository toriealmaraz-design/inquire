import { boolean, integer, pgTable, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core'

export const settings = pgTable('settings', {
  id: integer('id').primaryKey().default(1),
  whatsappNumber: varchar('whatsapp_number', { length: 20 }).default('233206478727'),
  telegramUsername: varchar('telegram_username', { length: 50 }).default('GeminiNexusAdmin'),
  instagramUsername: varchar('instagram_username', { length: 50 }).default('GeminiNexusAdmin'),
  snapchatUsername: varchar('snapchat_username', { length: 50 }).default('GeminiNexus'),
  telegramBotToken: text('telegram_bot_token').default(''),
  telegramChatId: varchar('telegram_chat_id', { length: 50 }).default(''),
  adminPasscode: varchar('admin_passcode', { length: 100 }).default('nexus2026'),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const staffAccounts = pgTable('staff_accounts', {
  id: serial('id').primaryKey(),
  fullName: varchar('full_name', { length: 120 }).notNull(),
  email: varchar('email', { length: 160 }).notNull().unique(),
  role: varchar('role', { length: 60 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  mustChangePassword: boolean('must_change_password').notNull().default(true),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const submissions = pgTable('submissions', {
  id: serial('id').primaryKey(),
  ticketId: varchar('ticket_id', { length: 20 }).notNull().unique(),
  category: varchar('category', { length: 50 }).notNull(),
  serviceType: varchar('service_type', { length: 100 }).notNull(),
  scope: varchar('scope', { length: 50 }),
  urgency: varchar('urgency', { length: 50 }),
  clientContact: varchar('client_contact', { length: 50 }),
  briefDetails: text('brief_details'),
  fileUrls: text('file_urls'),
  status: varchar('status', { length: 30 }).default('Pending Quote'),
  createdAt: timestamp('created_at').defaultNow(),
})

export type Submission = typeof submissions.$inferSelect
export type NewSubmission = typeof submissions.$inferInsert
