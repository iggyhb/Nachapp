import { db } from '@/lib/db/client';
import { users, modules } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export interface UserSettings {
  displayName: string;
  timezone: string;
  theme: 'light' | 'dark' | 'auto';
  locale: string;
}

export interface ModuleConfig {
  id: string;
  key: string;
  name: string;
  isEnabled: boolean;
  configJson?: Record<string, unknown>;
}

/**
 * Servicio de configuración de usuario
 */
export const settingsService = {
  /**
   * Obtiene la configuración del usuario
   */
  async getUserSettings(userId: string): Promise<UserSettings | null> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return null;
    }

    return {
      displayName: user.displayName,
      timezone: user.timezone || 'UTC',
      theme: (user.theme as 'light' | 'dark' | 'auto') || 'auto',
      locale: user.locale || 'es',
    };
  },

  /**
   * Actualiza la configuración del usuario
   */
  async updateUserSettings(
    userId: string,
    settings: Partial<UserSettings>,
  ): Promise<UserSettings | null> {
    await db
      .update(users)
      .set({
        displayName: settings.displayName,
        timezone: settings.timezone,
        theme: settings.theme,
        locale: settings.locale,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return this.getUserSettings(userId);
  },

  /**
   * Obtiene la configuración de un módulo
   */
  async getModuleConfig(moduleKey: string): Promise<ModuleConfig | null> {
    const module = await db.query.modules.findFirst({
      where: eq(modules.key, moduleKey),
    });

    if (!module) {
      return null;
    }

    return {
      id: module.id,
      key: module.key,
      name: module.name,
      isEnabled: module.isEnabled ?? false,
      configJson: (module.configJson || {}) as Record<string, unknown>,
    };
  },

  /**
   * Obtiene todos los módulos
   */
  async getAllModules(): Promise<ModuleConfig[]> {
    const allModules = await db.query.modules.findMany();

    return allModules.map((module) => ({
      id: module.id,
      key: module.key,
      name: module.name,
      isEnabled: module.isEnabled ?? false,
      configJson: (module.configJson || {}) as Record<string, unknown>,
    }));
  },

  /**
   * Actualiza la configuración de un módulo
   */
  async updateModuleConfig(
    moduleKey: string,
    config: Partial<ModuleConfig>,
  ): Promise<ModuleConfig | null> {
    await db
      .update(modules)
      .set({
        isEnabled: config.isEnabled,
        configJson: config.configJson,
        updatedAt: new Date(),
      })
      .where(eq(modules.key, moduleKey));

    return this.getModuleConfig(moduleKey);
  },

  /**
   * Inicializa módulos por defecto
   */
  async initializeDefaultModules(): Promise<void> {
    const defaultModules: ModuleConfig[] = [
      {
        id: 'mod-1',
        key: 'readings',
        name: 'Daily Readings',
        isEnabled: true,
      },
      {
        id: 'mod-2',
        key: 'practices',
        name: 'Spiritual Practices',
        isEnabled: true,
      },
      {
        id: 'mod-3',
        key: 'liturgy',
        name: 'Official Liturgy',
        isEnabled: true,
      },
      {
        id: 'mod-4',
        key: 'ai_chat',
        name: 'AI Chat Assistant',
        isEnabled: true,
      },
    ];

    for (const mod of defaultModules) {
      try {
        await db.insert(modules).values({
          id: mod.id,
          key: mod.key,
          name: mod.name,
          isEnabled: mod.isEnabled,
          configJson: mod.configJson,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } catch (error) {
        // Module already exists, skip
        console.log(`Module ${mod.key} already initialized`);
      }
    }
  },
};
