/**
 * SERVIDOR BACKEND - ORGANIZEFI NANCE
 * 
 * Este é o servidor principal da aplicação
 * Responsável por:
 * - Servir arquivos estáticos (HTML, CSS, JS)
 * - Gerenciar autenticação de usuários
 * - Controlar sessões
 * - Conectar ao banco de dados (SQLite ou PostgreSQL)
 */

// Importação de dependências
const express = require('express'); // Framework web
const path = require('path'); // Manipulação de caminhos de arquivos
const bcrypt = require('bcrypt'); // Criptografia de senhas
const session = require('express-session'); // Gerenciamento de sessões
const { PrismaClient } = require('@prisma/client'); // ORM para banco de dados
const crypto = require('crypto'); // Geração de valores aleatórios

// Inicialização
const app = express(); // Cria aplicação Express
const prisma = new PrismaClient(); // Cria cliente do Prisma

// Configuração da porta (usa variável de ambiente ou 5000 como padrão)
const PORT = process.env.PORT || 5000;

// Configuração do segredo da sessão
// Se não houver variável de ambiente, gera um valor aleatório
const SESSION_SECRET = process.env.SESSION_SECRET || (() => {
  const randomSecret = crypto.randomBytes(32).toString('hex');
  console.warn('⚠️  SESSION_SECRET não configurado. Usando valor gerado automaticamente.');
  console.warn('   Para produção, defina SESSION_SECRET nas variáveis de ambiente.');
  return randomSecret;
})();

// Configuração de sessões (usa MemoryStore padrão para SQLite)
const sessionConfig = {
  secret: SESSION_SECRET, // Chave secreta para assinar cookies
  resave: false, // Não salva sessão se não foi modificada
  saveUninitialized: false, // Não cria sessão até que algo seja armazenado
  cookie: {
    secure: false, // true para HTTPS, false para HTTP local
    httpOnly: true, // Cookie acessível apenas via HTTP (não JavaScript)
    maxAge: 1000 * 60 * 60 * 24 // Expira em 24 horas
  }
}

// Middlewares (processadores de requisições)
app.use(express.static('public')); // Serve arquivos estáticos da pasta 'public'
app.use(express.json({ limit: '10mb' })); // Processa JSON (aceita até 10MB para fotos)
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Processa formulários
app.use(session(sessionConfig)); // Ativa sistema de sessões

/**
 * Middleware de autenticação
 * Verifica se o usuário está autenticado antes de permitir acesso
 */
function isAuthenticated(req, res, next) {
  if (req.session.userId) {
    return next(); // Se autenticado, continua para a próxima função
  }
  res.status(401).json({ error: 'Não autenticado' }); // Se não, retorna erro 401
}

/**
 * Helper: Valida se um valor é um ID inteiro válido
 * Rejeita strings como "123abc" que parseInt converteria para 123
 * @param {string} value - Valor a validar
 * @returns {number|null} - Número inteiro ou null se inválido
 */
function validateIntegerId(value) {
  // Verifica se é uma string contendo apenas dígitos
  if (!/^\d+$/.test(value)) {
    return null;
  }
  const num = parseInt(value, 10);
  return isNaN(num) ? null : num;
}

/**
 * Helper: Compara se uma data está no passado (apenas dia, sem hora)
 * @param {Date} date - Data a validar
 * @returns {boolean} - true se está no passado
 */
function isDateInPast(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);
  return compareDate < today;
}

/**
 * ROTA RAIZ /
 * Redireciona para dashboard se autenticado, senão para login
 */
app.get('/', (req, res) => {
  if (req.session.userId) {
    res.redirect('/dashboard.html'); // Usuário logado -> Dashboard
  } else {
    res.redirect('/login.html'); // Usuário não logado -> Login
  }
});

/**
 * ROTA DE REGISTRO
 * POST /api/auth/register
 * Cria uma nova conta de usuário
 */
