import React, { useState, useCallback, useRef } from 'react';
import { Upload, Download, Loader2, AlertCircle, Play, Pause, X, FileText, Clock, BarChart3, ToggleLeft, ToggleRight } from 'lucide-react';
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
  campo_origem: string;
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
  campo1Count: number;
  campo2Count: number;
  campo3Count: number;
  campo4Count: number;
}

const MAX_CEPS_PER_FIELD = 600;
const MAX_CEPS_SIMPLE_MODE = 2400; // 4 * 600
const BATCH_SIZE = 10;

export function BatchLookup() {
  const [mode, setMode] = useState<'simple' | 'advanced'>('simple');
  const [loading, setLoading] = useState(false);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<BatchResult[]>([]);
  const [progress, setProgress] = useState<BatchProgress | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Modo Simples - Campo único
  const [simpleCeps, setSimpleCeps] = useState('');

  // Modo Avançado - 4 campos separados
  const [cepFields, setCepFields] = useState({
    campo1: '',
    campo2: '',
    campo3: '',
    campo4: ''
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
      .map(item => item.trim().replace(/\D/g, ''))
      .filter(item => item.length === 8);
  };

  const validateAndPrepareCepsSimple = (): { ceps: string[], fieldCounts: Record<string, number> } => {
    const ceps = parseInput(simpleCeps);
    
    if (ceps.length > MAX_CEPS_SIMPLE_MODE) {
      throw new Error(`Modo simples permite máximo de ${MAX_CEPS_SIMPLE_MODE} CEPs. Encontrados: ${ceps.length}`);
    }

    if (ceps.length === 0) {
      throw new Error('Nenhum CEP válido encontrado. Os CEPs devem ter 8 dígitos.');
    }

    // No modo simples, todos os CEPs vão para o "campo1"
    const cepsWithField = ceps.map(cep => `${cep}|campo1`);
    
    return { 
      ceps: cepsWithField, 
      fieldCounts: { campo1: ceps.length, campo2: 0, campo3: 0, campo4: 0 }
    };
  };

  const validateAndPrepareCepsAdvanced = (): { ceps: string[], fieldCounts: Record<string, number> } => {
    const allCeps: string[] = [];
    const fieldCounts: Record<string, number> = {};

    Object.entries(cepFields).forEach(([fieldName, fieldValue]) => {
      const ceps = parseInput(fieldValue);
      
      if (ceps.length > MAX_CEPS_PER_FIELD) {
        throw new Error(`Campo ${fieldName.replace('campo', '')} excede o limite de ${MAX_CEPS_PER_FIELD} CEPs. Encontrados: ${ceps.length}`);
      }

      fieldCounts[fieldName] = ceps.length;
      
      ceps.forEach(cep => {
        allCeps.push(`${cep}|${fieldName}`);
      });
    });

    if (allCeps.length === 0) {
      throw new Error('Nenhum CEP válido encontrado. Os CEPs devem ter 8 dígitos.');
    }

    const totalCeps = allCeps.length;
    if (totalCeps > MAX_CEPS_PER_FIELD * 4) {
      throw new Error(`Máximo total de ${MAX_CEPS_PER_FIELD * 4} CEPs permitidos. Você inseriu ${totalCeps}.`);
    }

    return { ceps: allCeps, fieldCounts };
  };

  const processManualInput = async () => {
    if (loading) return;
    
    try {
      resetState();
      
      const { ceps, fieldCounts } = mode === 'simple' 
        ? validateAndPrepareCepsSimple()
        : validateAndPrepareCepsAdvanced();
        
      await processBatch(ceps, fieldCounts);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro ao processar CEPs');
    }
  };

  const processBatch = async (cepsWithFields: string[], fieldCounts: Record<string, number>) => {
    setLoading(true);
    setError(null);
    
    const startTime = Date.now();
    abortControllerRef.current = new AbortController();
    
    const initialProgress: BatchProgress = {
      current: 0,
      total: cepsWithFields.length,
      percentage: 0,
      estimatedTimeRemaining: 0,
      averageTimePerCep: 0,
      startTime,
      successCount: 0,
      errorCount: 0,
      campo1Count: fieldCounts.campo1 || 0,
      campo2Count: fieldCounts.campo2 || 0,
      campo3Count: fieldCounts.campo3 || 0,
      campo4Count: fieldCounts.campo4 || 0
    };
    
    setProgress(initialProgress);
    
    try {
      const allResults: BatchResult[] = [];
      
      for (let i = 0; i < cepsWithFields.length; i += BATCH_SIZE) {
        if (abortControllerRef.current?.signal.aborted) {
          break;
        }

        while (paused && !abortControllerRef.current?.signal.aborted) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        const batch = cepsWithFields.slice(i, Math.min(i + BATCH_SIZE, cepsWithFields.length));
        
        const cleanBatch = batch.map(item => {
          const [cep, campo] = item.split('|');
          return { cep, campo };
        });

        const batchResults = await processBatchCepsAdvanced(
          cleanBatch.map(item => item.cep), 
          abortControllerRef.current.signal
        );
        
        const resultsWithField = batchResults.map((result, index) => ({
          ...result,
          campo_origem: mode === 'simple' 
            ? 'Modo Simples' 
            : cleanBatch[index].campo.replace('campo', 'Campo ')
        }));
        
        allResults.push(...resultsWithField);
        
        const current = Math.min(i + BATCH_SIZE, cepsWithFields.length);
        const elapsed = Date.now() - startTime;
        const averageTimePerCep = elapsed / current;
        const remaining = cepsWithFields.length - current;
        const estimatedTimeRemaining = remaining * averageTimePerCep;
        
        const successCount = allResults.filter(r => r.status === 'Encontrado').length;
        const errorCount = allResults.filter(r => r.status !== 'Encontrado').length;
        
        setProgress({
          current,
          total: cepsWithFields.length,
          percentage: (current / cepsWithFields.length) * 100,
          estimatedTimeRemaining,
          averageTimePerCep,
          startTime,
          successCount,
          errorCount,
          campo1Count: fieldCounts.campo1 || 0,
          campo2Count: fieldCounts.campo2 || 0,
          campo3Count: fieldCounts.campo3 || 0,
          campo4Count: fieldCounts.campo4 || 0
        });
        
        setResults([...allResults]);
        
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
      
      if (mode === 'simple') {
        // Modo simples: procurar por coluna "cep" ou primeira coluna
        const jsonData = utils.sheet_to_json<{ cep?: string | number }>(worksheet);
        
        if (!jsonData.length) {
          throw new Error('Nenhum dado encontrado na planilha');
        }

        const ceps = jsonData
          .map(row => {
            const cepValue = row.cep || Object.values(row)[0];
            return String(cepValue || '').replace(/\D/g, '');
          })
          .filter(cep => cep.length === 8);

        if (ceps.length === 0) {
          throw new Error('Nenhum CEP válido encontrado no arquivo');
        }

        setSimpleCeps(ceps.join('\n'));
        
        // Processar automaticamente
        const cepsWithField = ceps.map(cep => `${cep}|campo1`);
        const fieldCounts = { campo1: ceps.length, campo2: 0, campo3: 0, campo4: 0 };
        await processBatch(cepsWithField, fieldCounts);
        
      } else {
        // Modo avançado: procurar por colunas campo1, campo2, campo3, campo4
        const jsonData = utils.sheet_to_json<{
          campo1?: string | number;
          campo2?: string | number;
          campo3?: string | number;
          campo4?: string | number;
        }>(worksheet);
        
        if (!jsonData.length) {
          throw new Error('Nenhum dado encontrado na planilha');
        }

        const newCepFields = {
          campo1: '',
          campo2: '',
          campo3: '',
          campo4: ''
        };

        jsonData.forEach((row) => {
          if (row.campo1) {
            const cep = String(row.campo1).replace(/\D/g, '');
            if (cep.length === 8) {
              newCepFields.campo1 += (newCepFields.campo1 ? '\n' : '') + cep;
            }
          }
          if (row.campo2) {
            const cep = String(row.campo2).replace(/\D/g, '');
            if (cep.length === 8) {
              newCepFields.campo2 += (newCepFields.campo2 ? '\n' : '') + cep;
            }
          }
          if (row.campo3) {
            const cep = String(row.campo3).replace(/\D/g, '');
            if (cep.length === 8) {
              newCepFields.campo3 += (newCepFields.campo3 ? '\n' : '') + cep;
            }
          }
          if (row.campo4) {
            const cep = String(row.campo4).replace(/\D/g, '');
            if (cep.length === 8) {
              newCepFields.campo4 += (newCepFields.campo4 ? '\n' : '') + cep;
            }
          }
        });

        setCepFields(newCepFields);
        
        // Processar automaticamente
        const { ceps, fieldCounts } = validateAndPrepareCepsAdvanced();
        await processBatch(ceps, fieldCounts);
      }
      
      e.target.value = '';
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro ao processar arquivo');
    }
  }, [loading, mode]);

  const downloadResults = useCallback(() => {
    if (loading || results.length === 0) return;
    
    try {
      const exportData = results.map(result => ({
        'Campo Origem': result.campo_origem,
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
      
      if (mode === 'advanced') {
        // Estatísticas por campo apenas no modo avançado
        const statsByCampo = ['Campo 1', 'Campo 2', 'Campo 3', 'Campo 4'].map(campo => {
          const campoResults = results.filter(r => r.campo_origem === campo);
          return {
            Campo: campo,
            'Total Processados': campoResults.length,
            'Encontrados': campoResults.filter(r => r.status === 'Encontrado').length,
            'Não Encontrados': campoResults.filter(r => r.status === 'Não encontrado').length,
            'Erros': campoResults.filter(r => r.status === 'Erro').length,
            'Taxa Sucesso (%)': campoResults.length > 0 
              ? Math.round((campoResults.filter(r => r.status === 'Encontrado').length / campoResults.length) * 100)
              : 0,
            'Tempo Médio (ms)': campoResults.length > 0
              ? Math.round(campoResults.reduce((acc, r) => acc + r.tempo_resposta, 0) / campoResults.length)
              : 0
          };
        });
        
        const statsWorksheet = utils.json_to_sheet(statsByCampo);
        utils.book_append_sheet(workbook, statsWorksheet, 'Estatísticas por Campo');
      }
      
      // Estatísticas gerais
      const generalStats = {
        'Modo de Processamento': mode === 'simple' ? 'Simples' : 'Avançado',
        'Total Geral': results.length,
        'Encontrados': results.filter(r => r.status === 'Encontrado').length,
        'Não Encontrados': results.filter(r => r.status === 'Não encontrado').length,
        'Erros': results.filter(r => r.status === 'Erro').length,
        'Taxa Sucesso Geral (%)': Math.round((results.filter(r => r.status === 'Encontrado').length / results.length) * 100),
        'Tempo Médio Geral (ms)': Math.round(results.reduce((acc, r) => acc + r.tempo_resposta, 0) / results.length),
        'Data Processamento': new Date().toLocaleString('pt-BR')
      };
      
      const generalStatsWorksheet = utils.json_to_sheet([generalStats]);
      utils.book_append_sheet(workbook, generalStatsWorksheet, 'Estatísticas Gerais');
      
      const fileName = mode === 'simple' 
        ? `consulta_cep_simples_${new Date().toISOString().split('T')[0]}.xlsx`
        : `consulta_cep_4campos_${new Date().toISOString().split('T')[0]}.xlsx`;
        
      writeFile(workbook, fileName);
    } catch (error) {
      setError('Erro ao gerar arquivo de resultados');
    }
  }, [results, loading, mode]);

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

  const handleFieldChange = (field: keyof typeof cepFields, value: string) => {
    setError(null);
    setCepFields(prev => ({ ...prev, [field]: value }));
  };

  const clearField = (field: keyof typeof cepFields) => {
    setCepFields(prev => ({ ...prev, [field]: '' }));
  };

  const clearSimpleField = () => {
    setSimpleCeps('');
  };

  const getFieldStats = (field: keyof typeof cepFields) => {
    const ceps = parseInput(cepFields[field]);
    return {
      count: ceps.length,
      isOverLimit: ceps.length > MAX_CEPS_PER_FIELD,
      percentage: (ceps.length / MAX_CEPS_PER_FIELD) * 100
    };
  };

  const getSimpleStats = () => {
    const ceps = parseInput(simpleCeps);
    return {
      count: ceps.length,
      isOverLimit: ceps.length > MAX_CEPS_SIMPLE_MODE,
      percentage: (ceps.length / MAX_CEPS_SIMPLE_MODE) * 100
    };
  };

  const totalCeps = mode === 'simple' 
    ? parseInput(simpleCeps).length
    : Object.values(cepFields).reduce((total, field) => {
        return total + parseInput(field).length;
      }, 0);

  const hasAnyCeps = mode === 'simple' 
    ? simpleCeps.trim().length > 0
    : Object.values(cepFields).some(field => field.trim());

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="space-y-6">
          {/* Header com toggle de modo */}
          <div className="border-b pb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Consulta em Lote</h2>
              
              <div className="flex items-center gap-4">
                <span className={`text-sm font-medium ${mode === 'simple' ? 'text-blue-600' : 'text-gray-500'}`}>
                  Modo Simples
                </span>
                <button
                  onClick={() => {
                    setMode(mode === 'simple' ? 'advanced' : 'simple');
                    resetState();
                  }}
                  className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  disabled={loading}
                >
                  {mode === 'simple' ? (
                    <ToggleLeft className="w-8 h-8" />
                  ) : (
                    <ToggleRight className="w-8 h-8" />
                  )}
                </button>
                <span className={`text-sm font-medium ${mode === 'advanced' ? 'text-blue-600' : 'text-gray-500'}`}>
                  Modo Avançado
                </span>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <BarChart3 className="w-4 h-4" />
                <span>
                  {mode === 'simple' 
                    ? `Máximo: ${MAX_CEPS_SIMPLE_MODE} CEPs` 
                    : `Máximo: ${MAX_CEPS_PER_FIELD} CEPs por campo`
                  }
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>Processamento em lotes de {BATCH_SIZE}</span>
              </div>
              <div className="flex items-center gap-1">
                <FileText className="w-4 h-4" />
                <span>Total atual: {totalCeps} CEPs</span>
              </div>
            </div>
          </div>

          {/* Campos de entrada baseados no modo */}
          {mode === 'simple' ? (
            // MODO SIMPLES - Campo único
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-lg font-medium text-gray-700">
                  CEPs para Consulta
                </label>
                <div className="flex items-center gap-2 text-sm">
                  <span className={`px-3 py-1 rounded-full ${
                    getSimpleStats().isOverLimit 
                      ? 'bg-red-100 text-red-800' 
                      : getSimpleStats().count > 0 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-600'
                  }`}>
                    {getSimpleStats().count}/{MAX_CEPS_SIMPLE_MODE}
                  </span>
                  {simpleCeps && (
                    <button
                      onClick={clearSimpleField}
                      className="text-gray-400 hover:text-gray-600"
                      title="Limpar campo"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              
              <div className="relative">
                <textarea
                  value={simpleCeps}
                  onChange={(e) => {
                    setError(null);
                    setSimpleCeps(e.target.value);
                  }}
                  placeholder={`Digite ou cole os CEPs (um por linha ou separados por vírgula/espaço)
Exemplo:
12345678
87654321, 11111111
22222222 33333333`}
                  className={`w-full h-48 px-4 py-3 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                    getSimpleStats().isOverLimit 
                      ? 'border-red-300 bg-red-50' 
                      : 'border-gray-300'
                  }`}
                  disabled={loading}
                />
                
                {getSimpleStats().count > 0 && (
                  <div className="absolute bottom-3 right-3 w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        getSimpleStats().isOverLimit 
                          ? 'bg-red-500' 
                          : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min(getSimpleStats().percentage, 100)}%` }}
                    />
                  </div>
                )}
              </div>
              
              {getSimpleStats().isOverLimit && (
                <p className="text-sm text-red-600">
                  ⚠️ Limite excedido! Máximo {MAX_CEPS_SIMPLE_MODE} CEPs no modo simples.
                </p>
              )}
            </div>
          ) : (
            // MODO AVANÇADO - 4 campos separados
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(cepFields).map(([fieldKey, fieldValue], index) => {
                const stats = getFieldStats(fieldKey as keyof typeof cepFields);
                const fieldNumber = index + 1;
                
                return (
                  <div key={fieldKey} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-gray-700">
                        Campo {fieldNumber} - CEPs
                      </label>
                      <div className="flex items-center gap-2 text-xs">
                        <span className={`px-2 py-1 rounded-full ${
                          stats.isOverLimit 
                            ? 'bg-red-100 text-red-800' 
                            : stats.count > 0 
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-600'
                        }`}>
                          {stats.count}/{MAX_CEPS_PER_FIELD}
                        </span>
                        {fieldValue && (
                          <button
                            onClick={() => clearField(fieldKey as keyof typeof cepFields)}
                            className="text-gray-400 hover:text-gray-600"
                            title="Limpar campo"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="relative">
                      <textarea
                        value={fieldValue}
                        onChange={(e) => handleFieldChange(fieldKey as keyof typeof cepFields, e.target.value)}
                        placeholder={`Digite os CEPs do campo ${fieldNumber}
Exemplo:
12345678
87654321
11111111`}
                        className={`w-full h-32 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                          stats.isOverLimit 
                            ? 'border-red-300 bg-red-50' 
                            : 'border-gray-300'
                        }`}
                        disabled={loading}
                      />
                      
                      {stats.count > 0 && (
                        <div className="absolute bottom-2 right-2 w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              stats.isOverLimit 
                                ? 'bg-red-500' 
                                : 'bg-blue-500'
                            }`}
                            style={{ width: `${Math.min(stats.percentage, 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                    
                    {stats.isOverLimit && (
                      <p className="text-xs text-red-600">
                        ⚠️ Limite excedido! Máximo {MAX_CEPS_PER_FIELD} CEPs por campo.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Upload de arquivo */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Upload de Arquivo Excel/CSV
            </h3>
            <div className="space-y-2">
              <p className="text-sm text-gray-500">
                {mode === 'simple' 
                  ? 'Arquivo deve ter uma coluna "cep" ou CEPs na primeira coluna'
                  : 'Arquivo deve ter colunas: campo1, campo2, campo3, campo4 (cada uma com até 600 CEPs)'
                }
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

          {/* Barra de progresso */}
          {progress && (
            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-medium text-gray-900">
                  Progresso da Consulta ({mode === 'simple' ? 'Modo Simples' : 'Modo Avançado'})
                </h4>
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

              {/* Estatísticas por campo (apenas no modo avançado) */}
              {mode === 'advanced' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="bg-white rounded-lg p-3">
                    <div className="text-gray-500">Campo 1</div>
                    <div className="text-lg font-semibold text-blue-600">{progress.campo1Count} CEPs</div>
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <div className="text-gray-500">Campo 2</div>
                    <div className="text-lg font-semibold text-green-600">{progress.campo2Count} CEPs</div>
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <div className="text-gray-500">Campo 3</div>
                    <div className="text-lg font-semibold text-purple-600">{progress.campo3Count} CEPs</div>
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <div className="text-gray-500">Campo 4</div>
                    <div className="text-lg font-semibold text-orange-600">{progress.campo4Count} CEPs</div>
                  </div>
                </div>
              )}

              {/* Estatísticas gerais */}
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
              disabled={loading || !hasAnyCeps || totalCeps === 0}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  <span>Processando {totalCeps} CEPs...</span>
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5 mr-2" />
                  <span>Processar {totalCeps} CEPs ({mode === 'simple' ? 'Simples' : 'Avançado'})</span>
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
                  Resultados ({results.length}) - {mode === 'simple' ? 'Modo Simples' : 'Modo Avançado'}
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
                        {mode === 'simple' ? 'Origem' : 'Campo'}
                      </th>
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
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {mode === 'simple' ? (
                            <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                              {result.campo_origem}
                            </span>
                          ) : (
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              result.campo_origem === 'Campo 1' ? 'bg-blue-100 text-blue-800' :
                              result.campo_origem === 'Campo 2' ? 'bg-green-100 text-green-800' :
                              result.campo_origem === 'Campo 3' ? 'bg-purple-100 text-purple-800' :
                              'bg-orange-100 text-orange-800'
                            }`}>
                              {result.campo_origem}
                            </span>
                          )}
                        </td>
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