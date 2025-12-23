import React, { useState, useEffect } from 'react';
import * as epgService from '../services/epg';

export default function ChannelEpg({ channelName }) {
  const [currentProgram, setCurrentProgram] = useState(null);
  const [upcomingPrograms, setUpcomingPrograms] = useState([]);

  useEffect(() => {
    if (!channelName) return;

    const loadEpg = () => {
      // Get current program
      const current = epgService.getCurrentProgram(channelName);
      setCurrentProgram(current);

      // Get upcoming programs (next 6 hours)
      const programs = epgService.getChannelPrograms(channelName, 6);
      const now = new Date();
      const upcoming = programs.filter(p => new Date(p.start) > now).slice(0, 3);
      setUpcomingPrograms(upcoming);
    };

    loadEpg();

    // Update every minute
    const interval = setInterval(loadEpg, 60 * 1000);

    return () => clearInterval(interval);
  }, [channelName]);

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  };

  const getProgress = (start, stop) => {
    const now = new Date();
    const startTime = new Date(start);
    const stopTime = new Date(stop);

    if (now < startTime || now > stopTime) return 0;

    const total = stopTime - startTime;
    const elapsed = now - startTime;

    return Math.round((elapsed / total) * 100);
  };

  if (!currentProgram && upcomingPrograms.length === 0) {
    return null;
  }

  return (
    <div className="bg-slate-800/50 rounded-lg p-4 backdrop-blur-sm border border-slate-700/50">
      {/* Current Program */}
      {currentProgram && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded font-semibold border border-red-500/30">
                LIVE
              </span>
              <span className="text-xs text-slate-400 ml-2">
                {formatTime(currentProgram.start)} - {formatTime(currentProgram.stop)}
              </span>
            </div>
          </div>

          <h3 className="font-bold text-white mb-1">{currentProgram.title}</h3>

          {currentProgram.desc && (
            <p className="text-sm text-slate-400 line-clamp-2 mb-2">
              {currentProgram.desc}
            </p>
          )}

          {/* Progress Bar */}
          <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-red-500 h-full transition-all duration-300"
              style={{ width: `${getProgress(currentProgram.start, currentProgram.stop)}%` }}
            />
          </div>
        </div>
      )}

      {/* Upcoming Programs */}
      {upcomingPrograms.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-slate-400 mb-2">
            Kommende Sendungen:
          </h4>
          <div className="space-y-2">
            {upcomingPrograms.map((program, index) => (
              <div key={index} className="flex items-start gap-2 text-sm">
                <span className="text-slate-500 text-xs pt-0.5 whitespace-nowrap">
                  {formatTime(program.start)}
                </span>
                <span className="text-slate-300 line-clamp-1">{program.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