app.post('/api/auth/register', async (req, res) => {
  try {
    // Extrai dados do corpo da requisição
    const { email, name, password, profilePhoto } = req.body;

    // Valida campos obrigatórios
    if (!email || !name || !password) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    // Valida tamanho mínimo da senha
    if (password.length < 6) {
      return res.status(400).json({ error: 'A senha deve ter no mínimo 6 caracteres' });
    }

    // Se foto foi enviada, valida formato e tamanho
    if (profilePhoto) {
      // Valida formato (deve ser data:image/...)
      if (!profilePhoto.startsWith('data:image/')) {
        return res.status(400).json({ error: 'Formato de imagem inválido' });
      }
      
      // Valida tamanho (máximo 2MB)
      const base64Size = profilePhoto.length * 0.75;
      if (base64Size > 2 * 1024 * 1024) {
        return res.status(400).json({ error: 'Imagem muito grande. Máximo 2MB' });
      }
    }

    // Verifica se email já está cadastrado
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    // Criptografa a senha (10 rounds de hash)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Cria o usuário no banco de dados
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        profilePhoto: profilePhoto || null // Salva foto ou null
      }
    });

    // Cria sessão para o novo usuário (login automático)
    req.session.userId = user.id;
    req.session.userName = user.name;

    // Retorna sucesso
    res.json({
      message: 'Usuário registrado com sucesso!',
      user: {
        id: user.id,
        email: user.email,
        name: user.name
        // Nota: não retorna senha nem foto por segurança
      }
    });
  } catch (error) {
    console.error('Erro ao registrar:', error);
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
});

/**
 * ROTA DE LOGIN
 * POST /api/auth/login
 * Autentica um usuário existente
 */
app.post('/api/auth/login', async (req, res) => {
  try {
    // Extrai credenciais
    const { email, password } = req.body;

    // Valida campos obrigatórios
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    // Busca usuário no banco
    const user = await prisma.user.findUnique({
      where: { email }
    });

    // Se usuário não existe
    if (!user) {
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }

    // Compara senha fornecida com hash armazenado
    const validPassword = await bcrypt.compare(password, user.password);

    // Se senha incorreta
    if (!validPassword) {
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }

    // Cria sessão
    req.session.userId = user.id;
    req.session.userName = user.name;

    // Retorna sucesso
    res.json({
      message: 'Login realizado com sucesso!',
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

/**
 * ROTA DE LOGOUT
 * POST /api/auth/logout
 * Encerra a sessão do usuário
 */
app.post('/api/auth/logout', (req, res) => {
  // Destroi a sessão
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao fazer logout' });
    }
    res.json({ message: 'Logout realizado com sucesso!' });
  });
});

/**
 * ROTA DE DADOS DO USUÁRIO
 * GET /api/auth/me
 * Retorna informações do usuário autenticado
 * Protegida por middleware isAuthenticated
 */
app.get('/api/auth/me', isAuthenticated, async (req, res) => {
  try {
    // Busca usuário pelo ID da sessão
    const user = await prisma.user.findUnique({
      where: { id: req.session.userId },
      select: {
        id: true,
        email: true,
        name: true,
        profilePhoto: true, // Retorna foto para exibir no frontend
        createdAt: true
        // Nota: password não é incluído por segurança
      }
    });

    // Se usuário não encontrado (não deveria acontecer)
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Retorna dados do usuário
    res.json({ user });
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({ error: 'Erro ao buscar dados do usuário' });
  }
});

/**
 * ROTA DE VERIFICAÇÃO DE AUTENTICAÇÃO
 * GET /api/auth/check
 * Verifica se o usuário está autenticado
 */
app.get('/api/auth/check', (req, res) => {
  if (req.session.userId) {
    // Se há ID de usuário na sessão, está autenticado
    res.json({
      authenticated: true,
      userId: req.session.userId,
      userName: req.session.userName
    });
  } else {
    // Se não, não está autenticado
    res.json({ authenticated: false });
  }
});

/**
 * ROTA DE TESTE
 * GET /api/hello
 * Endpoint simples para verificar se a API está funcionando
 */
app.get('/api/hello', (req, res) => {
  res.json({
    mensagem: 'Olá! Sua API está funcionando!',
    timestamp: new Date().toISOString()
  });
});

// =============================================================================
// ROTAS DE TRANSAÇÕES (CRUD COMPLETO)
// =============================================================================

/**
 * CRIAR NOVA TRANSAÇÃO
 * POST /api/transactions
 * Adiciona uma nova transação (despesa ou receita)
 */
app.post('/api/transactions', isAuthenticated, async (req, res) => {
  try {
    const { type, category, description, amount, date } = req.body;

    // Validação dos campos obrigatórios
    if (!type || !category || !description || !amount || !date) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    // Valida tipo de transação
    if (type !== 'expense' && type !== 'income') {
      return res.status(400).json({ error: 'Tipo deve ser "expense" ou "income"' });
    }

    // Valida valor
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Valor deve ser um número positivo' });
    }

    // Valida data
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ error: 'Data inválida' });
    }

    // Cria a transação no banco
    const transaction = await prisma.transaction.create({
      data: {
        userId: req.session.userId,
        type,
        category,
        description,
        amount: parseFloat(amount),
        date: parsedDate
      }
    });

    res.status(201).json({
      message: 'Transação criada com sucesso!',
      transaction
    });
  } catch (error) {
    console.error('Erro ao criar transação:', error);
    res.status(500).json({ error: 'Erro ao criar transação' });
  }
});

