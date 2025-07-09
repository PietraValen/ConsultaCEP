import React, { useState } from 'react';
import { Search, Upload, MapPin } from 'lucide-react';
import { QueryProvider } from './providers/QueryProvider';
import { CepLookup } from './components/CepLookup';
import { BatchLookup } from './components/BatchLookup';
import { AddressSearch } from './components/AddressSearch';
import { Tabs } from './components/Tabs';

export default function App() {
  const [activeTab, setActiveTab] = useState<'single' | 'batch' | 'address'>('single');

  const tabs = [
    { id: 'single', label: 'Consulta Individual', icon: Search },
    { id: 'batch', label: 'Consulta em Lote', icon: Upload },
    { id: 'address', label: 'Busca por Endereço', icon: MapPin },
  ];

  return (
    <QueryProvider>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col">
        <div className="max-w-6xl mx-auto w-full px-4 pt-12 flex-grow">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Consulta de CEP
            </h1>
            <p className="text-gray-600">
              Sistema avançado de busca de endereços com fallback automático
            </p>
          </div>

          <Tabs
            tabs={tabs}
            activeTab={activeTab}
            onChange={(tab) => setActiveTab(tab as 'single' | 'batch' | 'address')}
          />

          <div className="mt-8">
            {activeTab === 'single' && <CepLookup />}
            {activeTab === 'batch' && <BatchLookup />}
            {activeTab === 'address' && <AddressSearch />}
          </div>
        </div>

        <footer className="mt-auto py-6 text-center bg-white shadow-md">
          <div className="flex items-center justify-center gap-2 text-gray-600">
            <span>Desenvolvido por</span>
            <strong className="font-medium">Pietra Valentina</strong>
          </div>
        </footer>
      </div>
    </QueryProvider>
  );
}
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