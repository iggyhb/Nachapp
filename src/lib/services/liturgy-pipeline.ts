import { db } from '@/lib/db/client';
import {
  dailyLiturgyEntries,
  sourceCitations,
} from '@/lib/db/schema/liturgy';
import { AIGateway } from '@/lib/ai/gateway';
import { fetchDailyReadings, LiturgicalReadings } from './liturgy-fetcher';
import { eq, and } from 'drizzle-orm';

export interface GenerationConfig {
  provider?: 'anthropic' | 'openai';
  model?: string;
  includePatristicSources?: boolean;
  maxReflectionLength?: number; // words
  tone?: 'contemplative' | 'practical' | 'academic';
}

export interface LiturgyResult {
  id: string;
  status: 'pending' | 'fetching' | 'generating' | 'completed' | 'failed';
  summaryText?: string;
  reflectionText?: string;
  practicalPoint?: string;
  citations?: Array<{
    sourceType: string;
    author?: string;
    work?: string;
    citationRef?: string;
    excerpt: string;
    sourceUrl?: string;
  }>;
  errorMessage?: string;
  aiProvider?: string;
  aiModel?: string;
  aiTokensUsed?: number;
  aiCostUsd?: string;
}

interface AIPromptResponse {
  summary: string;
  reflection: string;
  practicalPoint: string;
  citations?: Array<{
    sourceType: string;
    author?: string;
    work?: string;
    citationRef?: string;
    excerpt: string;
    sourceUrl?: string;
  }>;
}

/**
 * Valida que una respuesta de IA sea un JSON válido estructurado
 */
function validateAIResponse(content: string): AIPromptResponse {
  // Intenta extraer JSON de la respuesta
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in AI response');
  }

  const parsed = JSON.parse(jsonMatch[0]) as AIPromptResponse;

  if (!parsed.summary || !parsed.reflection || !parsed.practicalPoint) {
    throw new Error('AI response missing required fields');
  }

  return parsed;
}

/**
 * Crea un prompt del sistema que enfatiza la prohibición de inventar citas
 */
function createSystemPrompt(): string {
  return `Eres un asistente católico fiel y reverente especializado en liturgia y espiritualidad cristiana.

Tu tarea CRÍTICA es generar una breve reflexión espiritual basada EXCLUSIVAMENTE en las lecturas proporcionadas.

REGLAS OBLIGATORIAS:
1. NUNCA inventes citas o atribuciones que no existan en el material proporcionado
2. NUNCA cites autores patrísticos, magisteriales o teológicos a menos que tengas el texto exacto
3. Si incluyes una cita, debes indicar su fuente exacta (autor, obra, referencia)
4. Solo puedes trabajar con:
   - Las lecturas bíblicas proporcionadas
   - Conocimiento general de la doctrina católica (sin citas específicas a menos que las conozcas exactamente)
5. Si no tienes una fuente real, NO la cites. En su lugar, expresa la idea en tus propias palabras
6. La reflexión debe ser profunda pero accesible para un católico devoto

Responde SIEMPRE en formato JSON con esta estructura exacta:
{
  "summary": "Resumen breve de las lecturas del día (2-3 oraciones)",
  "reflection": "Reflexión espiritual conectando las lecturas (1-2 párrafos)",
  "practicalPoint": "Un punto práctico y concreto para vivir hoy",
  "citations": [
    {
      "sourceType": "patristic|magisterium|catechism|scripture|commentary",
      "author": "Nombre del autor (si aplica)",
      "work": "Título de la obra",
      "citationRef": "Referencia exacta",
      "excerpt": "El texto citado exacto"
    }
  ]
}`;
}

/**
 * Construye el prompt de usuario con las lecturas
 */