/**
 * LISTAR TODAS AS TRANSAÇÕES DO USUÁRIO
 * GET /api/transactions
 * Retorna todas as transações do usuário autenticado
 * Aceita query params: type (expense/income), startDate, endDate
 */
app.get('/api/transactions', isAuthenticated, async (req, res) => {
  try {
    const { type, startDate, endDate } = req.query;

    // Monta filtros dinâmicos
    const filters = {
      userId: req.session.userId
    };

    // Filtro por tipo (despesa ou receita)
    if (type && (type === 'expense' || type === 'income')) {
      filters.type = type;
    }

    // Filtro por data
    if (startDate || endDate) {
      filters.date = {};
      if (startDate) filters.date.gte = new Date(startDate);
      if (endDate) filters.date.lte = new Date(endDate);
    }

    // Busca transações ordenadas por data (mais recente primeiro)
    const transactions = await prisma.transaction.findMany({
      where: filters,
      orderBy: {
        date: 'desc'
      }
    });

    res.json({ transactions });
  } catch (error) {
    console.error('Erro ao buscar transações:', error);
    res.status(500).json({ error: 'Erro ao buscar transações' });
  }
});

/**
 * BUSCAR UMA TRANSAÇÃO ESPECÍFICA
 * GET /api/transactions/:id
 * Retorna os detalhes de uma transação
 */
app.get('/api/transactions/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;

    // Valida se o ID é um número inteiro válido
    const transactionId = validateIntegerId(id);
    if (transactionId === null) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId }
    });

    // Se não encontrou ou não pertence ao usuário
    if (!transaction || transaction.userId !== req.session.userId) {
      return res.status(404).json({ error: 'Transação não encontrada' });
    }

    res.json({ transaction });
  } catch (error) {
    console.error('Erro ao buscar transação:', error);
    res.status(500).json({ error: 'Erro ao buscar transação' });
  }
});

/**
 * ATUALIZAR UMA TRANSAÇÃO
 * PUT /api/transactions/:id
 * Edita uma transação existente
 */
