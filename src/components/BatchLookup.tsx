import React, { useState, useCallback } from 'react';
import { Upload, Download, Loader2, AlertCircle } from 'lucide-react';
import { read, utils, writeFile } from 'xlsx';
import { processBatchCeps } from '../services/cep';

export function BatchLookup() {
  const [loading, setLoading] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Array<{
    cep: string;
    status: string;
    endereco?: string;
  }>>([]);

  const processManualInput = async () => {
    if (loading) return;
    setError(null);
    setLoading(true);
    
    try {
      const ceps = textInput
        .split(/[\n,\s]+/)
        .map(cep => cep.replace(/\D/g, ''))
        .filter(cep => cep.length === 8);

      if (ceps.length === 0) {
        throw new Error('Nenhum CEP válido encontrado. Os CEPs devem ter 8 dígitos.');
      }

      const results = await processBatchCeps(ceps);
      setResults(results);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro ao processar CEPs');
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
      const jsonData = utils.sheet_to_json<{ cep: string }>(worksheet);
      
      if (!jsonData.length) {
        throw new Error('Nenhum dado encontrado na planilha');
      }

      const ceps = jsonData
        .map(row => String(row.cep || '').replace(/\D/g, ''))
        .filter(cep => cep.length === 8);

      if (ceps.length === 0) {
        throw new Error('Nenhum CEP válido encontrado no arquivo. Os CEPs devem ter 8 dígitos.');
      }

      const results = await processBatchCeps(ceps);
      setResults(results);
      e.target.value = ''; // Reset file input
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
      writeFile(workbook, 'resultados_cep.xlsx');
    } catch (error) {
      setError('Erro ao gerar arquivo de resultados');
    }
  }, [results, loading]);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Consulta Manual em Lote
            </h3>
            <textarea
              value={textInput}
              onChange={(e) => {
                setError(null);
                setTextInput(e.target.value);
              }}
              placeholder="Digite os CEPs separados por vírgula, espaço ou nova linha&#10;Exemplo: 12345-678, 87654-321"
              className="w-full h-32 px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              disabled={loading}
            />
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Upload de Arquivo
            </h3>
            <div className="space-y-2">
              <label className="block">
                <span className="text-sm text-gray-500 mb-2 block">
                  Aceita arquivos Excel (.xlsx, .csv) com uma coluna chamada "cep"
                </span>
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
                    Erro ao processar CEPs
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    {error}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between">
            <button
              onClick={processManualInput}
              disabled={loading || !textInput.trim()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <span className="animate-spin mr-2">
                    <Loader2 className="w-5 h-5" />
                  </span>
                  <span>Processando...</span>
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5 mr-2" />
                  <span>Processar CEPs</span>
                </>
              )}
            </button>

            {results.length > 0 && (
              <button
                onClick={downloadResults}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-5 h-5 mr-2" />
                Baixar Resultados
              </button>
            )}
          </div>

          {results.length > 0 && (
            <div className="mt-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">
                Resultados ({results.length})
              </h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        CEP
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Endereço
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {results.map((result, index) => (
                      <tr key={index}>
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
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {result.endereco || 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}