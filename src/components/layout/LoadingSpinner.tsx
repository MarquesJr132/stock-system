export const LoadingSpinner = () => {
  console.log('LoadingSpinner: Rendering...');
  return (
    <div className="min-h-screen w-full bg-white dark:bg-slate-900 flex items-center justify-center">
      <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-lg shadow-lg">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-500 mx-auto mb-4"></div>
        <p className="text-slate-900 dark:text-slate-100 text-lg font-medium">Carregando aplicação...</p>
        <p className="text-slate-600 dark:text-slate-400 text-sm mt-2">Por favor aguarde...</p>
      </div>
    </div>
  );
};