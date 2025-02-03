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
    const [viaCepResponse, awesomeApiResponse] = await Promise.allSettled([
      fetch(`https://viacep.com.br/ws/${cleanCep}/json/`),
      fetch(`https://cep.awesomeapi.com.br/json/${cleanCep}`)
    ]);

    let viaCepData: ViaCEPResponse | null = null;
    let awesomeApiData: AwesomeAPIResponse | null = null;
    let mainSource: 'viacep' | 'awesomeapi' | null = null;

    if (viaCepResponse.status === 'fulfilled' && viaCepResponse.value.ok) {
      viaCepData = await viaCepResponse.value.json();
      if (!viaCepData.erro) {
        mainSource = 'viacep';
      }
    }

    if (awesomeApiResponse.status === 'fulfilled' && awesomeApiResponse.value.ok) {
      awesomeApiData = await awesomeApiResponse.value.json();
      if (!mainSource) {
        mainSource = 'awesomeapi';
      }
    }

    if (!mainSource) {
      throw new Error('CEP não encontrado em nenhuma das bases de dados.');
    }

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

export async function processBatchCeps(ceps: string[]) {
  const results = await Promise.all(
    ceps.map(async (cep) => {
      try {
        const data = await fetchAddressData(cep);
        return {
          cep,
          status: 'Encontrado',
          endereco: `${data.logradouro}, ${data.bairro}, ${data.cidade} - ${data.estado}`
        };
      } catch (error) {
        return {
          cep,
          status: 'Não encontrado',
          endereco: undefined
        };
      }
    })
  );

  return results;
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
      throw new Error('Endereço não encontrado');
    }

    const data: ViaCEPResponse[] = await response.json();
    
    return data.map(item => ({
      endereco: `${item.logradouro}, ${item.bairro}, ${item.localidade} - ${item.uf}`,
      cep: item.cep,
      status: 'Encontrado'
    }));
  } catch (error) {
    return [{
      endereco: `${address.rua}, ${address.bairro}, ${ address.cidade} - ${address.estado}`,
      cep: 'Não encontrado',
      status: 'Não encontrado'
    }];
  }
}