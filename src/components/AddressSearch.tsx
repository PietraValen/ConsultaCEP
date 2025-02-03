import React, { useState, useCallback } from 'react';
import { Search, MapPin, Loader2, Download, AlertCircle, X } from 'lucide-react';
import { searchAddressByCep } from '../services/cep';
import { read, utils, writeFile } from 'xlsx';

interface AddressSearchResult {
  endereco: string;
  cep: string;
  status: string;
}

interface AddressForm {
  rua: string;
  bairro: string;
  cidade: string;
  estado: string;
}

const ESTADOS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export function AddressSearch() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [address, setAddress] = useState<AddressForm>({
    rua: '',
    bairro: '',
    cidade: '',
    estado: '',
  });
  const [results, setResults] = useState<AddressSearchResult[]>([]);
  const [showEstadosList, setShowEstadosList] = useState(false);

  const validateForm = (): string | null => {
    if (!address.cidade.trim()) {
      return 'A cidade é obrigatória';
    }
    if (!address.estado.trim()) {
      return 'O estado é obrigatório';
    }
    if (!ESTADOS.includes(address.estado.toUpperCase())) {
      return 'Estado inválido';
    }
    return null;
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const searchResults = await searchAddressByCep({
        ...address,
        estado: address.estado.toUpperCase(),
      });
      setResults(searchResults);
      
      if (searchResults.length === 0) {
        setError('Nenhum endereço encontrado com os critérios informados');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro na busca de endereços');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || loading) return;

    setError(null);
    setLoading(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = read(data, { type: 'array' });
      
      if (!workbook.SheetNames.length) {
        throw new Error('Arquivo Excel vazio ou inválido');
      }

      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = utils.sheet_to_json<{
        rua: string;
        bairro: string;
        cidade: string;
        estado: string;
      }>(worksheet);

      if (!jsonData.length) {
        throw new Error('Nenhum dado encontrado na planilha');
      }

      const validData = jsonData.filter(addr => 
        addr.cidade?.trim() && 
        addr.estado?.trim() && 
        ESTADOS.includes(addr.estado.toUpperCase())
      );

      if (validData.length === 0) {
        throw new Error('Nenhum endereço válido encontrado no arquivo');
      }

      const results = await Promise.all(
        validData.map(addr => searchAddressByCep({
          ...addr,
          estado: addr.estado.toUpperCase(),
        }))
      );
      setResults(results.flat());
      e.target.value = '';
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro ao processar arquivo');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const downloadResults = useCallback(() => {
    if (loading || results.length === 0) return;
    
    try {
      const worksheet = utils.json_to_sheet(results);
      const workbook = utils.book_new();
      utils.book_append_sheet(workbook, worksheet, 'Resultados');
      writeFile(workbook, 'resultados_endereco.xlsx');
    } catch (error) {
      setError('Erro ao gerar arquivo de resultados');
    }
  }, [results, loading]);

  const handleInputChange = (field: keyof AddressForm, value: string) => {
    setError(null);
    setAddress(prev => ({ ...prev, [field]: value }));
  };

  const clearField = (field: keyof AddressForm) => {
    setAddress(prev => ({ ...prev, [field]: '' }));
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="space-y-6">
          <form onSubmit={handleSearch} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="rua" className="block text-sm font-medium text-gray-700">
                Rua
              </label>
              <div className="relative mt-1">
                <input
                  type="text"
                  id="rua"
                  value={address.rua}
                  onChange={(e) => handleInputChange('rua', e.target.value)}
                  className="block w-full rounded-md border-gray-300 pr-10 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Nome da rua (opcional)"
                  disabled={loading}
                />
                {address.rua && (
                  <button
                    type="button"
                    onClick={() => clearField('rua')}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="bairro" className="block text-sm font-medium text-gray-700">
                Bairro
              </label>
              <div className="relative mt-1">
                <input
                  type="text"
                  id="bairro"
                  value={address.bairro}
                  onChange={(e) => handleInputChange('bairro', e.target.value)}
                  className="block w-full rounded-md border-gray-300 pr-10 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Nome do bairro (opcional)"
                  disabled={loading}
                />
                {address.bairro && (
                  <button
                    type="button"
                    onClick={() => clearField('bairro')}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="cidade" className="block text-sm font-medium text-gray-700">
                Cidade
              </label>
              <div className="relative mt-1">
                <input
                  type="text"
                  id="cidade"
                  value={address.cidade}
                  onChange={(e) => handleInputChange('cidade', e.target.value)}
                  className="block w-full rounded-md border-gray-300 pr-10 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Nome da cidade"
                  required
                  disabled={loading}
                />
                {address.cidade && (
                  <button
                    type="button"
                    onClick={() => clearField('cidade')}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="estado" className="block text-sm font-medium text-gray-700">
                Estado
              </label>
              <div className="relative mt-1">
                <input
                  type="text"
                  id="estado"
                  value={address.estado}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase();
                    handleInputChange('estado', value);
                    setShowEstadosList(value.length > 0);
                  }}
                  onFocus={() => setShowEstadosList(true)}
                  className="block w-full rounded-md border-gray-300 pr-10 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="UF"
                  required
                  maxLength={2}
                  disabled={loading}
                />
                {address.estado && (
                  <button
                    type="button"
                    onClick={() => {
                      clearField('estado');
                      setShowEstadosList(false);
                    }}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                {showEstadosList && (
                  <div className="absolute z-10 mt-1 w-full rounded-md bg-white shadow-lg">
                    <ul className="max-h-48 overflow-auto rounded-md py-1 text-base">
                      {ESTADOS
                        .filter(estado => 
                          estado.startsWith(address.estado.toUpperCase())
                        )
                        .map(estado => (
                          <li
                            key={estado}
                            className="cursor-pointer px-3 py-2 hover:bg-blue-50"
                            onClick={() => {
                              handleInputChange('estado', estado);
                              setShowEstadosList(false);
                            }}
                          >
                            {estado}
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={loading || !address.cidade || !address.estado}
                className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <span className="animate-spin mr-2">
                      <Loader2 className="w-5 h-5" />
                    </span>
                    <span>Buscando...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5 mr-2" />
                    <span>Buscar Endereços</span>
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Busca por Arquivo
            </h3>
            <div className="space-y-2">
              <p className="text-sm text-gray-500">
                Faça upload de um arquivo Excel (.xlsx, .csv) com as colunas: rua, bairro, cidade e estado
              </p>
              <label className="block">
                <input
                  type="file"
                  accept=".xlsx,.csv"
                  onChange={handleFileUpload}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100"
                  disabled={loading}
                />
              </label>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Erro na busca
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    {error}
                  </div>
                </div>
              </div>
            </div>
          )}

          {results.length > 0 && (
            <>
              <div className="flex justify-end">
                <button
                  onClick={downloadResults}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Baixar Resultados
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Endereço
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        CEP
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {results.map((result, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {result.endereco}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {result.cep}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              result.status === 'Encontrado'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {result.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}