function createUserPrompt(readings: LiturgicalReadings, config: GenerationConfig): string {
  const basePrompt = `
# Lecturas de hoy: ${readings.date}
${readings.feastName ? `Festividad: ${readings.feastName}` : ''}
Temporada litúrgica: ${readings.season}
Color litúrgico: ${readings.color}

## Primera Lectura
Referencia: ${readings.firstReading.reference}
${readings.firstReading.text}

## Salmo
Referencia: ${readings.psalm.reference}
${readings.psalm.text}

${readings.secondReading ? `## Segunda Lectura
Referencia: ${readings.secondReading.reference}
${readings.secondReading.text}

` : ''}## Evangelio
Referencia: ${readings.gospel.reference}
${readings.gospel.text}

---

Por favor, genera una reflexión espiritual basada EXCLUSIVAMENTE en estas lecturas.
${config.tone === 'contemplative' ? 'Tono: Contemplativo y meditativo.' : ''}
${config.tone === 'practical' ? 'Tono: Práctico y aplicable a la vida diaria.' : ''}
${config.tone === 'academic' ? 'Tono: Académico y doctrinal.' : ''}
${config.maxReflectionLength ? `La reflexión no debe exceder ${config.maxReflectionLength} palabras.` : ''}

RECUERDA: No inventes citas. Solo cita si tienes el texto exacto.
`;

  return basePrompt;
}

/**
 * Pipeline principal: genera la liturgia diaria
 * @param userId - ID del usuario
 * @param date - Fecha en formato YYYY-MM-DD
 * @param config - Configuración de generación (proveedor, modelo, tono)
 * @returns Resultado de la generación
 */