app.put('/api/transactions/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const { type, category, description, amount, date } = req.body;

    // Valida se o ID é um número inteiro válido
    const transactionId = validateIntegerId(id);
    if (transactionId === null) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    // Busca a transação
    const existingTransaction = await prisma.transaction.findUnique({
      where: { id: transactionId }
    });

    // Verifica se existe e pertence ao usuário
    if (!existingTransaction || existingTransaction.userId !== req.session.userId) {
      return res.status(404).json({ error: 'Transação não encontrada' });
    }

    // Valida tipo se foi fornecido
    if (type && type !== 'expense' && type !== 'income') {
      return res.status(400).json({ error: 'Tipo deve ser "expense" ou "income"' });
    }

    // Valida valor se foi fornecido
    if (amount && (isNaN(amount) || amount <= 0)) {
      return res.status(400).json({ error: 'Valor deve ser um número positivo' });
    }

    // Valida data se foi fornecida
    if (date) {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ error: 'Data inválida' });
      }
    }

    // Monta objeto de atualização apenas com campos fornecidos
    const updateData = {};
    if (type) updateData.type = type;
    if (category) updateData.category = category;
    if (description) updateData.description = description;
    if (amount) updateData.amount = parseFloat(amount);
    if (date) {
      updateData.date = new Date(date);
    }

    // Atualiza a transação
    const transaction = await prisma.transaction.update({
      where: { id: transactionId },
      data: updateData
    });

    res.json({
      message: 'Transação atualizada com sucesso!',
      transaction
    });
  } catch (error) {
    console.error('Erro ao atualizar transação:', error);
    res.status(500).json({ error: 'Erro ao atualizar transação' });
  }
});

/**
 * DELETAR UMA TRANSAÇÃO
 * DELETE /api/transactions/:id
 * Remove uma transação do banco de dados
 */
app.delete('/api/transactions/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;

    // Valida se o ID é um número inteiro válido
    const transactionId = validateIntegerId(id);
    if (transactionId === null) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    // Busca a transação
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId }
    });

    // Verifica se existe e pertence ao usuário
    if (!transaction || transaction.userId !== req.session.userId) {
      return res.status(404).json({ error: 'Transação não encontrada' });
    }

    // Deleta a transação
    await prisma.transaction.delete({
      where: { id: transactionId }
    });

    res.json({ message: 'Transação deletada com sucesso!' });
  } catch (error) {
    console.error('Erro ao deletar transação:', error);
    res.status(500).json({ error: 'Erro ao deletar transação' });
  }
});

/**
 * OBTER RESUMO FINANCEIRO
 * GET /api/transactions/summary/stats
 * Retorna estatísticas: total de receitas, despesas e saldo
 */
app.get('/api/transactions/summary/stats', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId;

    // Busca todas as transações do usuário
    const transactions = await prisma.transaction.findMany({
      where: { userId }
    });

    // Calcula totais
    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const balance = income - expenses;

    res.json({
      income,
      expenses,
      balance,
      transactionCount: transactions.length
    });
  } catch (error) {
    console.error('Erro ao calcular resumo:', error);
    res.status(500).json({ error: 'Erro ao calcular resumo financeiro' });
  }
});

/**
 * OBTER DADOS MENSAIS PARA GRÁFICO
 * GET /api/transactions/chart/monthly
 * Retorna receitas e despesas dos últimos 6 meses
 */
app.get('/api/transactions/chart/monthly', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId;

    // Calcula o primeiro dia do mês mais antigo (6 meses atrás)
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    startDate.setHours(0, 0, 0, 0); // Zera horas para pegar o início do dia

    // Busca transações desde o primeiro dia do mês mais antigo
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        date: {
          gte: startDate
        }
      },
      orderBy: {
        date: 'asc'
      }
    });

    // Cria array com os últimos 6 meses
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        month: date.getMonth(),
        year: date.getFullYear(),
        label: date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
        income: 0,
        expenses: 0
      });
    }

    // Agrupa transações por mês
    transactions.forEach(transaction => {
      const transactionDate = new Date(transaction.date);
      const monthIndex = months.findIndex(m => 
        m.month === transactionDate.getMonth() && 
        m.year === transactionDate.getFullYear()
      );

      if (monthIndex !== -1) {
        if (transaction.type === 'income') {
          months[monthIndex].income += transaction.amount;
        } else {
          months[monthIndex].expenses += transaction.amount;
        }
      }
    });

    res.json({ months });
  } catch (error) {
    console.error('Erro ao buscar dados mensais:', error);
    res.status(500).json({ error: 'Erro ao buscar dados do gráfico' });
  }
});

// =============================================================================
// ROTAS DE METAS (CRUD COMPLETO)
// =============================================================================

