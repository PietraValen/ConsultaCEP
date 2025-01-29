# 🔍 Consulta CEP - Sistema Avançado de Busca de Endereços

<div align="center">

![Banner do Projeto](file:///C:/Users/pieva/Downloads/DALL%C2%B7E%202025-01-28%2023.25.42%20-%20A%20sleek%20and%20modern%20banner%20for%20a%20web%20application%20called%20'Consulta%20CEP',%20focused%20on%20searching%20Brazilian%20postal%20codes%20(CEP).%20The%20banner%20should%20feature%20a%20.webp)

[![React](https://img.shields.io/badge/React-18.3.1-61DAFB?logo=react&logoColor=white)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5.3-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.1-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-5.4.2-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)

</div>

## 📑 Índice

- [Sobre o Projeto](#-sobre-o-projeto)
- [Funcionalidades](#-funcionalidades)
- [Tecnologias Utilizadas](#-tecnologias-utilizadas)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Instalação e Uso](#-instalação-e-uso)
- [APIs Utilizadas](#-apis-utilizadas)
- [Componentes](#-componentes)
- [Hooks Personalizados](#-hooks-personalizados)
- [Serviços](#-serviços)
- [Tratamento de Erros](#-tratamento-de-erros)
- [Boas Práticas](#-boas-práticas)
- [Performance](#-performance)
- [Acessibilidade](#-acessibilidade)
- [Contribuição](#-contribuição)
- [Licença](#-licença)

## 🎯 Sobre o Projeto

O Consulta CEP é um sistema moderno e eficiente para busca de endereços através do CEP (Código de Endereçamento Postal) brasileiro. Desenvolvido com as mais recentes tecnologias web, o projeto oferece uma interface intuitiva e responsiva, combinando dados de múltiplas APIs para fornecer informações precisas e completas sobre endereços.

### 🌟 Principais Diferenciais

- **Interface Moderna e Intuitiva**: Design clean e profissional com Tailwind CSS
- **Dupla Verificação**: Utiliza duas APIs diferentes para maior confiabilidade
- **Informações Completas**: Além do endereço básico, fornece dados geográficos e administrativos
- **Alta Performance**: Requisições paralelas e otimização de carregamento
- **Totalmente Responsivo**: Adaptável a qualquer tamanho de tela
- **Acessível**: Seguindo as melhores práticas de acessibilidade web

## 🎨 Funcionalidades

### 1. Busca de CEP
- Validação em tempo real do formato do CEP
- Feedback visual durante a busca
- Tratamento de erros com mensagens amigáveis
- Suporte a diferentes formatos de entrada (com ou sem hífen)

### 2. Exibição de Dados
- Endereço completo (logradouro, bairro, cidade, estado)
- Informações complementares quando disponíveis
- Coordenadas geográficas (latitude e longitude)
- Dados administrativos (DDD, código IBGE)
- Tipo de endereço (residencial, comercial, etc.)

### 3. Interface Responsiva
- Layout adaptativo para desktop, tablet e mobile
- Animações suaves de transição
- Feedback visual de carregamento
- Ícones intuitivos para cada tipo de informação

## 🛠 Tecnologias Utilizadas

### Core
- **React 18.3.1**
  - Hooks
  - Context API
  - Error Boundaries
- **TypeScript 5.5.3**
  - Tipagem estrita
  - Interfaces bem definidas
  - Type safety

### Estilização
- **Tailwind CSS 3.4.1**
  - Utility-first CSS
  - Design system consistente
  - Responsividade nativa
  - Dark mode support (preparado para implementação)

### Build e Desenvolvimento
- **Vite 5.4.2**
  - Hot Module Replacement
  - Build otimizado
  - Desenvolvimento rápido

### UI/UX
- **Lucide React**
  - Ícones modernos e consistentes
  - Baixo impacto no bundle size
  - Customização flexível

## 📁 Estrutura do Projeto

```
src/
├── components/           # Componentes React reutilizáveis
│   ├── AddressCard/     # Cartão de exibição do endereço
│   └── ...
├── hooks/               # Hooks personalizados
│   ├── useCepLookup.ts  # Hook principal de busca
│   └── ...
├── services/            # Serviços e integrações
│   ├── cep.ts          # Serviço de busca de CEP
│   └── ...
├── types/               # Definições de tipos TypeScript
├── utils/               # Funções utilitárias
├── App.tsx             # Componente principal
└── main.tsx            # Ponto de entrada da aplicação
```

## 🚀 Instalação e Uso

1. **Clone o repositório**
   ```bash
   git clone https://github.com/seu-usuario/consulta-cep.git
   cd consulta-cep
   ```

2. **Instale as dependências**
   ```bash
   npm install
   ```

3. **Inicie o servidor de desenvolvimento**
   ```bash
   npm run dev
   ```

4. **Build para produção**
   ```bash
   npm run build
   ```

## 🔌 APIs Utilizadas

### ViaCEP
- **URL Base**: `https://viacep.com.br/ws/`
- **Formato**: JSON
- **Dados Fornecidos**:
  - Logradouro
  - Bairro
  - Cidade
  - Estado
  - CEP
  - Complemento
  - Código IBGE
  - DDD

### AwesomeAPI
- **URL Base**: `https://cep.awesomeapi.com.br/json/`
- **Formato**: JSON
- **Dados Fornecidos**:
  - Endereço
  - Cidade
  - Estado
  - Latitude
  - Longitude
  - Tipo de endereço
  - DDD

## 🧩 Componentes

### AddressCard
```typescript
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
```

O componente `AddressCard` é responsável por exibir as informações do endereço de forma organizada e visualmente agradável.

#### Características:
- Layout em grid para melhor organização
- Ícones informativos para cada campo
- Exibição condicional de dados opcionais
- Animações suaves na entrada de dados
- Totalmente responsivo

## 🎣 Hooks Personalizados

### useCepLookup
```typescript
const { loading, error, addressData, lookupCep } = useCepLookup();
```

Hook principal para gerenciamento da busca de CEP.

#### Funcionalidades:
- Gerenciamento de estado de loading
- Tratamento de erros
- Cache de resultados
- Validação de entrada
- Tipagem forte com TypeScript

## 🔧 Serviços

### CEP Service
O serviço de CEP é responsável por:
- Integração com múltiplas APIs
- Normalização de dados
- Tratamento de erros
- Retry em caso de falha
- Timeout configurável

## ⚠️ Tratamento de Erros

O sistema implementa um tratamento de erros robusto:

1. **Validação de Entrada**
   - Formato do CEP
   - Caracteres permitidos
   - Comprimento correto

2. **Erros de API**
   - Timeout
   - CEP não encontrado
   - Erro de servidor
   - Problemas de conexão

3. **Feedback ao Usuário**
   - Mensagens claras e amigáveis
   - Sugestões de correção
   - Status visual do erro

## 📚 Boas Práticas

### 1. Código
- Clean Code
- SOLID Principles
- DRY (Don't Repeat Yourself)
- Componentização eficiente
- Comentários relevantes

### 2. Performance
- Code Splitting
- Lazy Loading
- Memoização
- Debounce em inputs
- Otimização de re-renders

### 3. Segurança
- Sanitização de inputs
- Proteção contra XSS
- Rate limiting
- Validação de dados

## 🚀 Performance

### Otimizações Implementadas

1. **Requisições**
   - Paralelização de chamadas API
   - Cache de resultados
   - Cancelamento de requisições obsoletas

2. **Renderização**
   - React.memo para componentes pesados
   - useMemo para cálculos complexos
   - useCallback para funções de callback

3. **Bundle**
   - Tree shaking
   - Code splitting
   - Minificação eficiente

## ♿ Acessibilidade

### Implementações WCAG

1. **Navegação**
   - Foco visível
   - Ordem de tabulação lógica
   - Atalhos de teclado

2. **Semântica**
   - HTML semântico
   - ARIA labels
   - Roles apropriados

3. **Visual**
   - Contraste adequado
   - Tamanho de fonte ajustável
   - Espaçamento adequado

## 🤝 Contribuição

1. Faça um Fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
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
