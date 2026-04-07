'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Activity, Zap, Database, AlertCircle } from 'lucide-react';

interface JobRun {
  id: string;
  jobType: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: string;
  finishedAt: string | null;
  errorMessage: string | null;
}

export default function AdminPage(): React.ReactElement {
  const [recentJobs, setRecentJobs] = useState<JobRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchJobs = async (): Promise<void> => {
      try {
        // This would fetch from a jobs API endpoint
        setRecentJobs([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchJobs();
  }, []);

  const formatDate = (date: string): string => {
    return new Date(date).toLocaleString('es-ES');
  };

  const getStatusBadge = (status: JobRun['status']): React.ReactElement => {
    const styles = {
      pending: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200',
      running: 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200',
      completed:
        'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200',
      failed: 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200',
    };

    const labels = {
      pending: 'Pendiente',
      running: 'Ejecutando',
      completed: 'Completado',
      failed: 'Error',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Panel técnico
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Monitoreo del sistema y trabajos en segundo plano
          </p>
        </div>

        {/* System Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card title="Estado del sistema" icon={<Activity className="w-5 h-5" />}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Base de datos
                </span>
                <span className="text-xs font-medium px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 rounded">
                  Activa
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  API de IA
                </span>
                <span className="text-xs font-medium px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 rounded">
                  Activa
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  WebAuthn
                </span>
                <span className="text-xs font-medium px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 rounded">
                  Activa
                </span>
              </div>
            </div>
          </Card>

          <Card title="Uso de IA" icon={<Zap className="w-5 h-5" />}>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Tokens este mes
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  0
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Costo estimado
                </p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  $0.00
                </p>
              </div>
            </div>
          </Card>

          <Card title="Base de datos" icon={<Database className="w-5 h-5" />}>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Registros
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  1
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Último acceso
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Ahora
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Recent Jobs */}
        <Card title="Trabajos recientes" icon={<Activity className="w-5 h-5" />}>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin inline-block">
                <div className="w-6 h-6 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full"></div>
              </div>
            </div>
          ) : recentJobs.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600 dark:text-gray-400">
                Sin trabajos registrados
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 px-3 font-semibold text-gray-700 dark:text-gray-300">
                      Tipo
                    </th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-700 dark:text-gray-300">
                      Estado
                    </th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-700 dark:text-gray-300">
                      Iniciado
                    </th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-700 dark:text-gray-300">
                      Finalizado
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentJobs.map((job) => (
                    <tr
                      key={job.id}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="py-3 px-3 font-mono text-xs text-gray-600 dark:text-gray-400">
                        {job.jobType}
                      </td>
                      <td className="py-3 px-3">
                        {getStatusBadge(job.status)}
                      </td>
                      <td className="py-3 px-3 text-gray-600 dark:text-gray-400">
                        {formatDate(job.startedAt)}
                      </td>
                      <td className="py-3 px-3 text-gray-600 dark:text-gray-400">
                        {job.finishedAt ? formatDate(job.finishedAt) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Environment Info */}
        <Card title="Información del sistema">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between p-2 bg-gray-50 dark:bg-gray-800/50 rounded">
              <span className="text-gray-600 dark:text-gray-400">Entorno</span>
              <span className="font-mono text-gray-900 dark:text-white">
                {process.env.NODE_ENV}
              </span>
            </div>
            <div className="flex justify-between p-2 bg-gray-50 dark:bg-gray-800/50 rounded">
              <span className="text-gray-600 dark:text-gray-400">Versión de Node</span>
              <span className="font-mono text-gray-900 dark:text-white">
                {typeof process !== 'undefined' ? '18+' : 'unknown'}
              </span>
            </div>
            <div className="flex justify-between p-2 bg-gray-50 dark:bg-gray-800/50 rounded">
              <span className="text-gray-600 dark:text-gray-400">Zona horaria del servidor</span>
              <span className="font-mono text-gray-900 dark:text-white">
                {Intl.DateTimeFormat().resolvedOptions().timeZone}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
