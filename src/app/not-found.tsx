import Link from 'next/link';

export default function NotFound(): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-gray-900 px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 dark:text-white mb-4">404</h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
          Página no encontrada
        </p>
        <Link
          href="/dashboard"
          className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