/**
 * CRIAR NOVA META
 * POST /api/goals
 * Adiciona uma nova meta financeira
 */
app.post('/api/goals', isAuthenticated, async (req, res) => {
  try {
    const { name, targetAmount, currentAmount, deadline, category, description } = req.body;

    // Validação dos campos obrigatórios
    if (!name || !targetAmount || !deadline) {
      return res.status(400).json({ error: 'Nome, valor alvo e prazo são obrigatórios' });
    }

    // Valida valor alvo
    if (isNaN(targetAmount) || targetAmount <= 0) {
      return res.status(400).json({ error: 'Valor alvo deve ser um número positivo' });
    }

    // Valida valor atual se fornecido
    if (currentAmount !== undefined && (isNaN(currentAmount) || currentAmount < 0)) {
      return res.status(400).json({ error: 'Valor atual deve ser um número não-negativo' });
    }

    // Valida prazo
    const parsedDeadline = new Date(deadline);
    if (isNaN(parsedDeadline.getTime())) {
      return res.status(400).json({ error: 'Prazo inválido' });
    }

    // Verifica se o prazo não está no passado (compara apenas data, sem hora)
    if (isDateInPast(parsedDeadline)) {
      return res.status(400).json({ error: 'Prazo não pode estar no passado' });
    }

    // Calcula status inicial baseado no valor atual vs alvo
    const finalCurrentAmount = currentAmount ? parseFloat(currentAmount) : 0;
    const finalTargetAmount = parseFloat(targetAmount);
    const initialStatus = finalCurrentAmount >= finalTargetAmount ? 'completed' : 'active';

    // Cria a meta no banco
    const goal = await prisma.goal.create({
      data: {
        userId: req.session.userId,
        name,
        targetAmount: finalTargetAmount,
        currentAmount: finalCurrentAmount,
        deadline: parsedDeadline,
        category: category || null,
        description: description || null,
        status: initialStatus
      }
    });

    res.status(201).json({
      message: 'Meta criada com sucesso!',
      goal
    });
  } catch (error) {
    console.error('Erro ao criar meta:', error);
    res.status(500).json({ error: 'Erro ao criar meta' });
  }
});

/**
 * LISTAR TODAS AS METAS DO USUÁRIO
 * GET /api/goals
 * Retorna todas as metas do usuário autenticado
 * Aceita query params: status (active/completed/cancelled)
 */
app.get('/api/goals', isAuthenticated, async (req, res) => {
  try {
    const { status } = req.query;

    // Monta filtros dinâmicos
    const filters = {
      userId: req.session.userId
    };

    // Filtro por status
    if (status && ['active', 'completed', 'cancelled'].includes(status)) {
      filters.status = status;
    }

    // Busca metas ordenadas por prazo (mais próximo primeiro)
    const goals = await prisma.goal.findMany({
      where: filters,
      orderBy: {
        deadline: 'asc'
      }
    });

    // Calcula progresso percentual para cada meta
    const goalsWithProgress = goals.map(goal => ({
      ...goal,
      progress: goal.targetAmount > 0 
        ? Math.min(Math.round((goal.currentAmount / goal.targetAmount) * 100), 100)
        : 0
    }));

    res.json({ goals: goalsWithProgress });
  } catch (error) {
    console.error('Erro ao buscar metas:', error);
    res.status(500).json({ error: 'Erro ao buscar metas' });
  }
});

/**
 * BUSCAR UMA META ESPECÍFICA
 * GET /api/goals/:id
 * Retorna os detalhes de uma meta
 */
app.get('/api/goals/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;

    // Valida se o ID é um número inteiro válido
    const goalId = validateIntegerId(id);
    if (goalId === null) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const goal = await prisma.goal.findUnique({
      where: { id: goalId }
    });

    // Se não encontrou ou não pertence ao usuário
    if (!goal || goal.userId !== req.session.userId) {
      return res.status(404).json({ error: 'Meta não encontrada' });
    }

    // Calcula progresso percentual
    const progress = goal.targetAmount > 0 
      ? Math.min(Math.round((goal.currentAmount / goal.targetAmount) * 100), 100)
      : 0;

    res.json({ goal: { ...goal, progress } });
  } catch (error) {
    console.error('Erro ao buscar meta:', error);
    res.status(500).json({ error: 'Erro ao buscar meta' });
  }
});

