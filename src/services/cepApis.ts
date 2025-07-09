import { Endereco, APIResponse } from '../types/endereco';

// Função para normalizar CEP (remover formatação)
const normalizeCep = (cep: string): string => cep.replace(/\D/g, '');

// Função para formatar CEP (adicionar hífen)
const formatCep = (cep: string): string => {
  const clean = normalizeCep(cep);
  return clean.length === 8 ? `${clean.slice(0, 5)}-${clean.slice(5)}` : clean;
};

// Timeout para requisições
const TIMEOUT_MS = 5000;

// Função helper para fazer requisições com timeout
const fetchWithTimeout = async (url: string, timeout = TIMEOUT_MS): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

// 1. BrasilAPI
const fetchBrasilAPI = async (cep: string): Promise<APIResponse> => {
  const apiName = 'BrasilAPI';
  try {
    const response = await fetchWithTimeout(`https://brasilapi.com.br/api/cep/v1/${normalizeCep(cep)}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      success: true,
      apiName,
      data: {
        cep: formatCep(data.cep),
        rua: data.street || '',
        bairro: data.neighborhood || '',
        cidade: data.city || '',
        estado: data.state || '',
        origem: apiName
      }
    };
  } catch (error) {
    console.warn(`${apiName} falhou:`, error);
    return {
      success: false,
      apiName,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
};

// 2. AwesomeAPI
const fetchAwesomeAPI = async (cep: string): Promise<APIResponse> => {
  const apiName = 'AwesomeAPI';
  try {
    const response = await fetchWithTimeout(`https://cep.awesomeapi.com.br/json/${normalizeCep(cep)}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status === 400) {
      throw new Error('CEP inválido');
    }
    
    return {
      success: true,
      apiName,
      data: {
        cep: formatCep(data.cep),
        rua: data.address || '',
        bairro: data.district || '',
        cidade: data.city || '',
        estado: data.state || '',
        origem: apiName
      }
    };
  } catch (error) {
    console.warn(`${apiName} falhou:`, error);
    return {
      success: false,
      apiName,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
};

// 3. ViaCEP
const fetchViaCEP = async (cep: string): Promise<APIResponse> => {
  const apiName = 'ViaCEP';
  try {
    const response = await fetchWithTimeout(`https://viacep.com.br/ws/${normalizeCep(cep)}/json/`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.erro) {
      throw new Error('CEP não encontrado');
    }
    
    return {
      success: true,
      apiName,
      data: {
        cep: formatCep(data.cep),
        rua: data.logradouro || '',
        bairro: data.bairro || '',
        cidade: data.localidade || '',
        estado: data.uf || '',
        origem: apiName
      }
    };
  } catch (error) {
    console.warn(`${apiName} falhou:`, error);
    return {
      success: false,
      apiName,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
};

// 4. APICEP
const fetchAPICEP = async (cep: string): Promise<APIResponse> => {
  const apiName = 'APICEP';
  try {
    const response = await fetchWithTimeout(`https://ws.apicep.com/cep/${normalizeCep(cep)}.json`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status === 400 || data.ok === false) {
      throw new Error('CEP não encontrado');
    }
    
    return {
      success: true,
      apiName,
      data: {
        cep: formatCep(data.code),
        rua: data.address || '',
        bairro: data.district || '',
        cidade: data.city || '',
        estado: data.state || '',
        origem: apiName
      }
    };
  } catch (error) {
    console.warn(`${apiName} falhou:`, error);
    return {
      success: false,
      apiName,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
};

// 5. WideNet
const fetchWideNet = async (cep: string): Promise<APIResponse> => {
  const apiName = 'WideNet';
  try {
    const response = await fetchWithTimeout(`https://cep.widenet.host/busca-cep/api/cep.json?code=${normalizeCep(cep)}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status === 'error' || !data.address) {
      throw new Error('CEP não encontrado');
    }
    
    return {
      success: true,
      apiName,
      data: {
        cep: formatCep(data.code),
        rua: data.address || '',
        bairro: data.neighborhood || '',
        cidade: data.city || '',
        estado: data.state || '',
        origem: apiName
      }
    };
  } catch (error) {
    console.warn(`${apiName} falhou:`, error);
    return {
      success: false,
      apiName,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
};

// Lista de APIs em ordem de prioridade
const APIs = [
  fetchBrasilAPI,
  fetchAwesomeAPI,
  fetchViaCEP,
  fetchAPICEP,
  fetchWideNet
];

// Função principal com fallback automático
export const buscarCepComFallback = async (cep: string): Promise<Endereco> => {
  const cleanCep = normalizeCep(cep);
  
  if (cleanCep.length !== 8) {
    throw new Error('CEP deve conter exatamente 8 dígitos');
  }
  
  const errors: string[] = [];
  
  for (const apiFunction of APIs) {
    try {
      const result = await apiFunction(cleanCep);
      
      if (result.success && result.data) {
        console.log(`CEP ${formatCep(cleanCep)} encontrado via ${result.apiName}`);
        return result.data;
      } else {
        errors.push(`${result.apiName}: ${result.error}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      errors.push(`API falhou: ${errorMsg}`);
    }
  }
  
  console.warn('Todas as APIs falharam para o CEP:', cleanCep, errors);
  throw new Error('CEP não encontrado em nenhuma fonte disponível');
};