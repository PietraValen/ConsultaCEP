# 🔍 Consulta CEP - Sistema Avançado de Busca de Endereços

<div align="center">

![Banner do Projeto](https://images.unsplash.com/photo-1579547944212-c4f4961a8dd8?auto=format&fit=crop&w=800&q=80)

[![React](https://img.shields.io/badge/React-18.3.1-61DAFB?logo=react&logoColor=white)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5.3-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.1-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-5.4.2-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![XLSX](https://img.shields.io/badge/XLSX-0.18.5-217346?logo=microsoft-excel&logoColor=white)](https://www.npmjs.com/package/xlsx)

</div>

## 📑 Índice

- [Sobre o Projeto](#-sobre-o-projeto)
- [Funcionalidades](#-funcionalidades)
- [Tecnologias](#-tecnologias)
- [Instalação](#-instalação)
- [Como Usar](#-como-usar)
- [APIs](#-apis)
- [Estrutura](#-estrutura)
- [Contribuição](#-contribuição)
- [Licença](#-licença)

## 🎯 Sobre o Projeto

O Consulta CEP é um sistema moderno e eficiente para busca de endereços brasileiros, oferecendo três modalidades principais:

1. **Busca por CEP**: Consulta direta de endereços através do CEP
2. **Busca por Endereço**: Localização de CEPs através de dados do endereço
3. **Consulta em Lote**: Processamento de múltiplos CEPs via arquivo

### 🌟 Diferenciais

- **Interface Moderna**: Design clean e responsivo com Tailwind CSS
- **Múltiplas APIs**: Integração com ViaCEP e AwesomeAPI para maior confiabilidade
- **Processamento em Lote**: Suporte a arquivos Excel e CSV
- **Validação Robusta**: Tratamento avançado de erros e dados inválidos
- **Exportação de Dados**: Download dos resultados em formato Excel

## 🎨 Funcionalidades

### 1. Consulta Individual de CEP
- Validação em tempo real
- Autoformatação do input
- Exibição detalhada do endereço
- Informações complementares (DDD, IBGE, coordenadas)

### 2. Busca por Endereço
- Campos inteligentes com autocompletar
- Validação instantânea de UFs
- Busca flexível (campos opcionais e obrigatórios)
- Resultados em formato tabular

### 3. Consulta em Lote
- Upload de arquivos Excel/CSV
- Processamento paralelo de múltiplos CEPs
- Validação de estrutura do arquivo
- Download dos resultados consolidados

## 🛠 Tecnologias

### Core
- **React 18.3.1**: Framework principal
- **TypeScript 5.5.3**: Tipagem estática
- **Vite 5.4.2**: Build tool e dev server

### UI/UX
- **Tailwind CSS 3.4.1**: Estilização
- **Lucide React**: Ícones vetoriais
- **XLSX**: Processamento de planilhas

### APIs
- **ViaCEP**: Base principal de endereços
- **AwesomeAPI**: Dados complementares

## 🚀 Instalação

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/consulta-cep.git

# Entre no diretório
cd consulta-cep

# Instale as dependências
npm install

# Inicie o servidor de desenvolvimento
npm run dev
```

## 💡 Como Usar

### Consulta por CEP
1. Digite o CEP (formato: 12345-678)
2. Aguarde o processamento automático
3. Visualize os dados do endereço

### Busca por Endereço
1. Preencha os campos necessários:
   - Cidade (obrigatório)
   - Estado (obrigatório)
   - Rua e Bairro (opcionais)
2. Clique em "Buscar Endereços"
3. Visualize os resultados na tabela

### Consulta em Lote
1. Prepare seu arquivo Excel/CSV com as colunas:
   - CEP
   - ou: rua, bairro, cidade, estado
2. Faça upload do arquivo
3. Aguarde o processamento
4. Baixe os resultados

## 🔌 APIs

### ViaCEP
- **Base**: `https://viacep.com.br/ws/`
- **Formato**: JSON
- **Dados**: Endereço completo, DDD, IBGE

### AwesomeAPI
- **Base**: `https://cep.awesomeapi.com.br/json/`
- **Formato**: JSON
- **Dados**: Coordenadas, tipo de endereço

## 📁 Estrutura

```
src/
├── components/           # Componentes React
│   ├── AddressCard/     # Exibição de endereço
│   ├── BatchLookup/     # Consulta em lote
│   └── AddressSearch/   # Busca por endereço
├── hooks/               # Hooks personalizados
├── services/           # Serviços e APIs
├── types/              # Definições TypeScript
└── utils/              # Funções utilitárias
```

## 🤝 Contribuição

1. Fork o projeto
2. Crie sua branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

<div align="center">

**Desenvolvido com 💙 por Pietra Valentina Ferreira Himmelsbach**

[⬆ Voltar ao topo](#-consulta-cep---sistema-avançado-de-busca-de-endereços)

</div>