/**
 * BUSCAR ÚLTIMAS METAS ADICIONADAS (PARA DASHBOARD)
 * GET /api/goals/latest/recent
 * Retorna as 2 últimas metas adicionadas (ordenadas por data de criação)
 */
app.get('/api/goals/latest/recent', isAuthenticated, async (req, res) => {
  try {
    // Busca as 2 últimas metas criadas (independente do status)
    const goals = await prisma.goal.findMany({
      where: {
        userId: req.session.userId
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 2
    });

    // Calcula progresso percentual para cada meta
    const goalsWithProgress = goals.map(goal => ({
      ...goal,
      progress: goal.targetAmount > 0 
        ? Math.min(Math.round((goal.currentAmount / goal.targetAmount) * 100), 100)
        : 0
    }));

    res.json({ goals: goalsWithProgress });
  } catch (error) {
    console.error('Erro ao buscar últimas metas:', error);
    res.status(500).json({ error: 'Erro ao buscar últimas metas' });
  }
});

/**
 * ATUALIZAR UMA META
 * PUT /api/goals/:id
 * Edita uma meta existente
 */
app.put('/api/goals/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, targetAmount, currentAmount, deadline, category, description, status } = req.body;

    // Valida se o ID é um número inteiro válido
    const goalId = validateIntegerId(id);
    if (goalId === null) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    // Busca a meta
    const existingGoal = await prisma.goal.findUnique({
      where: { id: goalId }
    });

    // Verifica se existe e pertence ao usuário
    if (!existingGoal || existingGoal.userId !== req.session.userId) {
      return res.status(404).json({ error: 'Meta não encontrada' });
    }

    // Valida valor alvo se foi fornecido
    if (targetAmount && (isNaN(targetAmount) || targetAmount <= 0)) {
      return res.status(400).json({ error: 'Valor alvo deve ser um número positivo' });
    }

    // Valida valor atual se foi fornecido
    if (currentAmount !== undefined && (isNaN(currentAmount) || currentAmount < 0)) {
      return res.status(400).json({ error: 'Valor atual deve ser um número não-negativo' });
    }

    // Valida prazo se foi fornecido
    if (deadline) {
      const parsedDeadline = new Date(deadline);
      if (isNaN(parsedDeadline.getTime())) {
        return res.status(400).json({ error: 'Prazo inválido' });
      }
      // Verifica se o prazo não está no passado (compara apenas data, sem hora)
      if (isDateInPast(parsedDeadline)) {
        return res.status(400).json({ error: 'Prazo não pode estar no passado' });
      }
    }

    // Valida status se foi fornecido
    if (status && !['active', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Status deve ser "active", "completed" ou "cancelled"' });
    }

    // Monta objeto de atualização apenas com campos fornecidos
    const updateData = {};
    if (name) updateData.name = name;
    if (targetAmount) updateData.targetAmount = parseFloat(targetAmount);
    if (currentAmount !== undefined) updateData.currentAmount = parseFloat(currentAmount);
    if (deadline) updateData.deadline = new Date(deadline);
    if (category !== undefined) updateData.category = category || null;
    if (description !== undefined) updateData.description = description || null;

    // Calcula valores finais para determinar status
    const finalTargetAmount = targetAmount ? parseFloat(targetAmount) : existingGoal.targetAmount;
    const finalCurrentAmount = currentAmount !== undefined ? parseFloat(currentAmount) : existingGoal.currentAmount;
    
    // Auto-completa meta se atingiu o alvo (apenas se status não foi explicitamente fornecido)
    if (!status) {
      if (finalCurrentAmount >= finalTargetAmount) {
        updateData.status = 'completed';
      } else if (existingGoal.status === 'completed' && finalCurrentAmount < finalTargetAmount) {
        // Reativa meta se valor atual caiu abaixo do alvo
        updateData.status = 'active';
      }
    } else {
      updateData.status = status;
    }

    // Atualiza a meta
    const goal = await prisma.goal.update({
      where: { id: goalId },
      data: updateData
    });

    // Calcula progresso percentual
    const progress = goal.targetAmount > 0 
      ? Math.min(Math.round((goal.currentAmount / goal.targetAmount) * 100), 100)
      : 0;

    res.json({
      message: 'Meta atualizada com sucesso!',
      goal: { ...goal, progress }
    });
  } catch (error) {
    console.error('Erro ao atualizar meta:', error);
    res.status(500).json({ error: 'Erro ao atualizar meta' });
  }
});

