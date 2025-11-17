# OrganizeFinance - Sistema de Organização Financeira

## Visão Geral
Sistema completo de organização financeira pessoal com autenticação de usuários, dashboard interativo e gestão de metas. Desenvolvido com Node.js, Express, Prisma ORM e PostgreSQL. Configurado para rodar tanto localmente (Windows com SQLite) quanto no Replit (PostgreSQL).

## Tecnologias
- **Backend:**
  - Node.js
  - Express (servidor web)
  - Prisma ORM (gerenciamento de banco de dados)
  - SQLite (banco de dados - desenvolvimento local no Windows)
  - PostgreSQL (banco de dados - usado no Replit/produção)
  - bcrypt (hash de senhas)
  - express-session + connect-pg-simple (gerenciamento de sessões)

- **Frontend:**
  - HTML/CSS/JavaScript puro
  - Fetch API para comunicação com backend

## Funcionalidades

### Autenticação
- ✅ Registro de usuários com validação
- ✅ Upload de foto de perfil (até 2MB)
- ✅ Login/Logout com sessões persistentes
- ✅ Hash seguro de senhas (bcrypt)
- ✅ Proteção de rotas autenticadas
- ✅ Sessões armazenadas no PostgreSQL

### Dashboard
- ✅ **Sidebar Reutilizável** (componente único usado em todas as páginas):
  - Navegação com 6 seções
  - Destaque automático da página ativa
  - Perfil do usuário no rodapé (nome e foto)
  - Botão de logout integrado
- ✅ **Perfil do Usuário**:
  - Exibição de nome e foto em todas as páginas
  - Foto de perfil ou iniciais do nome como fallback
  - Card de perfil na Visão Geral
  - Mini perfil na sidebar (todas as páginas)
- ✅ **Visão Geral**: Dashboard principal com:
  - Card de perfil com foto e nome do usuário
  - **Saldo real** carregado dinamicamente da API
  - **Toggle de visibilidade** do saldo (👁️ / 👁️‍🗨️)
  - **Gráfico dinâmico** de receitas e despesas (últimos 6 meses)
  - **2 últimas metas adicionadas** (independente do status)
  - Estatísticas e variação percentual
  - Seção de educação financeira
- ✅ **Transações** (CRUD Completo - Etapa 1):
  - Adicionar nova transação (despesa ou receita)
  - Listar todas as transações com ícones por categoria
  - Editar transações existentes
  - Excluir transações
  - Filtrar por tipo (Todas, Despesas, Receitas)
  - Validação rigorosa de dados
  - Modal responsivo para adicionar/editar
  - Feedback visual com mensagens toast
- ✅ **Metas** (CRUD Completo - Etapa 2):
  - Criar meta financeira com valor alvo e prazo
  - Listar metas com progresso visual (barra + percentual)
  - Editar metas existentes
  - Excluir metas
  - Atualizar progresso (valor economizado)
  - Filtrar por status (Ativas, Concluídas, Canceladas)
  - Auto-completar meta ao atingir valor alvo
  - Badges de status coloridos (ativa, concluída, cancelada, expirada)
  - Alertas de prazo próximo (≤7 dias)
  - 9 categorias pré-definidas com emojis
  - Modal responsivo para adicionar/editar
  - Modal de atualização de progresso
  - Feedback visual com toast
- ⏳ **Relatórios**: Análises e gráficos detalhados
- ⏳ **Educação**: Dicas e conteúdo educativo sobre finanças
- ⏳ **Recompensas**: Sistema de gamificação com histórico

## Estrutura do Projeto
```
.
├── index.js              # Servidor Express com rotas de autenticação, transações e metas
├── prisma/
│   ├── schema.prisma     # Schema do banco de dados (User, Transaction, Goal, session)
│   └── migrations/       # Migrations do Prisma
├── public/               # Arquivos frontend
│   ├── login.html        # Página de login (página inicial)
│   ├── register.html     # Página de registro com upload de foto
│   ├── dashboard.html    # Visão Geral (página principal)
│   ├── transacoes.html   # Página de transações com modal CRUD
│   ├── metas.html        # Página de metas
│   ├── relatorios.html   # Página de relatórios
│   ├── educacao.html     # Página de educação financeira
│   ├── recompensas.html  # Página de recompensas
│   ├── style.css         # Estilos globais
│   ├── auth.css          # Estilos de autenticação e upload de foto
│   ├── dashboard.css     # Estilos do dashboard com sidebar e modal
│   ├── auth.js           # Script de login/registro com preview de foto
│   ├── sidebar.js        # Componente reutilizável da sidebar
│   ├── dashboard.js      # Script do dashboard com carregamento de perfil
│   ├── transacoes.js     # Script de gerenciamento de transações (CRUD)
│   └── metas.js          # Script de gerenciamento de metas (CRUD)
└── package.json          # Dependências do projeto
```

