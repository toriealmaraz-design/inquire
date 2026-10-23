import { boolean, integer, pgTable, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core'

// Users (supports Google OAuth and Email auth)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  authId: varchar('auth_id', { length: 255 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  avatar: text('avatar'),
  role: varchar('role', { length: 50 }), // 'super_admin', 'academic_lead', 'it_graphics_lead', 'field_specialist', 'agent'
  status: varchar('status', { length: 20 }).notNull().default('active'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const settings = pgTable('settings', {
  id: integer('id').primaryKey().default(1),
  whatsappNumber: varchar('whatsapp_number', { length: 20 }).default('233206478727'),
  telegramUsername: varchar('telegram_username', { length: 50 }).default('GeminiNexusAdmin'),
  instagramUsername: varchar('instagram_username', { length: 50 }).default('GeminiNexusAdmin'),
  snapchatUsername: varchar('snapchat_username', { length: 50 }).default('GeminiNexus'),
  telegramBotToken: text('telegram_bot_token').default(''),
  telegramChatId: varchar('telegram_chat_id', { length: 50 }).default(''),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// Conversations (chat sessions with clients)
export const conversations = pgTable('conversations', {
  id: serial('id').primaryKey(),
  clientName: varchar('client_name', { length: 255 }).notNull(),
  clientEmail: varchar('client_email', { length: 255 }),
  status: varchar('status', { length: 20 }).default('active'), // 'active', 'closed'
  assignedTo: integer('assigned_to').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Messages in conversations
export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  conversationId: integer('conversation_id').references(() => conversations.id),
  senderType: varchar('sender_type', { length: 20 }).notNull(), // 'client' or 'agent'
  senderId: integer('sender_id').references(() => users.id),
  content: text('content').notNull(),
  read: boolean('read').default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// File uploads
export const uploads = pgTable('uploads', {
  id: serial('id').primaryKey(),
  conversationId: integer('conversation_id').references(() => conversations.id),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  fileUrl: text('file_url').notNull(),
  fileType: varchar('file_type', { length: 100 }),
  fileSize: integer('file_size'),
  uploadedBy: varchar('uploaded_by', { length: 20 }).notNull(), // 'client' or 'agent'
  userId: integer('user_id').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
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
  assignedTo: integer('assigned_to').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Conversation = typeof conversations.$inferSelect
export type Message = typeof messages.$inferSelect
export type Upload = typeof uploads.$inferSelect
export type Submission = typeof submissions.$inferSelect
