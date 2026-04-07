'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format, addDays, subDays, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Share2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { ReadingCard } from '@/components/liturgy/ReadingCard';
import { ReflectionDisplay } from '@/components/liturgy/ReflectionDisplay';
import { CitationBlock } from '@/components/liturgy/CitationBlock';
import { LiturgicalSeasonBadge } from '@/components/liturgy/LiturgicalSeasonBadge';
import { GeneratingState } from '@/components/liturgy/GeneratingState';

interface LiturgyEntry {
  id: string;
  liturgyDate: string;
  liturgicalSeason?: string;
  liturgicalColor?: string;
  feastName?: string;
  readings: {
    firstReading: { reference: string; title: string; text: string };
    psalm: { reference: string; title: string; text: string };
    secondReading?: { reference: string; title: string; text: string };
    gospel: { reference: string; title: string; text: string };
  };
  summaryText?: string;
  reflectionText?: string;
  practicalPoint?: string;
  status: string;
  citations?: Array<{
    sourceType: string;
    author?: string;
    work?: string;
    citationRef?: string;
    excerpt: string;
  }>;
}

export default function DateLiturgyPage(): React.ReactElement {
  const params = useParams();
  const router = useRouter();
  const dateParam = params.date as string;

  const [entry, setEntry] = useState<LiturgyEntry | null>(null);
  const [status, setStatus] = useState<string>('loading');
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pollingId, setPollingId] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    try {
      const parsed = parse(dateParam, 'yyyy-MM-dd', new Date());
      setCurrentDate(parsed);
    } catch {
      setError('Fecha inválida');
      setStatus('error');
    }
  }, [dateParam]);

  useEffect(() => {
    if (currentDate) {
      fetchLiturgy();
    }
  }, [currentDate]);

  useEffect(() => {
    return () => {
      if (pollingId) clearTimeout(pollingId);
    };
  }, [pollingId]);

  const fetchLiturgy = async () => {
    if (!currentDate) return;

    try {
      setError(null);
      setStatus('loading');

      const dateStr = format(currentDate, 'yyyy-MM-dd');
      const res = await fetch(`/api/liturgy/${dateStr}`);

      if (!res.ok) {
        if (res.status === 404) {
          setEntry(null);
          setStatus('not_found');
          return;
        }
        throw new Error('Failed to fetch');
      }

      const data = await res.json();
      setEntry(data.entry);
      setStatus(data.status || (data.entry ? 'completed' : 'not_found'));

      // Poll if still generating
      if (data.status === 'generating' || data.status === 'fetching') {
        const timer = setTimeout(fetchLiturgy, 2000);
        setPollingId(timer);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setStatus('error');
    }
  };

  const handleGenerateClick = async () => {
    if (!currentDate) return;

    try {
      setStatus('generating');
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      const res = await fetch(`/api/liturgy/${dateStr}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!res.ok) throw new Error('Failed to generate');
      const timer = setTimeout(fetchLiturgy, 1000);
      setPollingId(timer);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
      setStatus('error');
    }
  };

  const handleRegenerateClick = async () => {
    if (!entry || !currentDate) return;

    try {
      setStatus('generating');
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      const res = await fetch(`/api/liturgy/${dateStr}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tone: 'contemplative' }),
      });

      if (!res.ok) throw new Error('Failed to regenerate');
      const timer = setTimeout(fetchLiturgy, 1000);
      setPollingId(timer);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
      setStatus('error');
    }
  };

  const handleShare = async () => {
    if (!entry || !currentDate) return;

    const text = `
Lecturas del ${format(currentDate, 'd MMMM yyyy', { locale: es })}

${entry.readings.firstReading.reference}
${entry.readings.firstReading.text}

${entry.readings.gospel.reference}
${entry.readings.gospel.text}

${entry.reflectionText || ''}
`.trim();

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Liturgia Diaria',
          text,
        });
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    } else {
      await navigator.clipboard.writeText(text);
      alert('Texto copiado al portapapeles');
    }
  };

  const goToPreviousDay = () => {
    if (currentDate) {
      const newDate = subDays(currentDate, 1);
      router.push(`/liturgy/${format(newDate, 'yyyy-MM-dd')}`);
    }
  };

  const goToNextDay = () => {
    if (currentDate) {
      const newDate = addDays(currentDate, 1);
      router.push(`/liturgy/${format(newDate, 'yyyy-MM-dd')}`);
    }
  };

  const formatDateHeader = () => {
    if (!currentDate) return '';
    return format(currentDate, 'EEEE d \'de\' MMMM \'de\' yyyy', { locale: es });
  };

  if (!currentDate) {
    return (
      <div className="flex-1 overflow-y-auto pb-24 md:pb-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto pb-24 md:pb-8">
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Date Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={goToPreviousDay}
            className="p-2 hover:bg-gray-700 rounded-lg transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="text-center flex-1">
            <h1 className="text-lg font-semibold capitalize">{formatDateHeader()}</h1>
            {entry && (
              <div className="mt-2 flex justify-center gap-2">
                <LiturgicalSeasonBadge
                  season={entry.liturgicalSeason}
                  color={entry.liturgicalColor}
                />
              </div>
            )}
            {entry?.feastName && (
              <p className="text-sm text-gray-400 mt-1">{entry.feastName}</p>
            )}
          </div>

          <button
            onClick={goToNextDay}
            className="p-2 hover:bg-gray-700 rounded-lg transition"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Error State */}
        {status === 'error' && (
          <div className="bg-red-900/20 border border-red-600 rounded-lg p-4 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-200 font-medium">Error al cargar la liturgia</p>
              <p className="text-red-300 text-sm">{error}</p>
              <button
                onClick={fetchLiturgy}
                className="mt-2 text-red-300 hover:text-red-200 text-sm underline"
              >
                Reintentar
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {status === 'loading' && <GeneratingState />}

        {/* Not Found State */}
        {status === 'not_found' && !entry && (
          <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-4 text-center">
            <p className="text-blue-200 font-medium">No hay liturgia para esta fecha</p>
            <button
              onClick={handleGenerateClick}
              className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition"
            >
              Generar
            </button>
          </div>
        )}

        {/* Main Content */}
        {entry && status !== 'loading' && (
          <div className="space-y-6">
            {/* Readings Section */}
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                Lecturas
              </h2>

              <ReadingCard
                type="first"
                reference={entry.readings.firstReading.reference}
                title={entry.readings.firstReading.title}
                text={entry.readings.firstReading.text}
              />

              <ReadingCard
                type="psalm"
                reference={entry.readings.psalm.reference}
                title={entry.readings.psalm.title}
                text={entry.readings.psalm.text}
              />

              {entry.readings.secondReading && (
                <ReadingCard
                  type="second"
                  reference={entry.readings.secondReading.reference}
                  title={entry.readings.secondReading.title}
                  text={entry.readings.secondReading.text}
                />
              )}

              <ReadingCard
                type="gospel"
                reference={entry.readings.gospel.reference}
                title={entry.readings.gospel.title}
                text={entry.readings.gospel.text}
              />
            </div>

            {/* Reflection Section */}
            {entry.summaryText && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                  Reflexión
                </h2>
                <ReflectionDisplay
                  summary={entry.summaryText}
                  reflection={entry.reflectionText}
                  practicalPoint={entry.practicalPoint}
                  status={status}
                />
              </div>
            )}

            {/* Citations Section */}
            {entry.citations && entry.citations.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                  Fuentes
                </h2>
                <div className="space-y-2">
                  {entry.citations.map((citation, i) => (
                    <CitationBlock key={i} {...citation} />
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={handleRegenerateClick}
                disabled={status === 'generating'}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg py-2.5 font-medium transition"
              >
                <RefreshCw className="w-4 h-4" />
                Regenerar reflexión
              </button>
              <button
                onClick={handleShare}
                className="flex-1 flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 rounded-lg py-2.5 font-medium transition"
              >
                <Share2 className="w-4 h-4" />
                Compartir
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
