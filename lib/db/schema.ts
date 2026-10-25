import { boolean, integer, jsonb, numeric, pgTable, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core'

// Users (supports Google OAuth and Email auth)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  authId: varchar('auth_id', { length: 255 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  avatar: text('avatar'),
  role: varchar('role', { length: 50 }), // 'super_admin', 'academic_lead', 'it_graphics_lead', 'field_specialist', 'agent'
  status: varchar('status', { length: 20 }).notNull().default('active'),
  field: varchar('field', { length: 30 }), // 'academic' | 'media' | 'systems'
  referralCode: varchar('referral_code', { length: 20 }).unique(),
  profile: jsonb('profile'),
  onboardedAt: timestamp('onboarded_at'),
  signupNotified: boolean('signup_notified').notNull().default(false),
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
  fileRetentionDays: integer('file_retention_days').notNull().default(7),
  chatGreeting: text('chat_greeting'),
  chatAwayMessage: text('chat_away_message'),
  visitAlertAt: timestamp('visit_alert_at', { withTimezone: true }),
  autoReplyEnabled: boolean('auto_reply_enabled').notNull().default(true),
  commissionPercent: numeric('commission_percent', { precision: 5, scale: 2 }).default('10'),
  vapidPublicKey: text('vapid_public_key'),
  vapidPrivateKey: text('vapid_private_key'),
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
  title: varchar('title', { length: 120 }),
  scope: varchar('scope', { length: 50 }),
  urgency: varchar('urgency', { length: 50 }),
  clientContact: varchar('client_contact', { length: 50 }),
  briefDetails: text('brief_details'),
  fileUrls: text('file_urls'),
  status: varchar('status', { length: 30 }).default('Pending Quote'),
  assignedTo: integer('assigned_to').references(() => users.id),
  referredBy: integer('referred_by').references(() => users.id),
  priceGhs: numeric('price_ghs', { precision: 10, scale: 2 }),
  commissionGhs: numeric('commission_ghs', { precision: 10, scale: 2 }),
  referralCommissionGhs: numeric('referral_commission_ghs', { precision: 10, scale: 2 }),
  assignedAt: timestamp('assigned_at'),
  paidAt: timestamp('paid_at'),
  createdAt: timestamp('created_at').defaultNow(),
})

// Staff announcements (field = null means everyone)
export const announcements = pgTable('announcements', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 120 }).notNull(),
  body: text('body').notNull(),
  field: varchar('field', { length: 30 }),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// Web Push subscriptions (one per staff browser/device)
export const pushSubscriptions = pgTable('push_subscriptions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  endpoint: text('endpoint').notNull().unique(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
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

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Conversation = typeof conversations.$inferSelect
export type Message = typeof messages.$inferSelect
export type Upload = typeof uploads.$inferSelect
export type Submission = typeof submissions.$inferSelect

// Chatbot knowledge base: powers the homepage chatbot AND automatic replies in live chat
export const chatbotReplies = pgTable('chatbot_replies', {
  id: serial('id').primaryKey(),
  question: varchar('question', { length: 120 }).notNull(),
  keywords: text('keywords').notNull(),
  reply: text('reply').notNull(),
  sort: integer('sort').notNull().default(0),
  enabled: boolean('enabled').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// Questions the chatbot couldn't answer (so admins can add answers)
export const chatbotMisses = pgTable('chatbot_misses', {
  id: serial('id').primaryKey(),
  question: varchar('question', { length: 300 }).notNull().unique(),
  hits: integer('hits').notNull().default(1),
  lastAt: timestamp('last_at').notNull().defaultNow(),
})

// In-app notification inbox (the bell). Every push is also stored here.
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 160 }).notNull(),
  body: text('body'),
  url: varchar('url', { length: 300 }),
  tag: varchar('tag', { length: 80 }),
  read: boolean('read').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
