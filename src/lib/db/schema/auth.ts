import {
  pgTable,
  text,
  varchar,
  timestamp,
  boolean,
  index,
  uniqueIndex,
  json,
  integer,
} from 'drizzle-orm/pg-core';

/**
 * Tabla de usuarios - almacena información del usuario autenticado
 */
export const users = pgTable(
  'users',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    displayName: varchar('display_name', { length: 255 }).notNull(),
    timezone: varchar('timezone', { length: 64 }).default('UTC'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    theme: varchar('theme', { length: 20 }).default('auto'),
    locale: varchar('locale', { length: 10 }).default('es'),
    isActive: boolean('is_active').default(true),
    lastLogin: timestamp('last_login'),
  },
  (table) => {
    return {
      emailIdx: uniqueIndex('users_email_idx').on(table.email),
      activeIdx: index('users_is_active_idx').on(table.isActive),
    };
  },
);

/**
 * Tabla de credenciales de passkey/WebAuthn
 */
export const passkeys = pgTable(
  'passkeys',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    userId: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    credentialId: text('credential_id').notNull(),
    publicKey: text('public_key').notNull(),
    counter: integer('counter').default(0),
    transports: json('transports'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    name: varchar('name', { length: 255 }).default('My Device'),
  },
  (table) => {
    return {
      userIdIdx: index('passkeys_user_id_idx').on(table.userId),
      credentialIdIdx: uniqueIndex('passkeys_credential_id_idx').on(
        table.credentialId,
      ),
    };
  },
);

/**
 * Tabla de credenciales PIN
 */
export const pinCredentials = pgTable(
  'pin_credentials',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    userId: varchar('user_id', { length: 36 })
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    pinHash: text('pin_hash').notNull(),
    failedAttempts: integer('failed_attempts').default(0),
    lockedUntil: timestamp('locked_until'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => {
    return {
      userIdIdx: uniqueIndex('pin_credentials_user_id_idx').on(table.userId),
    };
  },
);

/**
 * Tabla de sesiones JWT
 */
export const sessions = pgTable(
  'sessions',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    userId: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
  },
  (table) => {
    return {
      userIdIdx: index('sessions_user_id_idx').on(table.userId),
      expiresAtIdx: index('sessions_expires_at_idx').on(table.expiresAt),
    };
  },
);

/**
 * Tabla de auditoría - registro de eventos de seguridad
 */
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    userId: varchar('user_id', { length: 36 }).references(() => users.id, {
      onDelete: 'set null',
    }),
    action: varchar('action', { length: 100 }).notNull(),
    resource: varchar('resource', { length: 100 }),
    resourceId: varchar('resource_id', { length: 36 }),
    status: varchar('status', { length: 20 }).notNull(), // success, failed
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    metadata: json('metadata'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => {
    return {
      userIdIdx: index('audit_logs_user_id_idx').on(table.userId),
      actionIdx: index('audit_logs_action_idx').on(table.action),
      createdAtIdx: index('audit_logs_created_at_idx').on(table.createdAt),
    };
  },
);
