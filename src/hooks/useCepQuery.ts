import { useQuery } from '@tanstack/react-query';
import { buscarCepComFallback } from '../services/cepApis';
import { Endereco } from '../types/endereco';

export const useCepQuery = (cep: string) => {
  const cleanCep = cep.replace(/\D/g, '');
  
  return useQuery<Endereco, Error>({
    queryKey: ['cep', cleanCep],
    queryFn: () => buscarCepComFallback(cleanCep),
    enabled: cleanCep.length === 8,
    staleTime: 10 * 60 * 1000, // 10 minutos
    gcTime: 15 * 60 * 1000, // 15 minutos (anteriormente cacheTime)
    retry: false, // Não retry pois já temos fallback interno
    refetchOnWindowFocus: false,
  });
};