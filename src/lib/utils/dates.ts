/**
 * Utilidades para manejo de fechas y zonas horarias
 */

/**
 * Convierte una fecha a la zona horaria especificada
 */
export function convertToTimezone(
  date: Date,
  timezone: string,
): Date {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(date);
    const values = parts.reduce(
      (acc, part) => {
        acc[part.type] = part.value;
        return acc;
      },
      {} as Record<string, string>,
    );

    const tzDate = new Date(
      parseInt(values.year, 10),
      parseInt(values.month, 10) - 1,
      parseInt(values.day, 10),
      parseInt(values.hour, 10),
      parseInt(values.minute, 10),
      parseInt(values.second, 10),
    );

    return tzDate;
  } catch {
    return date;
  }
}

/**
 * Formatea una fecha en la zona horaria especificada
 */
export function formatInTimezone(
  date: Date,
  timezone: string,
  format: 'short' | 'medium' | 'long' = 'medium',
): string {
  const options: Intl.DateTimeFormatOptions =
    format === 'short'
      ? {
          timeZone: timezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }
      : format === 'long'
        ? {
          timeZone: timezone,
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }
        : {
          timeZone: timezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        };

  return new Intl.DateTimeFormat('es-ES', options).format(date);
}

/**
 * Obtiene el offset UTC de una zona horaria
 */
export function getTimezoneOffset(timezone: string): number {
  const now = new Date();
  const utcDate = new Date(
    now.toLocaleString('en-US', { timeZone: 'UTC' }),
  );
  const tzDate = new Date(
    now.toLocaleString('en-US', { timeZone: timezone }),
  );

  return (tzDate.getTime() - utcDate.getTime()) / (1000 * 60);
}

/**
 * Comprueba si hoy es un determinado día de la semana
 */
export function isToday(date: Date, timezone: string): boolean {
  const now = new Date();
  const today = convertToTimezone(now, timezone);
  const target = convertToTimezone(date, timezone);

  return (
    today.getDate() === target.getDate() &&
    today.getMonth() === target.getMonth() &&
    today.getFullYear() === target.getFullYear()
  );
}

/**
 * Obtiene el inicio del día en la zona horaria especificada
 */
export function getStartOfDay(timezone: string, date?: Date): Date {
  const targetDate = date || new Date();
  const tzDate = convertToTimezone(targetDate, timezone);

  return new Date(
    tzDate.getFullYear(),
    tzDate.getMonth(),
    tzDate.getDate(),
    0,
    0,
    0,
    0,
  );
}

/**
 * Obtiene el final del día en la zona horaria especificada
 */
export function getEndOfDay(timezone: string, date?: Date): Date {
  const targetDate = date || new Date();
  const tzDate = convertToTimezone(targetDate, timezone);

  return new Date(
    tzDate.getFullYear(),
    tzDate.getMonth(),
    tzDate.getDate(),
    23,
    59,
    59,
    999,
  );
}

/**
 * Calcula días desde una fecha
 */
export function daysFromNow(date: Date): number {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Valida si una zona horaria es válida
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}
