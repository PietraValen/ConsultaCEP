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
}

export async function fetchAddressData(cep: string): Promise<CombinedAddressData> {
  const cleanCep = cep.replace(/\D/g, '');
  
  try {
    // Fazendo as requisições em paralelo para melhor performance
    const [viaCepResponse, awesomeApiResponse] = await Promise.allSettled([
      fetch(`https://viacep.com.br/ws/${cleanCep}/json/`),
      fetch(`https://cep.awesomeapi.com.br/json/${cleanCep}`)
    ]);

    let viaCepData: ViaCEPResponse | null = null;
    let awesomeApiData: AwesomeAPIResponse | null = null;
    let mainSource: 'viacep' | 'awesomeapi' | null = null;

    // Processando resposta do ViaCEP
    if (viaCepResponse.status === 'fulfilled' && viaCepResponse.value.ok) {
      viaCepData = await viaCepResponse.value.json();
      if (!viaCepData.erro) {
        mainSource = 'viacep';
      }
    }

    // Processando resposta do AwesomeAPI
    if (awesomeApiResponse.status === 'fulfilled' && awesomeApiResponse.value.ok) {
      awesomeApiData = await awesomeApiResponse.value.json();
      if (!mainSource) {
        mainSource = 'awesomeapi';
      }
    }

    // Se nenhuma API retornou dados válidos
    if (!mainSource) {
      throw new Error('CEP não encontrado em nenhuma das bases de dados.');
    }

    // Combinando os dados das duas APIs, priorizando a API principal mas complementando com dados da outra
    if (mainSource === 'viacep' && viaCepData) {
      return {
        cep: viaCepData.cep,
        logradouro: viaCepData.logradouro || '',
        bairro: viaCepData.bairro || '',
        cidade: viaCepData.localidade,
        estado: viaCepData.uf,
        complemento: viaCepData.complemento || undefined,
        ddd: viaCepData.ddd,
        ibge: viaCepData.ibge,
        ...(awesomeApiData && {
          tipo: awesomeApiData.address_type,
          latitude: awesomeApiData.lat,
          longitude: awesomeApiData.lng
        })
      };
    } else if (mainSource === 'awesomeapi' && awesomeApiData) {
      return {
        cep: awesomeApiData.cep,
        logradouro: awesomeApiData.address,
        bairro: awesomeApiData.district,
        cidade: awesomeApiData.city,
        estado: awesomeApiData.state,
        tipo: awesomeApiData.address_type,
        latitude: awesomeApiData.lat,
        longitude: awesomeApiData.lng,
        ddd: awesomeApiData.ddd,
        ibge: awesomeApiData.city_ibge
      };
    }

    throw new Error('Erro inesperado ao processar os dados do CEP.');
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Erro ao buscar o CEP. Verifique se o CEP é válido e tente novamente.');
  }
}