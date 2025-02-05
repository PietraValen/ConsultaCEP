interface ViaCEPResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge: string;
  gia: string;
  ddd: string;
  siafi: string;
  erro?: boolean;
}

interface AwesomeAPIResponse {
  cep: string;
  address_type: string;
  address_name: string;
  address: string;
  state: string;
  district: string;
  lat: string;
  lng: string;
  city: string;
  city_ibge: string;
  ddd: string;
}

interface BrasilAPIResponse {
  cep: string;
  state: string;
  city: string;
  neighborhood: string;
  street: string;
  service: string;
}

interface CombinedAddressData {
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  estado: string;
  complemento?: string;
  tipo?: string;
  latitude?: string;
  longitude?: string;
  ddd?: string;
  ibge?: string;
  fonte?: string;
  erro?: string;
}

interface APIStatus {
  id: string;
  name: string;
  status: 'online' | 'offline';
  lastCheck: Date;
  responseTime: number;
}

// Cache implementation for better performance
const cepCache = new Map<string, Record<string, CombinedAddressData>>();
const CACHE_DURATION = 1000 * 60 * 5; // 5 minutes

let apiStatus: APIStatus[] = [
  { id: 'viacep', name: 'ViaCEP', status: 'online', lastCheck: new Date(), responseTime: 0 },
  { id: 'awesomeapi', name: 'AwesomeAPI', status: 'online', lastCheck: new Date(), responseTime: 0 },
  { id: 'brasilapi', name: 'BrasilAPI', status: 'online', lastCheck: new Date(), responseTime: 0 }
];

async function checkAPIStatus(api: string): Promise<boolean> {
  const testCEP = '01001000';
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(
      api === 'viacep' 
        ? `https://viacep.com.br/ws/${testCEP}/json/`
        : api === 'awesomeapi'
        ? `https://cep.awesomeapi.com.br/json/${testCEP}`
        : `https://brasilapi.com.br/api/cep/v1/${testCEP}`,
      { signal: controller.signal }
    );
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    const index = apiStatus.findIndex(s => s.id === api);
    if (index !== -1) {
      apiStatus[index] = {
        ...apiStatus[index],
        status: response.ok ? 'online' : 'offline',
        lastCheck: new Date(),
        responseTime
      };
    }
    
    return response.ok;
  } catch {
    const index = apiStatus.findIndex(s => s.id === api);
    if (index !== -1) {
      apiStatus[index] = {
        ...apiStatus[index],
        status: 'offline',
        lastCheck: new Date(),
        responseTime: 0
      };
    }
    return false;
  }
}

export function getAPIStatus(): APIStatus[] {
  return apiStatus;
}

async function fetchViaCEP(cep: string): Promise<CombinedAddressData | null> {
  if (apiStatus.find(api => api.id === 'viacep')?.status === 'offline') {
    return {
      cep,
      logradouro: '',
      bairro: '',
      cidade: '',
      estado: '',
      fonte: 'ViaCEP',
      erro: 'Serviço temporariamente indisponível'
    };
  }

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data: ViaCEPResponse = await response.json();
    
    if (data.erro || !data.logradouro) {
      return {
        cep,
        logradouro: '',
        bairro: '',
        cidade: '',
        estado: '',
        fonte: 'ViaCEP',
        erro: 'CEP não encontrado'
      };
    }
    
    return {
      cep: data.cep,
      logradouro: data.logradouro,
      bairro: data.bairro,
      cidade: data.localidade,
      estado: data.uf,
      complemento: data.complemento || undefined,
      ddd: data.ddd,
      ibge: data.ibge,
      fonte: 'ViaCEP'
    };
  } catch {
    return {
      cep,
      logradouro: '',
      bairro: '',
      cidade: '',
      estado: '',
      fonte: 'ViaCEP',
      erro: 'Erro ao consultar o serviço'
    };
  }
}

async function fetchAwesomeAPI(cep: string): Promise<CombinedAddressData | null> {
  if (apiStatus.find(api => api.id === 'awesomeapi')?.status === 'offline') {
    return {
      cep,
      logradouro: '',
      bairro: '',
      cidade: '',
      estado: '',
      fonte: 'AwesomeAPI',
      erro: 'Serviço temporariamente indisponível'
    };
  }

  try {
    const response = await fetch(`https://cep.awesomeapi.com.br/json/${cep}`);
    if (!response.ok) {
      return {
        cep,
        logradouro: '',
        bairro: '',
        cidade: '',
        estado: '',
        fonte: 'AwesomeAPI',
        erro: 'CEP não encontrado'
      };
    }
    
    const data: AwesomeAPIResponse = await response.json();
    
    return {
      cep: data.cep,
      logradouro: data.address,
      bairro: data.district,
      cidade: data.city,
      estado: data.state,
      tipo: data.address_type,
      latitude: data.lat,
      longitude: data.lng,
      ddd: data.ddd,
      ibge: data.city_ibge,
      fonte: 'AwesomeAPI'
    };
  } catch {
    return {
      cep,
      logradouro: '',
      bairro: '',
      cidade: '',
      estado: '',
      fonte: 'AwesomeAPI',
      erro: 'Erro ao consultar o serviço'
    };
  }
}

