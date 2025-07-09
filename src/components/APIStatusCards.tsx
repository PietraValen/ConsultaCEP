import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Clock, Wifi, WifiOff } from 'lucide-react';
import { getAPIStatus } from '../services/cep';

interface APIStatus {
  id: string;
  name: string;
  status: 'online' | 'offline';
  lastCheck: Date;
  responseTime: number;
}

export function APIStatusCards() {
  const [apiStatus, setApiStatus] = useState<APIStatus[]>([]);

  useEffect(() => {
    const updateStatus = () => {
      setApiStatus(getAPIStatus());
    };

    updateStatus();
    const interval = setInterval(updateStatus, 5000);

    return () => clearInterval(interval);
  }, []);

  const formatLastCheck = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);

    if (seconds < 60) return `${seconds}s atrás`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}min atrás`;
    return `${Math.floor(seconds / 3600)}h atrás`;
  };

  // Mostrar apenas as 3 principais APIs para manter o layout original
  const mainApis = apiStatus.slice(0, 3);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {mainApis.map((api) => (
        <div
          key={api.id}
          className={`bg-white rounded-lg shadow-lg p-6 border-l-4 ${
            api.status === 'online' ? 'border-green-500' : 'border-red-500'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{api.name}</h3>
            {api.status === 'online' ? (
              <Wifi className="w-6 h-6 text-green-500" />
            ) : (
              <WifiOff className="w-6 h-6 text-red-500" />
            )}
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center text-sm">
              <div className="flex items-center">
                {api.status === 'online' ? (
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500 mr-2" />
                )}
                <span className={api.status === 'online' ? 'text-green-700' : 'text-red-700'}>
                  {api.status === 'online' ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
            
            <div className="flex items-center text-sm text-gray-600">
              <Clock className="w-4 h-4 mr-2" />
              <span>Última verificação: {formatLastCheck(api.lastCheck)}</span>
            </div>
            
            {api.status === 'online' && (
              <div className="text-sm text-gray-600">
                <span>Tempo de resposta: {api.responseTime}ms</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}