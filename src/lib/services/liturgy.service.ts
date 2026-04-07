import { db } from '@/lib/db/client';
import {
  dailyLiturgyEntries,
  sourceCitations,
} from '@/lib/db/schema/liturgy';
import {
  generateDailyLiturgy,
  regenerateLiturgy,
  type GenerationConfig,
  type LiturgyResult,
} from './liturgy-pipeline';
import { eq, and, desc, between } from 'drizzle-orm';

export interface LiturgyEntry {
  id: string;
  userId: string;
  liturgyDate: string;
  liturgicalSeason?: string;
  liturgicalColor?: string;
  feastName?: string;
  summaryText?: string;
  reflectionText?: string;
  practicalPoint?: string;
  status: 'pending' | 'fetching' | 'generating' | 'completed' | 'failed';
  aiProvider?: string;
  aiModel?: string;
  aiTokensUsed?: number;
  aiCostUsd?: string;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LiturgyEntryWithCitations extends LiturgyEntry {
  citations: Array<{
    id: string;
    sourceType: string;
    author?: string;
    work?: string;
    citationRef?: string;
    excerpt: string;
    sourceUrl?: string;
  }>;
}

export interface LiturgyHistoryResponse {
  entries: LiturgyEntry[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface CalendarOverviewDay {
  date: string;
  status: 'pending' | 'fetching' | 'generating' | 'completed' | 'failed';
  season: string;
  color: string;
  feastName?: string;
}

export interface CalendarOverview {
  year: number;
  month: number;
  days: CalendarOverviewDay[];
}

/**
 * Obtiene o genera la entrada de liturgia diaria
 * @param userId - ID del usuario
 * @param date - Fecha en formato YYYY-MM-DD
 * @returns Entrada de liturgia diaria
 */
export async function getDailyLiturgy(
  userId: string,
  date: string,
): Promise<LiturgyEntryWithCitations> {
  // Primero intentar obtener la entrada
  const existing = await db
    .select()
    .from(dailyLiturgyEntries)
    .where(
      and(
        eq(dailyLiturgyEntries.userId, userId),
        eq(dailyLiturgyEntries.liturgyDate, date),
      ),
    )
    .limit(1);

  let entry = existing[0];

  // Si no existe, generar
  if (!entry) {
    const result = await generateDailyLiturgy(userId, date);
    if (result.status === 'failed') {
      throw new Error(result.errorMessage || 'Failed to generate daily liturgy');
    }

    const newEntries = await db
      .select()
      .from(dailyLiturgyEntries)
      .where(eq(dailyLiturgyEntries.id, result.id))
      .limit(1);

    entry = newEntries[0];
  }

  // Obtener las citas asociadas
  const citations = await db
    .select()
    .from(sourceCitations)
    .where(eq(sourceCitations.liturgyEntryId, entry.id));

  return {
    id: entry.id,
    userId: entry.userId,
    liturgyDate: entry.liturgyDate,
    liturgicalSeason: entry.liturgicalSeason || undefined,
    liturgicalColor: entry.liturgicalColor || undefined,
    feastName: entry.feastName || undefined,
    summaryText: entry.summaryText || undefined,
    reflectionText: entry.reflectionText || undefined,
    practicalPoint: entry.practicalPoint || undefined,
    status: entry.status as any,
    aiProvider: entry.aiProvider || undefined,
    aiModel: entry.aiModel || undefined,
    aiTokensUsed: entry.aiTokensUsed || undefined,
    aiCostUsd: entry.aiCostUsd || undefined,
    errorMessage: entry.errorMessage || undefined,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    citations: citations.map((c) => ({
      id: c.id,
      sourceType: c.sourceType,
      author: c.author || undefined,
      work: c.work || undefined,
      citationRef: c.citationRef || undefined,
      excerpt: c.excerpt,
      sourceUrl: c.sourceUrl || undefined,
    })),
  };
}

/**
 * Obtiene una entrada de liturgia sin generar si no existe
 * @param entryId - ID de la entrada
 * @returns Entrada con citas asociadas
 */
export async function getLiturgyEntry(
  entryId: string,
): Promise<LiturgyEntryWithCitations | null> {
  const entries = await db
    .select()
    .from(dailyLiturgyEntries)
    .where(eq(dailyLiturgyEntries.id, entryId))
    .limit(1);

  if (entries.length === 0) {
    return null;
  }

  const entry = entries[0];

  const citations = await db
    .select()
    .from(sourceCitations)
    .where(eq(sourceCitations.liturgyEntryId, entry.id));

  return {
    id: entry.id,
    userId: entry.userId,
    liturgyDate: entry.liturgyDate,
    liturgicalSeason: entry.liturgicalSeason || undefined,
    liturgicalColor: entry.liturgicalColor || undefined,
    feastName: entry.feastName || undefined,
    summaryText: entry.summaryText || undefined,
    reflectionText: entry.reflectionText || undefined,
    practicalPoint: entry.practicalPoint || undefined,
    status: entry.status as any,
    aiProvider: entry.aiProvider || undefined,
    aiModel: entry.aiModel || undefined,
    aiTokensUsed: entry.aiTokensUsed || undefined,
    aiCostUsd: entry.aiCostUsd || undefined,
    errorMessage: entry.errorMessage || undefined,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    citations: citations.map((c) => ({
      id: c.id,
      sourceType: c.sourceType,
      author: c.author || undefined,
      work: c.work || undefined,
      citationRef: c.citationRef || undefined,
      excerpt: c.excerpt,
      sourceUrl: c.sourceUrl || undefined,
    })),
  };
}

/**
 * Obtiene el historial de entradas de liturgia con filtros y paginación
 * @param userId - ID del usuario
 * @param filters - Filtros opcionales (fechas, temporada, estado)
 * @param page - Número de página (por defecto 1)
 * @param limit - Límite de resultados por página (por defecto 10, máximo 100)
 * @returns Historial de liturgia con información de paginación
 */
export async function getLiturgyHistory(
  userId: string,
  filters?: {
    startDate?: string;
    endDate?: string;
    season?: string;
    status?: string;
  },
  page: number = 1,
  limit: number = 10,
): Promise<LiturgyHistoryResponse> {
  // Validar límite
  const finalLimit = Math.min(limit, 100);
  const offset = (page - 1) * finalLimit;

  // Construir condiciones de filtro
  const conditions: any[] = [eq(dailyLiturgyEntries.userId, userId)];

  if (filters?.startDate && filters?.endDate) {
    conditions.push(
      between(dailyLiturgyEntries.liturgyDate, filters.startDate, filters.endDate),
    );
  }

  if (filters?.season) {
    conditions.push(eq(dailyLiturgyEntries.liturgicalSeason, filters.season));
  }

  if (filters?.status) {
    conditions.push(eq(dailyLiturgyEntries.status, filters.status));
  }

  const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

  // Obtener total de registros
  const countResult = await db
    .select({ count: dailyLiturgyEntries.id })
    .from(dailyLiturgyEntries)
    .where(whereClause);

  const total = countResult.length > 0 ? parseInt(countResult[0].count, 10) : 0;

  // Obtener registros paginados
  const entries = await db
    .select()
    .from(dailyLiturgyEntries)
    .where(whereClause)
    .orderBy(desc(dailyLiturgyEntries.liturgyDate))
    .limit(finalLimit)
    .offset(offset);

  return {
    entries: entries.map((e) => ({
      id: e.id,
      userId: e.userId,
      liturgyDate: e.liturgyDate,
      liturgicalSeason: e.liturgicalSeason || undefined,
      liturgicalColor: e.liturgicalColor || undefined,
      feastName: e.feastName || undefined,
      summaryText: e.summaryText || undefined,
      reflectionText: e.reflectionText || undefined,
      practicalPoint: e.practicalPoint || undefined,
      status: e.status as any,
      aiProvider: e.aiProvider || undefined,
      aiModel: e.aiModel || undefined,
      aiTokensUsed: e.aiTokensUsed || undefined,
      aiCostUsd: e.aiCostUsd || undefined,
      errorMessage: e.errorMessage || undefined,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    })),
    total,
    page,
    limit: finalLimit,
    hasMore: offset + finalLimit < total,
  };
}

/**
 * Regenera la reflexión para una entrada de liturgia
 * @param entryId - ID de la entrada a regenerar
 * @param userId - ID del usuario
 * @param config - Configuración de generación
 * @returns Resultado de la regeneración
 */
export async function regenerateEntry(
  entryId: string,
  userId: string,
  config?: GenerationConfig,
): Promise<LiturgyResult> {
  return regenerateLiturgy(entryId, userId, config);
}

/**
 * Obtiene un resumen del calendario con los días que tienen entradas de liturgia
 * @param userId - ID del usuario
 * @param year - Año (YYYY)
 * @param month - Mes (1-12)
 * @returns Datos de calendario con estado de cada día
 */
export async function getCalendarOverview(
  userId: string,
  year: number,
  month: number,
): Promise<CalendarOverview> {
  // Calcular rango de fechas para el mes
  const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];

  // Obtener todas las entradas para el mes
  const entries = await db
    .select()
    .from(dailyLiturgyEntries)
    .where(
      and(
        eq(dailyLiturgyEntries.userId, userId),
        between(dailyLiturgyEntries.liturgyDate, startDate, endDate),
      ),
    );

  // Mapear a días del calendario
  const daysInMonth = new Date(year, month, 0).getDate();
  const days: CalendarOverviewDay[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const entry = entries.find((e) => e.liturgyDate === dateStr);

    if (entry) {
      days.push({
        date: dateStr,
        status: entry.status as any,
        season: entry.liturgicalSeason || 'ordinario',
        color: entry.liturgicalColor || 'verde',
        feastName: entry.feastName || undefined,
      });
    }
  }

  return {
    year,
    month,
    days,
  };
}

/**
 * Elimina una entrada de liturgia
 * @param entryId - ID de la entrada a eliminar
 * @param userId - ID del usuario (para verificación de permisos)
 * @returns true si se eliminó correctamente, false si no existe
 */
export async function deleteLiturgyEntry(
  entryId: string,
  userId: string,
): Promise<boolean> {
  const entries = await db
    .select()
    .from(dailyLiturgyEntries)
    .where(
      and(
        eq(dailyLiturgyEntries.id, entryId),
        eq(dailyLiturgyEntries.userId, userId),
      ),
    )
    .limit(1);

  if (entries.length === 0) {
    return false;
  }

  // Eliminar citas asociadas (cascada automática)
  await db
    .delete(sourceCitations)
    .where(eq(sourceCitations.liturgyEntryId, entryId));

  // Eliminar entrada
  await db
    .delete(dailyLiturgyEntries)
    .where(eq(dailyLiturgyEntries.id, entryId));

  return true;
}
