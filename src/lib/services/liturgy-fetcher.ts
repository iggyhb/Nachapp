/**
 * Servicio para obtener las lecturas litúrgicas diarias
 * Utiliza la API pública de Evangelizo
 */

export interface ReadingEntry {
  reference: string; // e.g., "Gn 1,1-19"
  title: string; // e.g., "Primera lectura"
  text: string; // texto completo de la lectura
}

export interface LiturgicalReadings {
  date: string;
  season: string;
  color: string;
  feastName: string | null;
  firstReading: ReadingEntry;
  psalm: ReadingEntry;
  secondReading: ReadingEntry | null; // solo en domingos y festividades
  gospel: ReadingEntry;
}

/**
 * Determina la temporada litúrgica basada en la fecha
 * Aproximación simple basada en rangos de fechas
 */
function getLiturgicalSeasonByDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const month = date.getMonth() + 1;
  const day = date.getDate();

  // Adviento: ~4 domingos antes del 25 de diciembre (aproximadamente del 27 nov al 24 dic)
  if ((month === 11 && day >= 27) || (month === 12 && day <= 24)) {
    return 'adviento';
  }

  // Navidad: 25 de diciembre a Epifanía (6 de enero)
  if ((month === 12 && day >= 25) || (month === 1 && day <= 6)) {
    return 'navidad';
  }

  // Cuaresma: Miércoles de Ceniza a Domingo de Ramos
  // Miércoles de Ceniza: 46 días antes de Pascua
  // Aproximación: febrero-marzo
  if (month === 2 || month === 3) {
    return 'cuaresma';
  }

  // Pascua: Domingo de Resurrección a Pentecostés (50 días)
  // Aproximación: abril
  if (month === 4) {
    return 'pascua';
  }

  // Ordinario: el resto
  return 'ordinario';
}

/**
 * Mapea colores litúrgicos en la API a nuestros colores estándar
 */
function normalizeLiturgicalColor(apiColor?: string): string {
  if (!apiColor) return 'verde';

  const colorMap: Record<string, string> = {
    'green': 'verde',
    'verde': 'verde',
    'white': 'blanco',
    'blanco': 'blanco',
    'red': 'rojo',
    'rojo': 'rojo',
    'purple': 'morado',
    'morado': 'morado',
    'pink': 'rosa',
    'rosa': 'rosa',
  };

  return colorMap[apiColor.toLowerCase()] || 'verde';
}

/**
 * Parsea la respuesta de la API de Evangelizo
 * Maneja casos donde faltan campos
 */
function parseEvangelizoResponse(data: any): LiturgicalReadings {
  const date = data.date || new Date().toISOString().split('T')[0];

  // Extraer las lecturas - la API puede estructurarlas de varias formas
  let firstReading: ReadingEntry = {
    reference: 'No disponible',
    title: 'Primera lectura',
    text: 'Las lecturas no están disponibles en este momento.',
  };

  let psalm: ReadingEntry = {
    reference: 'No disponible',
    title: 'Salmo',
    text: 'No disponible',
  };

  let secondReading: ReadingEntry | null = null;
  let gospel: ReadingEntry = {
    reference: 'No disponible',
    title: 'Evangelio',
    text: 'No disponible',
  };

  // Buscar las lecturas en la estructura de la API
  if (data.lecturas && Array.isArray(data.lecturas)) {
    const lecturas = data.lecturas;

    if (lecturas.length > 0 && lecturas[0].lectura) {
      firstReading = {
        reference: lecturas[0].referencia || 'No disponible',
        title: 'Primera lectura',
        text: lecturas[0].lectura,
      };
    }

    if (lecturas.length > 1 && lecturas[1].lectura) {
      psalm = {
        reference: lecturas[1].referencia || 'No disponible',
        title: 'Salmo',
        text: lecturas[1].lectura,
      };
    }

    if (lecturas.length > 2 && lecturas[2].lectura) {
      secondReading = {
        reference: lecturas[2].referencia || 'No disponible',
        title: 'Segunda lectura',
        text: lecturas[2].lectura,
      };
    }

    if (lecturas.length > 3 && lecturas[3].lectura) {
      gospel = {
        reference: lecturas[3].referencia || 'No disponible',
        title: 'Evangelio',
        text: lecturas[3].lectura,
      };
    }
  }

  return {
    date,
    season: data.temporada || getLiturgicalSeasonByDate(date),
    color: normalizeLiturgicalColor(data.color),
    feastName: data.festivo || data.conmemoracion || null,
    firstReading,
    psalm,
    secondReading,
    gospel,
  };
}

/**
 * Obtiene las lecturas diarias de la API de Evangelizo
 * @param date - Fecha en formato YYYY-MM-DD
 * @returns Lecturas estructuradas o placeholder si falla
 */
export async function fetchDailyReadings(date: string): Promise<LiturgicalReadings> {
  try {
    const url = `https://publication.evangelizo.ws/SP/days/${date}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Catholic-Liturgy-App/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Evangelizo API returned status ${response.status}`);
    }

    const data = await response.json();
    return parseEvangelizoResponse(data);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Liturgy Fetcher] Error fetching readings:', errorMsg);

    // Retornar un placeholder con graceful degradation
    return {
      date,
      season: getLiturgicalSeasonByDate(date),
      color: 'verde',
      feastName: null,
      firstReading: {
        reference: 'No disponible',
        title: 'Primera lectura',
        text: 'Las lecturas litúrgicas no están disponibles en este momento. Por favor, intenta más tarde.',
      },
      psalm: {
        reference: 'No disponible',
        title: 'Salmo',
        text: 'No disponible',
      },
      secondReading: null,
      gospel: {
        reference: 'No disponible',
        title: 'Evangelio',
        text: 'No disponible',
      },
    };
  }
}

/**
 * Obtiene la temporada litúrgica para una fecha específica
 * @param date - Fecha en formato YYYY-MM-DD
 * @returns Nombre de la temporada litúrgica
 */
export function getLiturgicalSeason(date: string): string {
  return getLiturgicalSeasonByDate(date);
}
