import { useState } from 'react';
import { fetchAddressDataFromAllAPIs } from '../services/cep';

interface AddressData {
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

export function useCepLookup() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addressDataByApi, setAddressDataByApi] = useState<Record<string, AddressData> | null>(null);

  const lookupCep = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    
    if (cleanCep.length !== 8) {
      setError('CEP inválido. Digite 8 números.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const results = await fetchAddressDataFromAllAPIs(cep);
      setAddressDataByApi(results);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro na busca de endereços');
      setAddressDataByApi(null);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    addressDataByApi,
    lookupCep
  };
}