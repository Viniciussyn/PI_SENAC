/**
 * SCRIPT DE GERENCIAMENTO DE TRANSAÇÕES
 * 
 * Responsável por:
 * - Listar todas as transações do usuário
 * - Adicionar novas transações
 * - Editar transações existentes
 * - Excluir transações
 * - Filtrar transações por tipo (todas, despesas, receitas)
 */

// Estado global
let currentFilter = 'all'; // Filtro ativo: 'all', 'expense', 'income'
let currentEditingId = null; // ID da transação sendo editada

// Mapa de ícones por categoria
const categoryIcons = {
  'Alimentação': '🍔',
  'Transporte': '🚗',
  'Moradia': '🏠',
  'Saúde': '🏥',
  'Educação': '📚',
  'Lazer': '🎬',
  'Compras': '🛍️',
  'Salário': '💰',
  'Freelance': '💻',
  'Investimentos': '📈',
  'Outros': '📌'
};

/**
 * Quando a página carregar
 */
document.addEventListener('DOMContentLoaded', async () => {
  await loadTransactions();
  setupFilters();
});

/**
 * Configura os filtros de transações (Todas, Despesas, Receitas)
 */
function setupFilters() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  
  tabButtons.forEach((btn, index) => {
    btn.addEventListener('click', () => {
      // Remove classe active de todos
      tabButtons.forEach(b => b.classList.remove('active'));
      // Adiciona active no clicado
      btn.classList.add('active');
      
      // Define filtro baseado no índice
      if (index === 0) currentFilter = 'all';
      else if (index === 1) currentFilter = 'expense';
      else if (index === 2) currentFilter = 'income';
      
      // Recarrega transações com filtro
      loadTransactions();
    });
  });
}

/**
 * Carrega as transações do usuário
 */
async function loadTransactions() {
  try {
    // Monta URL com filtro se necessário
    let url = '/api/transactions';
    if (currentFilter !== 'all') {
      url += `?type=${currentFilter}`;
    }

    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error('Erro ao carregar transações');
    }

    const data = await response.json();
    renderTransactions(data.transactions);
  } catch (error) {
    console.error('Erro ao carregar transações:', error);
    showMessage('Erro ao carregar transações', 'error');
  }
}

/**
 * Renderiza a lista de transações na tela
 * @param {Array} transactions - Array de transações
 */
function renderTransactions(transactions) {
  const container = document.querySelector('.transactions-list');
  
  if (!transactions || transactions.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>📋 Nenhuma transação encontrada</p>
        <p>Clique em "Nova Transação" para adicionar</p>
      </div>
    `;
    return;
  }

  container.innerHTML = transactions.map(transaction => {
    const icon = categoryIcons[transaction.category] || '📌';
    const date = new Date(transaction.date).toLocaleDateString('pt-BR');
    const amount = transaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const typeClass = transaction.type === 'expense' ? 'expense' : 'income';
    const signal = transaction.type === 'expense' ? '-' : '+';
    
    return `
      <div class="transaction-item ${typeClass}">
        <div class="transaction-icon">${icon}</div>
        <div class="transaction-details">
          <h4>${transaction.description}</h4>
          <p>${transaction.category} • ${date}</p>
        </div>
        <span class="transaction-amount">${signal} R$ ${amount}</span>
        <div class="transaction-actions">
          <button onclick="editTransaction(${transaction.id})" class="btn-icon" title="Editar">✏️</button>
          <button onclick="deleteTransaction(${transaction.id})" class="btn-icon" title="Excluir">🗑️</button>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Abre o modal para adicionar nova transação
 */
function openNewTransactionModal() {
  currentEditingId = null;
  document.getElementById('modalTitle').textContent = 'Nova Transação';
  document.getElementById('transactionForm').reset();
  document.getElementById('transactionDate').valueAsDate = new Date();
  document.getElementById('transactionModal').style.display = 'flex';
}

/**
 * Fecha o modal de transação
 */
function closeTransactionModal() {
  document.getElementById('transactionModal').style.display = 'none';
  currentEditingId = null;
}

/**
 * Edita uma transação existente
 * @param {number} id - ID da transação
 */
async function editTransaction(id) {
  try {
    const response = await fetch(`/api/transactions/${id}`);
    
    if (!response.ok) {
      throw new Error('Erro ao carregar transação');
    }

    const data = await response.json();
    const transaction = data.transaction;
    
    // Preenche o formulário com os dados
    currentEditingId = id;
    document.getElementById('modalTitle').textContent = 'Editar Transação';
    document.getElementById('transactionType').value = transaction.type;
    document.getElementById('transactionCategory').value = transaction.category;
    document.getElementById('transactionDescription').value = transaction.description;
    document.getElementById('transactionAmount').value = transaction.amount;
    document.getElementById('transactionDate').valueAsDate = new Date(transaction.date);
    
    // Abre o modal
    document.getElementById('transactionModal').style.display = 'flex';
  } catch (error) {
    console.error('Erro ao editar transação:', error);
    showMessage('Erro ao carregar transação para edição', 'error');
  }
}

/**
 * Deleta uma transação
 * @param {number} id - ID da transação
 */
async function deleteTransaction(id) {
  if (!confirm('Tem certeza que deseja excluir esta transação?')) {
    return;
  }

  try {
    const response = await fetch(`/api/transactions/${id}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error('Erro ao deletar transação');
    }

    showMessage('Transação excluída com sucesso!', 'success');
    await loadTransactions();
  } catch (error) {
    console.error('Erro ao deletar transação:', error);
    showMessage('Erro ao excluir transação', 'error');
  }
}

/**
 * Salva uma transação (cria ou atualiza)
 */
async function saveTransaction(e) {
  e.preventDefault();

  const type = document.getElementById('transactionType').value;
  const category = document.getElementById('transactionCategory').value;
  const description = document.getElementById('transactionDescription').value;
  const amount = parseFloat(document.getElementById('transactionAmount').value);
  const date = document.getElementById('transactionDate').value;

  // Validação básica
  if (!type || !category || !description || !amount || !date) {
    showMessage('Preencha todos os campos', 'error');
    return;
  }

  if (amount <= 0) {
    showMessage('O valor deve ser maior que zero', 'error');
    return;
  }

  try {
    let response;
    
    if (currentEditingId) {
      // Atualizar transação existente
      response = await fetch(`/api/transactions/${currentEditingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, category, description, amount, date })
      });
    } else {
      // Criar nova transação
      response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, category, description, amount, date })
      });
    }

    if (!response.ok) {
      throw new Error('Erro ao salvar transação');
    }

    const message = currentEditingId ? 'Transação atualizada com sucesso!' : 'Transação criada com sucesso!';
    showMessage(message, 'success');
    
    closeTransactionModal();
    await loadTransactions();
  } catch (error) {
    console.error('Erro ao salvar transação:', error);
    showMessage('Erro ao salvar transação', 'error');
  }
}

/**
 * Exibe mensagem de feedback para o usuário
 * @param {string} message - Mensagem a exibir
 * @param {string} type - Tipo: 'success' ou 'error'
 */
function showMessage(message, type = 'info') {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message-toast ${type}`;
  messageDiv.textContent = message;
  
  document.body.appendChild(messageDiv);
  
  // Remove após 3 segundos
  setTimeout(() => {
    messageDiv.remove();
  }, 3000);
}
