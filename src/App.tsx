import React, { useState } from 'react';
import { Search, Loader2, Heart, Upload, Download, MapPin } from 'lucide-react';
import { QueryProvider } from './providers/QueryProvider';
import { useCepLookup } from './hooks/useCepLookup';
import { AddressCard } from './components/AddressCard';
import { BatchLookup } from './components/BatchLookup';
import { AddressSearch } from './components/AddressSearch';
import { Tabs } from './components/Tabs';
import { APIStatusCards } from './components/APIStatusCards';

function AppContent() {
  const [activeTab, setActiveTab] = useState<'single' | 'batch' | 'address'>('single');
  const [cep, setCep] = useState('');
  const { loading, error, addressDataByApi, lookupCep } = useCepLookup();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    lookupCep(cep);
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 8) value = value.slice(0, 8);
    if (value.length > 5) {
      value = value.slice(0, 5) + '-' + value.slice(5);
    }
    setCep(value);
  };

  const tabs = [
    { id: 'single', label: 'Consulta Individual', icon: Search },
    { id: 'batch', label: 'Consulta em Lote', icon: Upload },
    { id: 'address', label: 'Busca por Endereço', icon: MapPin },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col">
      <div className="max-w-6xl mx-auto w-full px-4 pt-12 flex-grow">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Consulta de CEP
          </h1>
          <p className="text-gray-600">
            Sistema avançado de busca de endereços
          </p>
        </div>

        <APIStatusCards />

        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={(tab) => setActiveTab(tab as 'single' | 'batch' | 'address')}
        />

        <div className="mt-8">
          {activeTab === 'single' && (
            <div className="max-w-6xl mx-auto">
              <form onSubmit={handleSubmit} className="mb-8 max-w-md mx-auto">
                <div className="relative">
                  <label
                    htmlFor="cep"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    CEP
                  </label>
                  <input
                    type="text"
                    id="cep"
                    value={cep}
                    onChange={handleCepChange}
                    placeholder="12345-678"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    aria-describedby="cep-error"
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    disabled={loading || cep.length < 8}
                    className="absolute right-2 top-[2.1rem] p-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    aria-label="Buscar CEP"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Search className="w-5 h-5" />
                    )}
                  </button>
                </div>
                
                {error && (
                  <p
                    id="cep-error"
                    className="mt-2 text-sm text-red-600 animate-fade-in"
                    role="alert"
                  >
                    {error}
                  </p>
                )}
              </form>

              {addressDataByApi && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {Object.entries(addressDataByApi).map(([apiName, data]) => (
                    <AddressCard key={apiName} data={data} apiName={apiName} />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'batch' && <BatchLookup />}
          {activeTab === 'address' && <AddressSearch />}
        </div>
      </div>

      <footer className="mt-auto py-6 text-center bg-white shadow-md">
        <div className="flex items-center justify-center gap-2 text-gray-600">
          <span>Desenvolvido</span>
          <span>por</span>
          <strong className="font-medium">Pietra Valentina</strong>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <QueryProvider>
      <AppContent />
    </QueryProvider>
  );
}