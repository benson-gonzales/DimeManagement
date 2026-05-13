
import React, { useRef, useState } from 'react';
import { X, FileJson, Download, Upload, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { AppState } from '../types';

interface DataManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: AppState;
  onImport: (newState: AppState) => void;
}

const DataManagementModal: React.FC<DataManagementModalProps> = ({ isOpen, onClose, state, onImport }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });

  if (!isOpen) return null;

  const handleExport = () => {
    try {
      const dataStr = JSON.stringify(state, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      const exportFileDefaultName = `finance_pro_backup_${new Date().toISOString().split('T')[0]}.json`;

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      setStatus({ type: 'success', message: 'Data exported successfully!' });
    } catch (e) {
      setStatus({ type: 'error', message: 'Failed to export data.' });
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string) as AppState;
        
        // Basic Validation
        if (!json.accounts || !json.categories || !json.transactions) {
          throw new Error("Invalid file format. Missing core data structures.");
        }

        if (window.confirm("Importing data will completely overwrite your current local state. Are you sure you want to proceed?")) {
          onImport(json);
          setStatus({ type: 'success', message: 'Data imported successfully!' });
          setTimeout(onClose, 1500);
        }
      } catch (err: any) {
        setStatus({ type: 'error', message: err.message || 'Failed to parse JSON file.' });
      }
    };
    reader.readAsText(file);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative border border-slate-200">
        <div className="p-8 space-y-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <FileJson size={24} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Data Management</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Backup & Migration Tools</p>
            </div>
          </div>

          {status.type && (
            <div className={`p-4 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-2 duration-300 ${
              status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
            }`}>
              {status.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
              <span className="text-[11px] font-bold uppercase tracking-tight">{status.message}</span>
            </div>
          )}

          <div className="space-y-4">
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Export Local Data</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                Download your entire financial history as a portable JSON file. Keep this for backups or to migrate to a new device.
              </p>
              <button 
                onClick={handleExport}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg active:scale-95"
              >
                <Download size={14} /> Export JSON
              </button>
            </div>

            <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-4">
              <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">Import External Data</h4>
              <p className="text-[11px] text-blue-400/80 leading-relaxed font-medium">
                Upload a previously exported JSON file to restore your state. <span className="text-red-500 font-black italic">Warning: This overwrites current data.</span>
              </p>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept=".json"
              />
              <button 
                onClick={handleImportClick}
                className="w-full flex items-center justify-center gap-2 bg-white text-blue-600 border border-blue-200 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-95"
              >
                <Upload size={14} /> Import JSON
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 text-center">
            <p className="text-[9px] text-slate-300 font-bold uppercase tracking-widest">
              Finance Pro System • Phase 1 Migration Utility
            </p>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-300 hover:text-slate-600 transition-colors"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
};

export default DataManagementModal;
