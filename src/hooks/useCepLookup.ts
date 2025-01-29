import { useState } from 'react';
import { fetchAddressData } from '../services/cep';

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
}

export function useCepLookup() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addressData, setAddressData] = useState<AddressData | null>(null);

  const lookupCep = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    
    if (cleanCep.length !== 8) {
      setError('CEP inválido. Digite 8 números.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await fetchAddressData(cep);
      setAddressData(data);
    } catch (error) {
      setError((error as Error).message);
      setAddressData(null);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    addressData,
    lookupCep
  };
}