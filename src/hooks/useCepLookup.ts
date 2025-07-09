import { useState } from 'react';
import { buscarCepComFallback } from '../services/cepApis';

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
      const endereco = await buscarCepComFallback(cep);
      
      // Converter para o formato esperado pelos componentes existentes
      const addressData: AddressData = {
        cep: endereco.cep,
        logradouro: endereco.rua,
        bairro: endereco.bairro,
        cidade: endereco.cidade,
        estado: endereco.estado,
        fonte: endereco.origem
      };

      // Simular múltiplas APIs para manter compatibilidade visual
      setAddressDataByApi({
        [endereco.origem]: addressData,
        'Sistema Unificado': {
          ...addressData,
          fonte: 'Sistema com Fallback Automático'
        }
      });
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