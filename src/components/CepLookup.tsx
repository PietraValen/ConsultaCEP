import React, { useState, useEffect } from 'react';
import { Search, Loader2, MapPin, CheckCircle, AlertCircle, X } from 'lucide-react';
import { useCepQuery } from '../hooks/useCepQuery';

export function CepLookup() {
  const [cep, setCep] = useState('');
  const [debouncedCep, setDebouncedCep] = useState('');
  
  // Debounce para evitar muitas requisições
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCep(cep);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [cep]);
  
  const { data: endereco, isLoading, error, isSuccess } = useCepQuery(debouncedCep);
  
  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    
    // Limitar a 8 dígitos
    if (value.length > 8) {
      value = value.slice(0, 8);
    }
    
    // Aplicar máscara 00000-000
    if (value.length > 5) {
      value = value.slice(0, 5) + '-' + value.slice(5);
    }
    
    setCep(value);
  };
  
  const clearCep = () => {
    setCep('');
    setDebouncedCep('');
  };
  
  const cleanCep = cep.replace(/\D/g, '');
  const isValidLength = cleanCep.length === 8;
  
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <MapPin className="w-6 h-6 text-blue-600" />
            Consulta de CEP
          </h2>
          <p className="text-gray-600">
            Digite o CEP para buscar o endereço automaticamente
          </p>
        </div>
        
        <div className="space-y-4">
          {/* Input com máscara */}
          <div>
            <label htmlFor="cep" className="block text-sm font-medium text-gray-700 mb-2">
              CEP
            </label>
            <div className="relative">
              <input
                type="text"
                id="cep"
                value={cep}
                onChange={handleCepChange}
                placeholder="00000-000"
                className="w-full px-4 py-3 pr-20 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-lg font-mono"
                maxLength={9}
              />
              
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                {cep && (
                  <button
                    onClick={clearCep}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Limpar CEP"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                
                {isLoading && (
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                )}
                
                {isSuccess && !isLoading && (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                )}
                
                {error && !isLoading && (
                  <AlertCircle className="w-5 h-5 text-red-600" />
                )}
              </div>
            </div>
            
            {/* Indicador de progresso */}
            <div className="mt-2 flex items-center gap-2 text-sm">
              <div className="flex-1 bg-gray-200 rounded-full h-1">
                <div 
                  className={`h-1 rounded-full transition-all duration-300 ${
                    cleanCep.length === 0 ? 'w-0 bg-gray-300' :
                    cleanCep.length < 8 ? 'w-1/2 bg-yellow-400' :
                    'w-full bg-green-500'
                  }`}
                />
              </div>
              <span className="text-gray-500 font-mono">
                {cleanCep.length}/8
              </span>
            </div>
          </div>
          
          {/* Resultado ou erro */}
          {isValidLength && (
            <div className="mt-6">
              {isLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
                    <p className="text-gray-600">Buscando endereço...</p>
                  </div>
                </div>
              )}
              
              {error && !isLoading && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-medium text-red-800">Erro na consulta</h3>
                      <p className="text-red-700 mt-1">{error.message}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {endereco && !isLoading && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 animate-fade-in">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-green-800 mb-3">Endereço encontrado</h3>
                      
                      <div className="space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <span className="text-sm font-medium text-gray-600">CEP:</span>
                            <p className="font-mono text-lg">{endereco.cep}</p>
                          </div>
                          
                          <div>
                            <span className="text-sm font-medium text-gray-600">Fonte:</span>
                            <p className="text-blue-600 font-medium">{endereco.origem}</p>
                          </div>
                        </div>
                        
                        {endereco.rua && (
                          <div>
                            <span className="text-sm font-medium text-gray-600">Logradouro:</span>
                            <p className="text-gray-900">{endereco.rua}</p>
                          </div>
                        )}
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {endereco.bairro && (
                            <div>
                              <span className="text-sm font-medium text-gray-600">Bairro:</span>
                              <p className="text-gray-900">{endereco.bairro}</p>
                            </div>
                          )}
                          
                          <div>
                            <span className="text-sm font-medium text-gray-600">Cidade/UF:</span>
                            <p className="text-gray-900">{endereco.cidade} - {endereco.estado}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Dica de uso */}
          {!isValidLength && cleanCep.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Search className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-blue-800">
                    Continue digitando... O CEP deve ter 8 dígitos para iniciar a busca automática.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}