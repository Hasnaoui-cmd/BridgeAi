import { useState } from 'react';
import { FileText, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

type Doc = { id: string, name: string, status: 'Required' | 'Uploaded' | 'OCR Validating' | 'Validated', type: string };

export default function Kanban() {
  const [documents] = useState<Doc[]>([
    { id: '1', name: 'Commercial Invoice', status: 'Validated', type: 'INV' },
    { id: '2', name: 'EUR.1 Certificate', status: 'Required', type: 'EUR.1' },
    { id: '3', name: 'REACH Declaration', status: 'OCR Validating', type: 'REACH' },
    { id: '4', name: 'Bill of Lading', status: 'Uploaded', type: 'B/L' },
    { id: '5', name: 'Packing List', status: 'Validated', type: 'PL' },
    { id: '6', name: 'Customs DUM', status: 'Required', type: 'DUM' },
  ]);

  const columns = ['Required', 'Uploaded', 'OCR Validating', 'Validated'] as const;

  return (
    <div className="h-full p-8 flex flex-col">
      <div className="mb-8">
        <h2 className="text-2xl font-serif text-stone-800">Document Flow</h2>
        <p className="text-stone-500 mt-1">Track documentation compliance for shipment #TR-88210</p>
      </div>

      <div className="flex-1 grid grid-cols-4 gap-6 overflow-hidden">
        {columns.map(col => (
          <div key={col} className="bg-stone-100/50 rounded-2xl flex flex-col border border-stone-200/50">
            <div className="p-4 border-b border-stone-200/50 flex items-center justify-between">
              <h3 className="font-medium text-sm text-stone-700">{col}</h3>
              <span className="text-xs bg-stone-200 text-stone-600 px-2 py-0.5 rounded-full font-medium">
                {documents.filter(d => d.status === col).length}
              </span>
            </div>
            <div className="p-4 flex-1 overflow-y-auto space-y-3">
              {documents.filter(d => d.status === col).map(doc => (
                <div key={doc.id} className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm hover:shadow transition-shadow cursor-pointer">
                  <div className="flex items-start justify-between mb-3">
                    <div className="bg-stone-100 text-stone-600 text-xs font-mono px-2 py-1 rounded">
                      {doc.type}
                    </div>
                    {doc.status === 'Validated' && <CheckCircle2 size={16} className="text-emerald-500" />}
                    {doc.status === 'OCR Validating' && <Clock size={16} className="text-amber-500 animate-pulse" />}
                    {doc.status === 'Required' && <AlertCircle size={16} className="text-stone-400" />}
                  </div>
                  <div className="font-medium text-stone-800 text-sm">
                    {doc.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