async function fetchBrasilAPI(cep: string): Promise<CombinedAddressData | null> {
  if (apiStatus.find(api => api.id === 'brasilapi')?.status === 'offline') {
    return {
      cep,
      logradouro: '',
      bairro: '',
      cidade: '',
      estado: '',
      fonte: 'BrasilAPI',
      erro: 'Serviço temporariamente indisponível'
    };
  }

  try {
    const response = await fetch(`https://brasilapi.com.br/api/cep/v1/${cep}`);
    if (!response.ok) {
      return {
        cep,
        logradouro: '',
        bairro: '',
        cidade: '',
        estado: '',
        fonte: 'BrasilAPI',
        erro: 'CEP não encontrado'
      };
    }
    
    const data: BrasilAPIResponse = await response.json();
    
    return {
      cep: data.cep,
      logradouro: data.street,
      bairro: data.neighborhood,
      cidade: data.city,
      estado: data.state,
      fonte: 'BrasilAPI'
    };
  } catch {
    return {
      cep,
      logradouro: '',
      bairro: '',
      cidade: '',
      estado: '',
      fonte: 'BrasilAPI',
      erro: 'Erro ao consultar o serviço'
    };
  }
}

export async function fetchAddressDataFromAllAPIs(cep: string): Promise<Record<string, CombinedAddressData>> {
  const cleanCep = cep.replace(/\D/g, '');
  
  // Check cache first
  const cachedResult = cepCache.get(cleanCep);
  if (cachedResult) {
    const cacheAge = Date.now() - (cachedResult as any).timestamp;
    if (cacheAge < CACHE_DURATION) {
      delete (cachedResult as any).timestamp;
      return cachedResult;
    }
    cepCache.delete(cleanCep);
  }

  // Check API status every request to keep it updated
  await Promise.all([
    checkAPIStatus('viacep'),
    checkAPIStatus('awesomeapi'),
    checkAPIStatus('brasilapi')
  ]);

  const results: Record<string, CombinedAddressData> = {};

  try {
    const [viaCepResult, awesomeResult, brasilResult] = await Promise.allSettled([
      fetchViaCEP(cleanCep),
      fetchAwesomeAPI(cleanCep),
      fetchBrasilAPI(cleanCep)
    ]);

    if (viaCepResult.status === 'fulfilled' && viaCepResult.value) {
      results['ViaCEP'] = viaCepResult.value;
    }
    
    if (awesomeResult.status === 'fulfilled' && awesomeResult.value) {
      results['AwesomeAPI'] = awesomeResult.value;
    }
    
    if (brasilResult.status === 'fulfilled' && brasilResult.value) {
      results['BrasilAPI'] = brasilResult.value;
    }

    // Cache the results
    cepCache.set(cleanCep, { ...results, timestamp: Date.now() });

    return results;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Erro ao buscar o CEP. Verifique se o CEP é válido e tente novamente.');
  }
}

export async function processBatchCeps(ceps: string[]) {
  // Check API status before processing batch
  await Promise.all([
    checkAPIStatus('viacep'),
    checkAPIStatus('awesomeapi'),
    checkAPIStatus('brasilapi')
  ]);

  const results = await Promise.all(
    ceps.map(async (cep) => {
      try {
        const data = await fetchAddressDataFromAllAPIs(cep);
        return Object.entries(data).map(([apiName, result]) => ({
          cep,
          api: apiName,
          status: result.erro ? 'Não encontrado' : 'Encontrado',
          endereco: result.erro 
            ? result.erro 
            : `${result.logradouro}, ${result.bairro}, ${result.cidade} - ${result.estado}`,
          fonte: result.fonte
        }));
      } catch (error) {
        return [{
          cep,
          api: 'N/A',
          status: 'Não encontrado',
          endereco: 'CEP não encontrado em nenhuma base de dados'
        }];
      }
    })
  );

  return results.flat();
}

export async function searchAddressByCep(address: {
  rua: string;
  bairro: string;
  cidade: string;
  estado: string;
}) {
  const { cidade, estado } = address;
  
  try {
    const response = await fetch(
      `https://viacep.com.br/ws/${estado}/${cidade}/${address.rua}/json/`
    );
    
    if (!response.ok) {
      return [{
        endereco: `${address.rua}, ${address.bairro}, ${address.cidade} - ${address.estado}`,
        cep: 'Não encontrado',
        status: 'Não encontrado'
      }];
    }

    const data: ViaCEPResponse[] = await response.json();
    
    if (!data.length) {
      return [{
        endereco: `${address.rua}, ${address.bairro}, ${address.cidade} - ${address.estado}`,
        cep: 'Não encontrado',
        status: 'Não encontrado'
      }];
    }
    
    return data.map(item => ({
      endereco: `${item.logradouro}, ${item.bairro}, ${item.localidade} - ${item.uf}`,
      cep: item.cep,
      status: 'Encontrado'
    }));
  } catch (error) {
    return [{
      endereco: `${address.rua}, ${address.bairro}, ${address.cidade} - ${address.estado}`,
      cep: 'Não encontrado',
      status: 'Erro ao consultar o serviço'
    }];
  }
}