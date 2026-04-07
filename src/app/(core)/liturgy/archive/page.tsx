'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarDay {
  date: string;
  hasEntry: boolean;
  status?: string;
  season?: string;
  color?: string;
  feastName?: string;
}

interface HistoryEntry {
  date: string;
  season?: string;
  feastName?: string;
  status: string;
  hasReflection: boolean;
}

export default function LiturgyArchivePage(): React.ReactElement {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeason, setSelectedSeason] = useState<string>('');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  useEffect(() => {
    fetchCalendarData();
    fetchHistory();
  }, [year, month]);

  const fetchCalendarData = async () => {
    try {
      const res = await fetch(
        `/api/liturgy/calendar?year=${year}&month=${month}`,
      );
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setCalendarDays(data.days || []);
    } catch (err) {
      console.error('Error fetching calendar:', err);
    }
  };

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams({
        page: '1',
        limit: '20',
        ...(selectedSeason && { season: selectedSeason }),
      });

      const res = await fetch(`/api/liturgy/history?${query}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setHistory(data.entries || []);
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoading(false);
    }
  };

  const goToPreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const getMonthName = () => {
    return format(currentDate, 'MMMM yyyy', { locale: es }).toLocaleUpperCase('es-ES');
  };

  const getLiturgyColor = (color?: string) => {
    const colors: Record<string, string> = {
      verde: 'bg-green-500/20',
      morado: 'bg-purple-500/20',
      blanco: 'bg-slate-400/20',
      rojo: 'bg-red-500/20',
      rosa: 'bg-pink-500/20',
    };
    return colors[color || 'verde'] || 'bg-green-500/20';
  };

  const getColorDot = (color?: string) => {
    const colors: Record<string, string> = {
      verde: 'bg-green-500',
      morado: 'bg-purple-500',
      blanco: 'bg-slate-300',
      rojo: 'bg-red-500',
      rosa: 'bg-pink-500',
    };
    return colors[color || 'verde'] || 'bg-green-500';
  };

  return (
    <div className="flex-1 overflow-y-auto pb-24 md:pb-8">
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Month Navigator */}
        <div className="flex items-center justify-between">
          <button
            onClick={goToPreviousMonth}
            className="p-2 hover:bg-gray-700 rounded-lg transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <h1 className="text-lg font-semibold flex-1 text-center">
            {getMonthName()}
          </h1>

          <button
            onClick={goToNextMonth}
            className="p-2 hover:bg-gray-700 rounded-lg transition"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="bg-gray-800 rounded-lg p-4 space-y-3">
          {/* Day names */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-400 mb-2">
            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day) => {
              const dayNum = parseInt(day.date.split('-')[2], 10);
              const isCurrentMonth = parseInt(day.date.split('-')[1], 10) === month;

              if (!isCurrentMonth) return null;

              return (
                <Link
                  key={day.date}
                  href={`/liturgy/${day.date}`}
                  className={`
                    aspect-square flex flex-col items-center justify-center rounded-lg
                    text-xs font-medium transition-colors
                    ${getLiturgyColor(day.color)}
                    hover:bg-gray-600 cursor-pointer
                  `}
                >
                  <span>{dayNum}</span>
                  {day.hasEntry && (
                    <div className={`w-1.5 h-1.5 rounded-full ${getColorDot(day.color)} mt-0.5`} />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 text-xs pt-3 border-t border-gray-700">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-gray-400">Ordinario</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              <span className="text-gray-400">Adviento/Cuaresma</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-gray-400">Pentecostés</span>
            </div>
          </div>
        </div>

        {/* Season Filter */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => {
              setSelectedSeason('');
              setHistory([]);
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
              selectedSeason === ''
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Todas
          </button>
          {['ordinario', 'adviento', 'navidad', 'cuaresma', 'pascua'].map((season) => (
            <button
              key={season}
              onClick={() => setSelectedSeason(season)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition capitalize ${
                selectedSeason === season
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {season === 'ordinario'
                ? 'Ordinario'
                : season === 'adviento'
                  ? 'Adviento'
                  : season === 'navidad'
                    ? 'Navidad'
                    : season === 'cuaresma'
                      ? 'Cuaresma'
                      : 'Pascua'}
            </button>
          ))}
        </div>

        {/* Recent Entries */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            Entradas Recientes
          </h2>

          {loading ? (
            <div className="text-center py-8 text-gray-400">Cargando...</div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No hay entradas para mostrar
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((entry) => {
                const date = new Date(entry.date + 'T00:00:00');
                const formatted = format(date, 'd \'de\' MMMM', { locale: es });

                return (
                  <Link
                    key={entry.date}
                    href={`/liturgy/${entry.date}`}
                    className="block bg-gray-800 hover:bg-gray-700 rounded-lg p-3 transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium capitalize">{formatted}</p>
                        {entry.feastName && (
                          <p className="text-xs text-gray-400 mt-0.5">{entry.feastName}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {entry.hasReflection && (
                          <span className="text-xs bg-blue-600/30 text-blue-300 px-2 py-1 rounded">
                            Reflexión
                          </span>
                        )}
                        <span
                          className={`text-xs px-2 py-1 rounded capitalize ${
                            entry.status === 'completed'
                              ? 'bg-green-600/30 text-green-300'
                              : 'bg-gray-600/30 text-gray-300'
                          }`}
                        >
                          {entry.status}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
