import { buscarCepComFallback } from './cepApis';

export interface BatchResult {
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

// Função para processar CEPs em lote com controle avançado
export async function processBatchCepsAdvanced(
  ceps: string[],
  abortSignal?: AbortSignal
): Promise<BatchResult[]> {
  const results: BatchResult[] = [];
  
  // Processar CEPs em paralelo com limite de concorrência
  const CONCURRENT_LIMIT = 5;
  const chunks = [];
  
  for (let i = 0; i < ceps.length; i += CONCURRENT_LIMIT) {
    chunks.push(ceps.slice(i, i + CONCURRENT_LIMIT));
  }
  
  for (const chunk of chunks) {
    if (abortSignal?.aborted) {
      break;
    }
    
    const chunkPromises = chunk.map(async (cep) => {
      const startTime = Date.now();
      
      try {
        if (abortSignal?.aborted) {
          throw new Error('Operação cancelada');
        }
        
        // Se o CEP começa com "ENDERECO_", é uma busca por endereço
        if (cep.startsWith('ENDERECO_')) {
          return {
            cep: cep,
            rua: '',
            bairro: '',
            cidade: '',
            estado: '',
            status: 'Erro' as const,
            fonte: 'Sistema',
            tempo_resposta: Date.now() - startTime,
            erro: 'Busca por endereço não implementada neste contexto'
          };
        }
        
        const endereco = await buscarCepComFallback(cep);
        
        return {
          cep: endereco.cep,
          rua: endereco.rua,
          bairro: endereco.bairro,
          cidade: endereco.cidade,
          estado: endereco.estado,
          status: 'Encontrado' as const,
          fonte: endereco.origem,
          tempo_resposta: Date.now() - startTime
        };
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        
        return {
          cep: cep,
          rua: '',
          bairro: '',
          cidade: '',
          estado: '',
          status: errorMessage.includes('cancelada') ? 'Erro' : 'Não encontrado' as const,
          fonte: 'Sistema',
          tempo_resposta: Date.now() - startTime,
          erro: errorMessage
        };
      }
    });
    
    const chunkResults = await Promise.all(chunkPromises);
    results.push(...chunkResults);
    
    // Pequena pausa entre chunks para não sobrecarregar as APIs
    if (!abortSignal?.aborted) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  return results;
}

// Função para estimar tempo de processamento
export function estimateProcessingTime(cepCount: number): number {
  // Baseado em testes, cada CEP leva em média 800ms para ser processado
  const AVERAGE_TIME_PER_CEP = 800;
  const CONCURRENT_LIMIT = 5;
  const BATCH_OVERHEAD = 200; // Overhead entre lotes
  
  const batches = Math.ceil(cepCount / CONCURRENT_LIMIT);
  const estimatedTime = (cepCount * AVERAGE_TIME_PER_CEP / CONCURRENT_LIMIT) + (batches * BATCH_OVERHEAD);
  
  return estimatedTime;
}

// Função para validar entrada de CEPs
export function validateCepInput(input: string): {
  valid: string[];
  invalid: string[];
  total: number;
} {
  const items = input
    .split(/[\n,\s]+/)
    .map(item => item.trim())
    .filter(item => item.length > 0);
  
  const valid: string[] = [];
  const invalid: string[] = [];
  
  items.forEach(item => {
    const cleanCep = item.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      valid.push(cleanCep);
    } else {
      invalid.push(item);
    }
  });
  
  return {
    valid,
    invalid,
    total: items.length
  };
}

// Função para gerar relatório de estatísticas
export function generateBatchStats(results: BatchResult[]): {
  total: number;
  encontrados: number;
  naoEncontrados: number;
  erros: number;
  tempoMedio: number;
  tempoTotal: number;
  fontesMaisUsadas: { fonte: string; count: number }[];
  taxaSucesso: number;
} {
  const total = results.length;
  const encontrados = results.filter(r => r.status === 'Encontrado').length;
  const naoEncontrados = results.filter(r => r.status === 'Não encontrado').length;
  const erros = results.filter(r => r.status === 'Erro').length;
  
  const tempoTotal = results.reduce((acc, r) => acc + r.tempo_resposta, 0);
  const tempoMedio = total > 0 ? tempoTotal / total : 0;
  
  // Contar fontes mais usadas
  const fontesCount = results.reduce((acc, r) => {
    if (r.status === 'Encontrado') {
      acc[r.fonte] = (acc[r.fonte] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);
  
  const fontesMaisUsadas = Object.entries(fontesCount)
    .map(([fonte, count]) => ({ fonte, count }))
    .sort((a, b) => b.count - a.count);
  
  const taxaSucesso = total > 0 ? (encontrados / total) * 100 : 0;
  
  return {
    total,
    encontrados,
    naoEncontrados,
    erros,
    tempoMedio,
    tempoTotal,
    fontesMaisUsadas,
    taxaSucesso
  };
}