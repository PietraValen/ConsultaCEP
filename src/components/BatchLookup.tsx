import React, { useState, useCallback, useRef } from 'react';
import { Upload, Download, Loader2, AlertCircle, Play, Pause, X, FileText, Clock, BarChart3 } from 'lucide-react';
import { read, utils, writeFile } from 'xlsx';
import { processBatchCepsAdvanced } from '../services/batchCep';

interface BatchResult {
  cep: string;
  rua: string;
  bairro: string;
  cidade: string;
  estado: string;
  status: 'Encontrado' | 'Não encontrado' | 'Erro';
  fonte: string;
  tempo_resposta: number;
  erro?: string;
}

interface BatchProgress {
  current: number;
  total: number;
  percentage: number;
  estimatedTimeRemaining: number;
  averageTimePerCep: number;
  startTime: number;
  successCount: number;
  errorCount: number;
}

const MAX_CEPS = 600;
const BATCH_SIZE = 10; // Processar em lotes de 10 para melhor performance

export function BatchLookup() {
  const [loading, setLoading] = useState(false);
  const [paused, setPaused] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<BatchResult[]>([]);
  const [progress, setProgress] = useState<BatchProgress | null>(null);
  const [showAdvancedInput, setShowAdvancedInput] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Estados para entrada avançada
  const [advancedInput, setAdvancedInput] = useState({
    ceps: '',
    ruas: '',
    bairros: '',
    cidades: '',
    estados: ''
  });

  const resetState = () => {
    setResults([]);
    setProgress(null);
    setError(null);
    setPaused(false);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  const parseInput = (input: string): string[] => {
    return input
      .split(/[\n,\s]+/)
      .map(item => item.trim())
      .filter(item => item.length > 0);
  };

  const validateAndPrepareCeps = (): string[] => {
    let ceps: string[] = [];

    if (showAdvancedInput) {
      // Processar entrada avançada
      const cepList = parseInput(advancedInput.ceps);
      const ruaList = parseInput(advancedInput.ruas);
      const bairroList = parseInput(advancedInput.bairros);
      const cidadeList = parseInput(advancedInput.cidades);
      const estadoList = parseInput(advancedInput.estados);

      // Pegar o maior array para determinar quantos registros processar
      const maxLength = Math.max(
        cepList.length,
        ruaList.length,
        bairroList.length,
        cidadeList.length,
        estadoList.length
      );

      if (maxLength === 0) {
        throw new Error('Pelo menos um campo deve ser preenchido');
      }

      // Criar lista de CEPs (se fornecidos) ou usar índices para busca por endereço
      for (let i = 0; i < maxLength; i++) {
        const cep = cepList[i];
        if (cep) {
          const cleanCep = cep.replace(/\D/g, '');
          if (cleanCep.length === 8) {
            ceps.push(cleanCep);
          }
        } else {
          // Se não há CEP, criar um identificador para busca por endereço
          ceps.push(`ENDERECO_${i}`);
        }
      }
    } else {
      // Processar entrada simples
      ceps = parseInput(textInput)
        .map(cep => cep.replace(/\D/g, ''))
        .filter(cep => cep.length === 8);
    }

    if (ceps.length === 0) {
      throw new Error('Nenhum CEP válido encontrado. Os CEPs devem ter 8 dígitos.');
    }

    if (ceps.length > MAX_CEPS) {
      throw new Error(`Máximo de ${MAX_CEPS} CEPs permitidos. Você inseriu ${ceps.length}.`);
    }

    return ceps;
  };

  const processManualInput = async () => {
    if (loading) return;
    
    try {
      resetState();
      const ceps = validateAndPrepareCeps();
      await processBatch(ceps);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro ao processar CEPs');
    }
  };

  const processBatch = async (ceps: string[]) => {
    setLoading(true);
    setError(null);
    
    const startTime = Date.now();
    abortControllerRef.current = new AbortController();
    
    const initialProgress: BatchProgress = {
      current: 0,
      total: ceps.length,
      percentage: 0,
      estimatedTimeRemaining: 0,
      averageTimePerCep: 0,
      startTime,
      successCount: 0,
      errorCount: 0
    };
    
    setProgress(initialProgress);
    
    try {
      const allResults: BatchResult[] = [];
      
      // Processar em lotes menores para melhor performance
      for (let i = 0; i < ceps.length; i += BATCH_SIZE) {
        if (abortControllerRef.current?.signal.aborted) {
          break;
        }

        // Aguardar se pausado
        while (paused && !abortControllerRef.current?.signal.aborted) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        const batch = ceps.slice(i, Math.min(i + BATCH_SIZE, ceps.length));
        const batchResults = await processBatchCepsAdvanced(
          batch, 
          abortControllerRef.current.signal
        );
        
        allResults.push(...batchResults);
        
        // Atualizar progresso
        const current = Math.min(i + BATCH_SIZE, ceps.length);
        const elapsed = Date.now() - startTime;
        const averageTimePerCep = elapsed / current;
        const remaining = ceps.length - current;
        const estimatedTimeRemaining = remaining * averageTimePerCep;
        
        const successCount = allResults.filter(r => r.status === 'Encontrado').length;
        const errorCount = allResults.filter(r => r.status !== 'Encontrado').length;
        
        setProgress({
          current,
          total: ceps.length,
          percentage: (current / ceps.length) * 100,
          estimatedTimeRemaining,
          averageTimePerCep,
          startTime,
          successCount,
          errorCount
        });
        
        setResults([...allResults]);
        
        // Pequena pausa entre lotes para não sobrecarregar as APIs
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
    } catch (error) {
      if (!abortControllerRef.current?.signal.aborted) {
        setError(error instanceof Error ? error.message : 'Erro ao processar CEPs');
      }
    } finally {
      setLoading(false);
      setPaused(false);
      abortControllerRef.current = null;
    }
  };

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || loading) return;
    
    try {
      resetState();
      
      const data = await file.arrayBuffer();
      const workbook = read(data, { type: 'array' });
      
      if (!workbook.SheetNames.length) {
        throw new Error('Arquivo Excel vazio ou inválido');
      }

      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = utils.sheet_to_json<{
        cep?: string | number;
        rua?: string;
        bairro?: string;
        cidade?: string;
        estado?: string;
      }>(worksheet);
      
      if (!jsonData.length) {
        throw new Error('Nenhum dado encontrado na planilha');
      }

      if (jsonData.length > MAX_CEPS) {
        throw new Error(`Máximo de ${MAX_CEPS} registros permitidos. Arquivo contém ${jsonData.length}.`);
      }

      const ceps = jsonData.map((row, index) => {
        const cepValue = String(row.cep || '');
        const cleanCep = cepValue.replace(/\D/g, '').padStart(8, '0');
        return cleanCep.length === 8 ? cleanCep : `ENDERECO_${index}`;
      }).filter(cep => cep.length >= 8);

      if (ceps.length === 0) {
        throw new Error('Nenhum CEP válido encontrado no arquivo.');
      }

      await processBatch(ceps);
      e.target.value = '';
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro ao processar arquivo');
    }
  }, [loading]);

  const downloadResults = useCallback(() => {
    if (loading || results.length === 0) return;
    
    try {
      const exportData = results.map(result => ({
        CEP: result.cep,
        Rua: result.rua,
        Bairro: result.bairro,
        Cidade: result.cidade,
        Estado: result.estado,
        Status: result.status,
        Fonte: result.fonte,
        'Tempo Resposta (ms)': result.tempo_resposta,
        Erro: result.erro || ''
      }));

      const worksheet = utils.json_to_sheet(exportData);
      const workbook = utils.book_new();
      utils.book_append_sheet(workbook, worksheet, 'Resultados');
      
      // Adicionar estatísticas
      const stats = {
        'Total Processados': results.length,
        'Encontrados': results.filter(r => r.status === 'Encontrado').length,
        'Não Encontrados': results.filter(r => r.status === 'Não encontrado').length,
        'Erros': results.filter(r => r.status === 'Erro').length,
        'Tempo Médio (ms)': Math.round(results.reduce((acc, r) => acc + r.tempo_resposta, 0) / results.length),
        'Data Processamento': new Date().toLocaleString('pt-BR')
      };
      
      const statsWorksheet = utils.json_to_sheet([stats]);
      utils.book_append_sheet(workbook, statsWorksheet, 'Estatísticas');
      
      writeFile(workbook, `consulta_cep_lote_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      setError('Erro ao gerar arquivo de resultados');
    }
  }, [results, loading]);

  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    return `${Math.round(ms / 60000)}min ${Math.round((ms % 60000) / 1000)}s`;
  };

  const togglePause = () => {
    setPaused(!paused);
  };

  const cancelProcess = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    resetState();
    setLoading(false);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="space-y-6">
          {/* Header com informações */}
          <div className="border-b pb-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Consulta em Lote</h2>
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <BarChart3 className="w-4 h-4" />
                <span>Máximo: {MAX_CEPS} CEPs</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>Processamento em lotes de {BATCH_SIZE}</span>
              </div>
              <div className="flex items-center gap-1">
                <FileText className="w-4 h-4" />
                <span>Suporte: Excel, CSV</span>
              </div>
            </div>
          </div>

          {/* Toggle para entrada avançada */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              {showAdvancedInput ? 'Entrada Avançada (4 Campos)' : 'Entrada Simples'}
            </h3>
            <button
              onClick={() => setShowAdvancedInput(!showAdvancedInput)}
              className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              {showAdvancedInput ? 'Modo Simples' : 'Modo Avançado'}
            </button>
          </div>

          {/* Entrada de dados */}
          {showAdvancedInput ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CEPs
                </label>
                <textarea
                  value={advancedInput.ceps}
                  onChange={(e) => setAdvancedInput(prev => ({ ...prev, ceps: e.target.value }))}
                  placeholder="12345-678&#10;87654-321"
                  className="w-full h-32 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ruas
                </label>
                <textarea
                  value={advancedInput.ruas}
                  onChange={(e) => setAdvancedInput(prev => ({ ...prev, ruas: e.target.value }))}
                  placeholder="Rua das Flores&#10;Av. Paulista"
                  className="w-full h-32 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bairros
                </label>
                <textarea
                  value={advancedInput.bairros}
                  onChange={(e) => setAdvancedInput(prev => ({ ...prev, bairros: e.target.value }))}
                  placeholder="Centro&#10;Vila Madalena"
                  className="w-full h-32 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cidades
                </label>
                <textarea
                  value={advancedInput.cidades}
                  onChange={(e) => setAdvancedInput(prev => ({ ...prev, cidades: e.target.value }))}
                  placeholder="São Paulo&#10;Rio de Janeiro"
                  className="w-full h-32 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estados
                </label>
                <textarea
                  value={advancedInput.estados}
                  onChange={(e) => setAdvancedInput(prev => ({ ...prev, estados: e.target.value }))}
                  placeholder="SP&#10;RJ"
                  className="w-full h-32 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CEPs para Consulta
              </label>
              <textarea
                value={textInput}
                onChange={(e) => {
                  setError(null);
                  setTextInput(e.target.value);
                }}
                placeholder="Digite os CEPs separados por vírgula, espaço ou nova linha&#10;Exemplo: 12345-678, 87654-321&#10;&#10;Máximo: 600 CEPs"
                className="w-full h-32 px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                disabled={loading}
              />
              <div className="mt-2 text-sm text-gray-500">
                {textInput ? `${parseInput(textInput).length} CEPs inseridos` : 'Nenhum CEP inserido'}
              </div>
            </div>
          )}

          {/* Upload de arquivo */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Upload de Arquivo
            </h3>
            <div className="space-y-2">
              <label className="block">
                <span className="text-sm text-gray-500 mb-2 block">
                  Aceita arquivos Excel (.xlsx, .csv) com colunas: cep, rua, bairro, cidade, estado (máximo {MAX_CEPS} linhas)
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

          {/* Barra de progresso */}
          {progress && (
            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-medium text-gray-900">Progresso da Consulta</h4>
                <div className="flex items-center gap-2">
                  {loading && (
                    <>
                      <button
                        onClick={togglePause}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                        title={paused ? 'Continuar' : 'Pausar'}
                      >
                        {paused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                      </button>
                      <button
                        onClick={cancelProcess}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                        title="Cancelar"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{progress.current} de {progress.total} CEPs processados</span>
                  <span>{Math.round(progress.percentage)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${progress.percentage}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="bg-white rounded-lg p-3">
                  <div className="text-gray-500">Encontrados</div>
                  <div className="text-lg font-semibold text-green-600">{progress.successCount}</div>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <div className="text-gray-500">Erros</div>
                  <div className="text-lg font-semibold text-red-600">{progress.errorCount}</div>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <div className="text-gray-500">Tempo Restante</div>
                  <div className="text-lg font-semibold text-blue-600">
                    {formatTime(progress.estimatedTimeRemaining)}
                  </div>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <div className="text-gray-500">Tempo Médio/CEP</div>
                  <div className="text-lg font-semibold text-purple-600">
                    {formatTime(progress.averageTimePerCep)}
                  </div>
                </div>
              </div>

              {paused && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-center text-yellow-800">
                    <Pause className="w-5 h-5 mr-2" />
                    <span className="font-medium">Processamento pausado</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Controles */}
          <div className="flex flex-wrap gap-4 justify-between">
            <button
              onClick={processManualInput}
              disabled={loading || (!textInput.trim() && !Object.values(advancedInput).some(v => v.trim()))}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
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
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Download className="w-5 h-5 mr-2" />
                Baixar Resultados ({results.length})
              </button>
            )}
          </div>

          {/* Mensagens de erro */}
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

          {/* Tabela de resultados */}
          {results.length > 0 && (
            <div className="mt-8">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-lg font-medium text-gray-900">
                  Resultados ({results.length})
                </h4>
                <div className="flex gap-4 text-sm text-gray-600">
                  <span className="text-green-600">
                    ✓ {results.filter(r => r.status === 'Encontrado').length} encontrados
                  </span>
                  <span className="text-red-600">
                    ✗ {results.filter(r => r.status !== 'Encontrado').length} não encontrados
                  </span>
                </div>
              </div>
              
              <div className="overflow-x-auto max-h-96 border rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        CEP
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Endereço
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fonte
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tempo
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {results.map((result, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-900">
                          {result.cep}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {result.status === 'Encontrado' 
                            ? `${result.rua}, ${result.bairro}, ${result.cidade} - ${result.estado}`
                            : result.erro || 'Não encontrado'
                          }
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              result.status === 'Encontrado'
                                ? 'bg-green-100 text-green-800'
                                : result.status === 'Erro'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {result.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {result.fonte}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {result.tempo_resposta}ms
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