## Como Rodar

### No Replit
1. O servidor inicia automaticamente
2. Banco de dados PostgreSQL já está configurado
3. Acesse através do painel de preview
4. A tela de login será exibida automaticamente
5. Para criar uma conta, clique em "Registre-se" na tela de login

### No Windows (Local)

#### Requisitos
- Node.js instalado (https://nodejs.org)
- **Nada mais!** O SQLite não precisa de instalação separada

#### Passos

1. **Clonar/Baixar o projeto**
   ```bash
   # Baixe os arquivos do projeto para uma pasta local
   ```

2. **Instalar dependências**
   ```bash
   npm install
   ```

3. **Configurar variáveis de ambiente**
   
   Crie um arquivo `.env` na raiz do projeto (copie do `.env.example`):
   ```env
   DATABASE_URL="file:./dev.db"
   SESSION_SECRET="7K9mP2nQ5rT8wX3yB6cF1gH4jL0vN9sM2pR5tW8xA1bD4eG7hK0mN3qS6uV9yC2f"
   ```
   
   **Importante:** 
   - Para SQLite, use: `DATABASE_URL="file:./dev.db"`
   - Você pode trocar o SESSION_SECRET por outro valor aleatório se quiser

4. **Executar migrations do Prisma**
   ```bash
   npx prisma migrate dev --name init
   ```
   
   Isso criará o arquivo `dev.db` (banco SQLite) com as tabelas `User`, `Transaction`, `Goal` e `session`.

5. **Iniciar o servidor**
   ```bash
   npm run dev
   ```
   
   Ou:
   ```bash
   npm start
   ```

6. **Acessar o sistema**
   
   Abra o navegador em: http://localhost:3000
   
   A tela de login aparecerá automaticamente!

## API Endpoints

### Autenticação

- **POST /api/auth/register**
  - Body: `{ email, name, password }`
  - Registra novo usuário e inicia sessão
  - Retorna dados do usuário criado

- **POST /api/auth/login**
  - Body: `{ email, password }`
  - Autentica usuário e inicia sessão
  - Retorna dados do usuário

- **POST /api/auth/logout**
  - Encerra a sessão atual
  - Não requer body

- **GET /api/auth/check**
  - Verifica se usuário está autenticado
  - Retorna status de autenticação

- **GET /api/auth/me** (protegida)
  - Retorna dados do usuário atual (id, email, name, profilePhoto)
  - Requer autenticação

### Transações (CRUD Completo)

- **POST /api/transactions** (protegida)
  - Body: `{ type, category, description, amount, date }`
  - Cria uma nova transação (despesa ou receita)
  - Validação rigorosa de todos os campos
  - Requer autenticação

- **GET /api/transactions** (protegida)
  - Query params opcionais: `type` (expense/income), `startDate`, `endDate`
  - Lista todas as transações do usuário autenticado
  - Ordenadas por data (mais recente primeiro)
  - Requer autenticação

- **GET /api/transactions/:id** (protegida)
  - Retorna uma transação específica
  - Valida ownership (usuário só acessa suas próprias transações)
  - Requer autenticação

- **PUT /api/transactions/:id** (protegida)
  - Body: `{ type?, category?, description?, amount?, date? }`
  - Atualiza uma transação existente
  - Aceita atualização parcial (campos opcionais)
  - Valida ownership
  - Requer autenticação

- **DELETE /api/transactions/:id** (protegida)
  - Remove uma transação
  - Valida ownership
  - Requer autenticação

- **GET /api/transactions/summary/stats** (protegida)
  - Retorna resumo financeiro: receitas totais, despesas totais, saldo
  - Requer autenticação

### Metas (CRUD Completo)

- **POST /api/goals** (protegida)
  - Body: `{ name, targetAmount, currentAmount?, deadline, category?, description? }`
  - Cria uma nova meta financeira
  - Validação rigorosa: prazo não pode estar no passado, valor alvo positivo
  - Auto-completa meta se currentAmount >= targetAmount
  - Requer autenticação

- **GET /api/goals** (protegida)
  - Query params opcionais: `status` (active/completed/cancelled)
  - Lista todas as metas do usuário autenticado
  - Ordenadas por prazo (mais próximo primeiro)
  - Calcula progresso percentual automaticamente
  - Requer autenticação

- **GET /api/goals/:id** (protegida)
  - Retorna uma meta específica com progresso calculado
  - Valida ownership (usuário só acessa suas próprias metas)
  - Requer autenticação

- **PUT /api/goals/:id** (protegida)
  - Body: `{ name?, targetAmount?, currentAmount?, deadline?, category?, description?, status? }`
  - Atualiza uma meta existente
  - Aceita atualização parcial (campos opcionais)
  - Auto-completa/reativa meta baseado em currentAmount vs targetAmount
  - Valida ownership e prazo
  - Requer autenticação

- **DELETE /api/goals/:id** (protegida)
  - Remove uma meta
  - Valida ownership
  - Requer autenticação

- **PUT /api/goals/:id/amount** (protegida)
  - Body: `{ amount }`
  - Atualiza apenas o valor atual da meta
  - Auto-completa meta quando atinge/ultrapassa o alvo
  - Retorna mensagem especial quando meta é concluída
  - Requer autenticação

- **GET /api/goals/latest/recent** (protegida)
  - Retorna as 2 últimas metas adicionadas (ordenadas por createdAt DESC)
  - Não filtra por status (retorna todas independente de ativas/concluídas/canceladas)
  - Usado pela dashboard para exibir resumo de metas
  - Calcula progresso percentual automaticamente
  - Requer autenticação

- **GET /api/transactions/chart/monthly** (protegida)
  - Retorna dados agregados de receitas e despesas dos últimos 6 meses
  - Agrupa transações por mês (income e expenses)
  - Labels de meses em português (abreviados)
  - Usado para renderizar o gráfico da dashboard
  - Requer autenticação

### Outras

- **GET /api/hello**
  - Endpoint de teste
  - Retorna mensagem e timestamp

## Segurança

- Senhas são criptografadas com bcrypt (10 rounds)
- Sessões armazenadas no PostgreSQL (persistem entre restarts)
- Cookies HTTP-only para prevenir XSS
- Validação de email único
- Validação de senha mínima (6 caracteres)
- Middleware de autenticação para rotas protegidas

## Variáveis de Ambiente

| Variável | Descrição | Valor Local (Windows) | Valor Replit |
|----------|-----------|----------------------|--------------|
| `DATABASE_URL` | String de conexão do banco | `file:./dev.db` (SQLite) | PostgreSQL URL (automático) |
| `SESSION_SECRET` | Chave secreta para sessões | Qualquer string aleatória | Automático no Replit |
| `PORT` | Porta do servidor | 3000 (padrão) | 5000 (padrão) |

**Nota:** Se `SESSION_SECRET` não estiver configurado, será gerado automaticamente (mas causará logout em restarts)

## Comandos Úteis

```bash
# Instalar dependências
npm install

# Rodar em desenvolvimento
npm run dev

# Rodar em produção
npm start

# Criar migration do Prisma
npx prisma migrate dev --name nome_da_migration

# Gerar Prisma Client
npx prisma generate

# Abrir Prisma Studio (visualizar banco de dados)
npx prisma studio
```

## Próximos Passos Sugeridos

- [ ] Adicionar recuperação de senha
- [ ] Implementar "lembrar-me"
- [ ] Adicionar autenticação por OAuth (Google, GitHub)
- [ ] Implementar rate limiting
- [ ] Adicionar validação de email
- [ ] Criar testes automatizados
- [ ] Adicionar HTTPS em produção

## Arquitetura de Componentes

### Sidebar Reutilizável
O sistema utiliza um componente JavaScript reutilizável (`sidebar.js`) que:
- Elimina duplicação de código entre as 6 páginas do dashboard
- Renderiza dinamicamente a navegação lateral
- Destaca automaticamente a página ativa
- Carrega informações do usuário (nome e foto) via API
- Mantém estado consistente em todas as páginas

### Carregamento de Perfil
O `dashboard.js` carrega dados do usuário via `/api/auth/me` e atualiza:
- Card de perfil na Visão Geral (avatar grande + nome)
- Mini perfil na sidebar (avatar pequeno + nome + botão sair)
- Fallback para iniciais do nome quando não há foto

### Dashboard Dinâmico
O `dashboard.js` carrega dados em tempo real:
- **Saldo financeiro**: Busca via `/api/transactions/summary/stats`
- **Toggle de visibilidade**: Alterna entre valor real e "••••••"
- **Gráfico de receitas e despesas**: 
  - Busca via `/api/transactions/chart/monthly`
  - Renderiza SVG com 2 linhas (receitas azul, despesas vermelho)
  - Exibe últimos 6 meses com labels dinâmicos
  - Mostra saldo do mês atual e variação percentual
  - Normalização automática de valores para visualização
- **Últimas 2 metas**: Busca via `/api/goals/latest/recent` (ordenadas por data de criação)
- **Proteção XSS**: Escape de HTML em campos de usuário (`escapeHtml()`)
- **Compatibilidade**: Verifica se elementos existem antes de manipulá-los

## Última Atualização
15 de novembro de 2025 - **GRÁFICO DINÂMICO ADICIONADO**: Implementado gráfico de receitas e despesas dos últimos 6 meses com renderização SVG dinâmica, duas linhas coloridas (receitas/despesas), cálculo de variação percentual e exibição do saldo do mês atual
