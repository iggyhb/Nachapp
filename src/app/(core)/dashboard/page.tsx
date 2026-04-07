'use client';

import { Card } from '@/components/ui/Card';
import { DashboardWidget } from '@/components/dashboard/DashboardWidget';
import { QuickActions } from '@/components/dashboard/QuickActions';
import {
  BookOpen,
  TrendingUp,
  Zap,
  Calendar,
  MessageCircle,
} from 'lucide-react';

export default function DashboardPage(): React.ReactElement {
  return (
    <div className="flex-1 overflow-y-auto pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Bienvenido
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {new Date().toLocaleDateString('es-ES', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>

        {/* Quick Actions */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Acciones rápidas
          </h2>
          <QuickActions />
        </Card>

        {/* Widgets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Reading Today */}
          <DashboardWidget
            title="Lectura de hoy"
            icon={<BookOpen className="w-5 h-5" />}
            content={
              <div className="space-y-3">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  —
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Selecciona una lectura para comenzar
                </p>
              </div>
            }
          />

          {/* Weekly Progress */}
          <DashboardWidget
            title="Progreso semanal"
            icon={<TrendingUp className="w-5 h-5" />}
            content={
              <div className="space-y-3">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: '65%' }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  5 de 7 prácticas completadas
                </p>
              </div>
            }
          />

          {/* Recent Practices */}
          <DashboardWidget
            title="Prácticas recientes"
            icon={<Zap className="w-5 h-5" />}
            content={
              <div className="space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Sin prácticas registradas aún
                </p>
              </div>
            }
          />

          {/* Streaks */}
          <DashboardWidget
            title="Rachas"
            icon={<Calendar className="w-5 h-5" />}
            content={
              <div className="space-y-3">
                <p className="text-2xl font-bold text-orange-600">0</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  días en racha
                </p>
              </div>
            }
          />

          {/* Daily Liturgy */}
          <DashboardWidget
            title="Liturgia del día"
            icon={<Calendar className="w-5 h-5" />}
            content={
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Hora liturgia
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Vinculación en construcción
                </p>
              </div>
            }
          />

          {/* Chat Quick Access */}
          <DashboardWidget
            title="Chat asistente"
            icon={<MessageCircle className="w-5 h-5" />}
            content={
              <div className="space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Habla con tu asistente de IA
                </p>
                <button className="mt-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded font-medium transition-colors">
                  Abrir chat
                </button>
              </div>
            }
          />
        </div>
      </div>
    </div>
  );
}
