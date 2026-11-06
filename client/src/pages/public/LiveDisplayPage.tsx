import React, { useState, useEffect } from 'react';
import { queueService } from '../../services/queue/queueService';
import { QueueToken } from '../../types';
import { useSocket } from '../../context/SocketContext';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { TokenCard } from '../../components/queue/TokenCard';
import { Activity, Search, Radio, Volume2, Sparkles, MapPin } from 'lucide-react';

export const LiveDisplayPage: React.FC = () => {
  const [tokens, setTokens] = useState<QueueToken[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchedToken, setSearchedToken] = useState<QueueToken | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const { isConnected, subscribe } = useSocket();

  const fetchActiveQueue = async () => {
    try {
      const res = await queueService.getQueue();
      setTokens(res.queue);
    } catch {
      // Offline / error state
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveQueue();

    // Listen for live socket events
    const unsub = subscribe('queue_updated', () => {
      fetchActiveQueue();
    });

    return () => unsub();
  }, []);

  const handleSearchToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      setIsSearching(true);
      setSearchError(null);
      const res = await queueService.getTokenByNumber(searchQuery.trim());
      setSearchedToken(res.token);
    } catch (err: any) {
      setSearchedToken(null);
      setSearchError(err.message || `Token '${searchQuery}' not found.`);
    } finally {
      setIsSearching(false);
    }
  };

  const callingTokens = tokens.filter((t) => t.status === 'calling');
  const consultingTokens = tokens.filter((t) => t.status === 'consulting');
  const waitingTokens = tokens.filter((t) => t.status === 'waiting');

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <Navbar />

      {/* Hospital Waiting Room Header */}
      <div className="bg-slate-800/80 border-b border-slate-700 py-4 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-md">
              <Radio className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight">Hospital Central Queue Display</h1>
              <p className="text-xs text-slate-400">Live operational waiting board • Auto-synchronized</p>
            </div>
          </div>

          {/* Connection status */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-700 text-xs">
              <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="text-slate-300">{isConnected ? 'Live WebSocket Connected' : 'Reconnecting...'}</span>
            </div>
            <div className="text-xs text-slate-400 font-mono">
              {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 flex-1 w-full space-y-8">
        {/* Token Search Bar for Patients */}
        <div className="bg-slate-800 rounded-2xl p-4 sm:p-6 border border-slate-700 shadow-md">
          <div className="max-w-xl mx-auto text-center space-y-3">
            <h2 className="text-base font-bold text-white">Track Your Personal Token</h2>
            <p className="text-xs text-slate-400">
              Enter your token number (e.g. CARD-001) to verify your live position and assigned counter.
            </p>
            <form onSubmit={handleSearchToken} className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Enter Token Number (e.g. CARD-001)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 uppercase font-mono tracking-wider focus:outline-none focus:border-blue-500"
                />
              </div>
              <Button variant="primary" type="submit" isLoading={isSearching} leftIcon={<Search className="w-4 h-4" />}>
                Lookup
              </Button>
            </form>

            {searchError && (
              <p className="text-xs text-red-400 font-medium pt-1">{searchError}</p>
            )}

            {searchedToken && (
              <div className="pt-4 text-left">
                <div className="bg-slate-900 rounded-xl p-4 border border-slate-700">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-xs text-slate-400">Personal Token Match</span>
                    <Badge status={searchedToken.status} size="sm" />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-center">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase">Token</span>
                      <p className="text-lg font-bold text-white">{searchedToken.token_number}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase">Queue Pos</span>
                      <p className="text-lg font-bold text-blue-400">#{searchedToken.queue_position}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase">Est. Wait</span>
                      <p className="text-lg font-bold text-teal-400">~{Math.round(searchedToken.ml_predicted_wait_minutes || 10)}m</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase">Counter</span>
                      <p className="text-lg font-bold text-amber-400">{searchedToken.counter_number || 'Counter 1'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Big "NOW CALLING" Display */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-purple-400 uppercase tracking-wider">
            <Volume2 className="w-4 h-4 animate-bounce" />
            <span>Now Calling (Please Proceed to Counter)</span>
          </div>

          {callingTokens.length === 0 ? (
            <div className="p-6 rounded-2xl bg-slate-800/60 border border-slate-700 text-center text-slate-400 text-sm">
              No patients currently being called.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {callingTokens.map((t) => (
                <div
                  key={t.id}
                  className="p-5 rounded-2xl bg-gradient-to-r from-purple-900/60 to-indigo-900/60 border-2 border-purple-500 shadow-xl animate-pulse space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase font-bold text-purple-300">{t.department_name}</span>
                    <span className="text-[10px] bg-purple-500 text-white font-bold px-2 py-0.5 rounded-full">
                      CALLING
                    </span>
                  </div>
                  <div className="text-4xl font-extrabold text-white tracking-tight">{t.token_number}</div>
                  <div className="flex items-center justify-between pt-2 border-t border-purple-800 text-xs text-purple-200">
                    <span className="flex items-center gap-1 font-semibold">
                      <MapPin className="w-3.5 h-3.5 text-purple-400" />
                      {t.counter_number || 'Counter 1'}
                    </span>
                    <span>{t.doctor_name}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Consulting and Waiting Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Currently Consulting */}
          <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                In Consultation ({consultingTokens.length})
              </h3>
            </div>

            {consultingTokens.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">No active consultations at this moment.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto divide-y divide-slate-700">
                {consultingTokens.map((t) => (
                  <div key={t.id} className="pt-2 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white text-base">{t.token_number}</span>
                      <span className="text-xs text-slate-400 block">{t.department_name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold text-blue-400">{t.counter_number || 'Counter 1'}</span>
                      <span className="text-[10px] text-slate-500 block">{t.doctor_name}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Waiting Queue */}
          <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                Waiting in Queue ({waitingTokens.length})
              </h3>
            </div>

            {waitingTokens.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">No patients currently waiting in queue.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto divide-y divide-slate-700">
                {waitingTokens.map((t) => (
                  <div key={t.id} className="pt-2 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-slate-700 text-slate-300 flex items-center justify-center font-bold text-[10px]">
                        #{t.queue_position}
                      </span>
                      <div>
                        <span className="font-bold text-white text-sm">{t.token_number}</span>
                        <span className="text-[10px] text-slate-400 block">{t.department_name}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-teal-400 font-semibold">
                        ~{Math.round(t.ml_predicted_wait_minutes || 10)} min
                      </span>
                      <span className="text-[10px] text-slate-500 block">AI Wait Time</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};