/**
 * DELETAR UMA META
 * DELETE /api/goals/:id
 * Remove uma meta do banco de dados
 */
app.delete('/api/goals/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;

    // Valida se o ID é um número inteiro válido
    const goalId = validateIntegerId(id);
    if (goalId === null) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    // Busca a meta
    const goal = await prisma.goal.findUnique({
      where: { id: goalId }
    });

    // Verifica se existe e pertence ao usuário
    if (!goal || goal.userId !== req.session.userId) {
      return res.status(404).json({ error: 'Meta não encontrada' });
    }

    // Deleta a meta
    await prisma.goal.delete({
      where: { id: goalId }
    });

    res.json({ message: 'Meta deletada com sucesso!' });
  } catch (error) {
    console.error('Erro ao deletar meta:', error);
    res.status(500).json({ error: 'Erro ao deletar meta' });
  }
});

/**
 * ATUALIZAR VALOR ATUAL DA META (INCREMENTAR PROGRESSO)
 * PUT /api/goals/:id/amount
 * Atualiza apenas o valor atual economizado
 */
app.put('/api/goals/:id/amount', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;

    // Valida se o ID é um número inteiro válido
    const goalId = validateIntegerId(id);
    if (goalId === null) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    // Valida valor
    if (!amount || isNaN(amount) || amount < 0) {
      return res.status(400).json({ error: 'Valor deve ser um número não-negativo' });
    }

    // Busca a meta
    const existingGoal = await prisma.goal.findUnique({
      where: { id: goalId }
    });

    // Verifica se existe e pertence ao usuário
    if (!existingGoal || existingGoal.userId !== req.session.userId) {
      return res.status(404).json({ error: 'Meta não encontrada' });
    }

    // Atualiza o valor atual
    const newCurrentAmount = parseFloat(amount);
    
    // Se atingiu ou ultrapassou a meta, marca como concluída
    const newStatus = newCurrentAmount >= existingGoal.targetAmount ? 'completed' : existingGoal.status;

    const goal = await prisma.goal.update({
      where: { id: goalId },
      data: {
        currentAmount: newCurrentAmount,
        status: newStatus
      }
    });

    // Calcula progresso percentual
    const progress = goal.targetAmount > 0 
      ? Math.min(Math.round((goal.currentAmount / goal.targetAmount) * 100), 100)
      : 0;

    res.json({
      message: newStatus === 'completed' ? 'Parabéns! Meta concluída!' : 'Progresso atualizado com sucesso!',
      goal: { ...goal, progress }
    });
  } catch (error) {
    console.error('Erro ao atualizar progresso:', error);
    res.status(500).json({ error: 'Erro ao atualizar progresso' });
  }
});

/**
 * TRATAMENTO DE SINAIS DE ENCERRAMENTO
 * Garante que a conexão com o banco seja fechada corretamente
 */

// Ctrl+C no terminal
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit();
});

// Sinal de término (usado em produção)
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit();
});

/**
 * INICIALIZAÇÃO DO SERVIDOR
 * Escuta em todas as interfaces de rede (0.0.0.0)
 * Permite acesso tanto local quanto externo
 */
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`📂 Servindo arquivos da pasta 'public'`);
  console.log(`🔐 Sistema de autenticação ativo`);
});
