import { CheckCircle } from 'lucide-react';

export function CompletedPage() {
  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-slate-800">
        <h1 className="text-lg font-semibold text-slate-100">Completed</h1>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center text-slate-600">
        <CheckCircle size={48} className="text-slate-800" />
        <p className="mt-4 text-sm">No completed downloads yet</p>
      </div>
    </div>
  );
}