export async function generateDailyLiturgy(
  userId: string,
  date: string,
  config?: GenerationConfig,
): Promise<LiturgyResult> {
  const finalConfig = {
    provider: 'anthropic' as const,
    model: 'claude-3-5-sonnet-20241022',
    tone: 'contemplative' as const,
    ...config,
  };

  let entryId: string = '';
  let entry: typeof dailyLiturgyEntries.$inferSelect | null = null;

  try {
    // Step 1: Verificar si ya existe una entrada completada
    const existing = await db
      .select()
      .from(dailyLiturgyEntries)
      .where(
        and(
          eq(dailyLiturgyEntries.userId, userId),
          eq(dailyLiturgyEntries.liturgyDate, date),
          eq(dailyLiturgyEntries.status, 'completed'),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      entry = existing[0];
      entryId = entry.id;
      return {
        id: entryId,
        status: 'completed',
        summaryText: entry.summaryText || undefined,
        reflectionText: entry.reflectionText || undefined,
        practicalPoint: entry.practicalPoint || undefined,
        aiProvider: entry.aiProvider || undefined,
        aiModel: entry.aiModel || undefined,
        aiTokensUsed: entry.aiTokensUsed || undefined,
        aiCostUsd: entry.aiCostUsd || undefined,
      };
    }

    // Step 2: Crear o actualizar entrada con status 'fetching'
    const now = new Date();
    const existingAny = await db
      .select()
      .from(dailyLiturgyEntries)
      .where(
        and(
          eq(dailyLiturgyEntries.userId, userId),
          eq(dailyLiturgyEntries.liturgyDate, date),
        ),
      )
      .limit(1);

    if (existingAny.length > 0) {
      entry = existingAny[0];
      entryId = entry.id;
      await db
        .update(dailyLiturgyEntries)
        .set({ status: 'fetching', updatedAt: now })
        .where(eq(dailyLiturgyEntries.id, entryId));
    } else {
      entryId = crypto.randomUUID();
      entry = {
        id: entryId,
        userId,
        liturgyDate: date,
        status: 'fetching',
        createdAt: now,
        updatedAt: now,
      } as any;
      await db.insert(dailyLiturgyEntries).values({
        id: entryId,
        userId,
        liturgyDate: date,
        status: 'fetching',
        createdAt: now,
        updatedAt: now,
      });
    }

    // Step 3: Obtener lecturas
    const readings = await fetchDailyReadings(date);

    // Step 4: Actualizar entrada con lecturas y cambiar status a 'generating'
    await db
      .update(dailyLiturgyEntries)
      .set({
        readingsJson: readings as any,
        status: 'generating',
        liturgicalSeason: readings.season,
        liturgicalColor: readings.color,
        feastName: readings.feastName,
        updatedAt: new Date(),
      })
      .where(eq(dailyLiturgyEntries.id, entryId));

    // Step 5: Construir prompt y llamar a IA
    const systemPrompt = createSystemPrompt();
    const userPrompt = createUserPrompt(readings, finalConfig);

    const aiResponse = await AIGateway.generateResponse({
      task: 'liturgy-daily-reflection',
      messages: [
        { role: 'user', content: systemPrompt + '\n\n' + userPrompt },
      ],
      config: {
        provider: finalConfig.provider,
        model: finalConfig.model,
        maxTokens: 2048,
        temperature: 0.7,
      },
    });

    // Step 6: Parsear respuesta de IA
    let parsedResponse: AIPromptResponse;
    try {
      parsedResponse = validateAIResponse(aiResponse.content);
    } catch (parseError) {
      throw new Error(
        `Failed to parse AI response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
      );
    }

    // Step 7: Guardar reflexión y citas
    const citations = parsedResponse.citations || [];

    await db
      .update(dailyLiturgyEntries)
      .set({
        status: 'completed',
        summaryText: parsedResponse.summary,
        reflectionText: parsedResponse.reflection,
        practicalPoint: parsedResponse.practicalPoint,
        aiProvider: aiResponse.provider,
        aiModel: aiResponse.model,
        aiTokensUsed: aiResponse.usage.inputTokens + aiResponse.usage.outputTokens,
        aiCostUsd: aiResponse.usage.cost.toFixed(6),
        updatedAt: new Date(),
      })
      .where(eq(dailyLiturgyEntries.id, entryId));

    // Guardar las citas
    for (const citation of citations) {
      await db.insert(sourceCitations).values({
        id: crypto.randomUUID(),
        liturgyEntryId: entryId,
        sourceType: citation.sourceType,
        author: citation.author,
        work: citation.work,
        citationRef: citation.citationRef,
        excerpt: citation.excerpt,
        sourceUrl: citation.sourceUrl,
        createdAt: new Date(),
      });
    }

    // Step 8: Retornar resultado
    return {
      id: entryId,
      status: 'completed',
      summaryText: parsedResponse.summary,
      reflectionText: parsedResponse.reflection,
      practicalPoint: parsedResponse.practicalPoint,
      citations: citations,
      aiProvider: aiResponse.provider,
      aiModel: aiResponse.model,
      aiTokensUsed: aiResponse.usage.inputTokens + aiResponse.usage.outputTokens,
      aiCostUsd: aiResponse.usage.cost.toFixed(6),
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Liturgy Pipeline] Error generating liturgy:', errorMsg);

    // Step 10: Si hay error, actualizar status a 'failed'
    if (entryId) {
      await db
        .update(dailyLiturgyEntries)
        .set({
          status: 'failed',
          errorMessage: errorMsg,
          updatedAt: new Date(),
        })
        .where(eq(dailyLiturgyEntries.id, entryId));
    }

    return {
      id: entryId,
      status: 'failed',
      errorMessage: errorMsg,
    };
  }
}

/**
 * Regenera la reflexión para una entrada existente
 * @param entryId - ID de la entrada a regenerar
 * @param userId - ID del usuario (para verificación de permisos)
 * @param config - Configuración de generación
 * @returns Resultado de la regeneración
 */
export async function regenerateLiturgy(
  entryId: string,
  userId: string,
  config?: GenerationConfig,
): Promise<LiturgyResult> {
  try {
    // Obtener la entrada
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
      throw new Error('Liturgy entry not found or unauthorized');
    }

    const entry = entries[0];

    if (!entry.readingsJson) {
      throw new Error('Readings not found for this entry');
    }

    // Eliminar citas antiguas
    await db
      .delete(sourceCitations)
      .where(eq(sourceCitations.liturgyEntryId, entryId));

    // Usar la misma fecha para regenerar
    return generateDailyLiturgy(userId, entry.liturgyDate, config);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Liturgy Pipeline] Error regenerating liturgy:', errorMsg);

    return {
      id: entryId,
      status: 'failed',
      errorMessage: errorMsg,
    };
  }
}
