import React, { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { useCepLookup } from './hooks/useCepLookup';
import { AddressCard } from './components/AddressCard';

function App() {
  const [cep, setCep] = useState('');
  const { loading, error, addressData, lookupCep } = useCepLookup();

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="max-w-4xl mx-auto pt-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Consulta de CEP
          </h1>
          <p className="text-gray-600">
            Digite um CEP para encontrar o endereço completo
          </p>
        </div>

        <div className="max-w-md mx-auto">
          <form onSubmit={handleSubmit} className="mb-8">
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

          {addressData && <AddressCard data={addressData} />}
        </div>
      </div>
    </div>
  );
}

export default App;