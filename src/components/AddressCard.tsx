import React from 'react';
import { MapPin, Navigation, Phone, Building, Hash, AlertCircle } from 'lucide-react';

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

interface AddressCardProps {
  data: AddressData;
  apiName: string;
}

export function AddressCard({ data, apiName }: AddressCardProps) {
  if (!data) return null;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 w-full animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MapPin className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-800">Resultado {apiName}</h2>
        </div>
      </div>
      
      <div className="space-y-3">
        {data.erro ? (
          <div className="flex items-start gap-2 text-red-600">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <p className="font-medium">{data.erro}</p>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-2">
              <Hash className="w-4 h-4 text-blue-600 mt-1 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-500">CEP</p>
                <p className="font-medium">{data.cep}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              <Building className="w-4 h-4 text-blue-600 mt-1 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-500">Endereço</p>
                <p className="font-medium">{data.logradouro}</p>
                {data.complemento && (
                  <p className="text-sm text-gray-600">{data.complemento}</p>
                )}
                {data.tipo && (
                  <p className="text-sm text-blue-600">Tipo: {data.tipo}</p>
                )}
              </div>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">Bairro</p>
              <p className="font-medium">{data.bairro}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">Cidade/Estado</p>
              <p className="font-medium">{data.cidade} - {data.estado}</p>
              {data.ibge && (
                <p className="text-sm text-gray-600">Código IBGE: {data.ibge}</p>
              )}
            </div>

            {data.ddd && (
              <div className="flex items-center gap-2 text-gray-600">
                <Phone className="w-4 h-4" />
                <p className="text-sm">DDD: {data.ddd}</p>
              </div>
            )}
            
            {(data.latitude && data.longitude) && (
              <div className="pt-2 border-t">
                <div className="flex items-center gap-2 text-blue-600">
                  <Navigation className="w-5 h-5" />
                  <div>
                    <p className="text-sm">Latitude: {data.latitude}</p>
                    <p className="text-sm">Longitude: {data.longitude}</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}