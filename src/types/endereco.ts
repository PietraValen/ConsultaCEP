export interface Endereco {
  cep: string;
  rua: string;
  bairro: string;
  cidade: string;
  estado: string;
  origem: string;
}

export interface APIResponse {
  success: boolean;
  data?: Endereco;
  error?: string;
  apiName: string;
}