import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

export default function EpgProgressModal({ isOpen, onClose, progress }) {
  const { t } = useLanguage();

  if (!isOpen) return null;

  const { stage, progress: percent, message } = progress || {};

  const getStageIcon = (currentStage) => {
    switch (currentStage) {
      case 'downloading':
        return '⬇️';
      case 'decompressing':
        return '📦';
      case 'parsing':
        return '📋';
      case 'saving':
        return '💾';
      case 'complete':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '⏳';
    }
  };

  const getStageLabel = (currentStage) => {
    switch (currentStage) {
      case 'downloading':
        return t.admin?.epg?.stageDownloading || 'Herunterladen';
      case 'decompressing':
        return t.admin?.epg?.stageDecompressing || 'Entpacken';
      case 'parsing':
        return t.admin?.epg?.stageParsing || 'Analysieren';
      case 'saving':
        return t.admin?.epg?.stageSaving || 'Speichern';
      case 'complete':
        return t.admin?.epg?.stageComplete || 'Abgeschlossen';
      case 'error':
        return t.admin?.epg?.stageError || 'Fehler';
      default:
        return t.admin?.epg?.stageInitializing || 'Initialisierung';
    }
  };

  const stages = ['downloading', 'decompressing', 'parsing', 'saving', 'complete'];
  const currentStageIndex = stages.indexOf(stage);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-lg w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white flex items-center">
            <span className="text-2xl mr-2">📡</span>
            {t.admin?.epg?.progressTitle || 'EPG wird verarbeitet'}
          </h3>
          {stage === 'complete' || stage === 'error' ? (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : null}
        </div>

        {/* Progress Stages */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            {stages.map((s, index) => (
              <React.Fragment key={s}>
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg mb-1 transition-all ${
                    index < currentStageIndex
                      ? 'bg-green-500/20 text-green-400'
                      : index === currentStageIndex
                      ? 'bg-blue-500/20 text-blue-400 animate-pulse'
                      : 'bg-slate-700/50 text-slate-500'
                  }`}>
                    {getStageIcon(s)}
                  </div>
                  <span className={`text-xs ${
                    index <= currentStageIndex ? 'text-slate-300' : 'text-slate-600'
                  }`}>
                    {getStageLabel(s)}
                  </span>
                </div>
                {index < stages.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 transition-all ${
                    index < currentStageIndex ? 'bg-green-500' : 'bg-slate-700'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Progress Bar */}
        {stage !== 'complete' && stage !== 'error' && (
          <div className="mb-4">
            <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-full transition-all duration-300 rounded-full"
                style={{ width: `${percent || 0}%` }}
              />
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-sm text-slate-400">{message}</span>
              <span className="text-sm font-bold text-blue-400">{percent || 0}%</span>
            </div>
          </div>
        )}

        {/* Status Message */}
        {stage === 'complete' && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-4">
            <div className="flex items-center">
              <span className="text-2xl mr-3">✅</span>
              <div>
                <p className="text-green-300 font-semibold">
                  {t.admin?.epg?.successComplete || 'EPG erfolgreich aktualisiert!'}
                </p>
                <p className="text-green-400/70 text-sm mt-1">{message}</p>
              </div>
            </div>
          </div>
        )}

        {stage === 'error' && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
            <div className="flex items-center">
              <span className="text-2xl mr-3">❌</span>
              <div>
                <p className="text-red-300 font-semibold">
                  {t.admin?.epg?.errorFailed || 'EPG-Aktualisierung fehlgeschlagen'}
                </p>
                <p className="text-red-400/70 text-sm mt-1">{message}</p>
              </div>
            </div>
          </div>
        )}

        {/* Close Button */}
        {(stage === 'complete' || stage === 'error') && (
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg shadow-blue-500/25"
          >
            {t.common?.close || 'Schließen'}
          </button>
        )}
      </div>
    </div>
  );
}
