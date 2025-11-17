/**
 * METAS.JS - GERENCIAMENTO DE METAS
 * 
 * Este script gerencia todas as funcionalidades de metas:
 * - Carregar lista de metas da API
 * - Adicionar nova meta
 * - Editar meta existente
 * - Excluir meta
 * - Atualizar progresso da meta
 * - Filtrar por status
 */

// Variável global para armazenar o filtro atual
let currentFilter = 'all';

/**
 * Carrega as metas ao iniciar a página
 */
document.addEventListener('DOMContentLoaded', function() {
  loadGoals();
});

/**
 * CARREGAR METAS DA API
 * Busca todas as metas do usuário autenticado
 */
async function loadGoals(status = currentFilter) {
  try {
    // Monta URL com filtro de status (se não for 'all')
    let url = '/api/goals';
    if (status !== 'all') {
      url += `?status=${status}`;
    }

    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error('Erro ao carregar metas');
    }

    const data = await response.json();
    renderGoals(data.goals);
  } catch (error) {
    console.error('Erro ao carregar metas:', error);
    showToast('Erro ao carregar metas', 'error');
  }
}

/**
 * RENDERIZAR METAS NA PÁGINA
 * Cria cards de metas dinamicamente
 */
function renderGoals(goals) {
  const goalsList = document.getElementById('goalsList');
  const emptyState = document.getElementById('emptyState');

  // Se não há metas, mostra estado vazio
  if (!goals || goals.length === 0) {
    goalsList.innerHTML = '';
    emptyState.style.display = 'flex';
    return;
  }

  // Esconde estado vazio
  emptyState.style.display = 'none';

  // Gera HTML dos cards
  goalsList.innerHTML = goals.map(goal => {
    const deadline = new Date(goal.deadline);
    const deadlineFormatted = deadline.toLocaleDateString('pt-BR');
    const isExpired = deadline < new Date() && goal.status === 'active';
    const daysRemaining = Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24));
    
    // Determina cor da barra de progresso
    let progressColor = '#4CAF50'; // Verde para ativas
    if (goal.status === 'completed') {
      progressColor = '#2196F3'; // Azul para concluídas
    } else if (goal.status === 'cancelled') {
      progressColor = '#9E9E9E'; // Cinza para canceladas
    } else if (isExpired) {
      progressColor = '#F44336'; // Vermelho para expiradas
    }

    // Badge de status
    let statusBadge = '';
    if (goal.status === 'completed') {
      statusBadge = '<span class="status-badge completed">✓ Concluída</span>';
    } else if (goal.status === 'cancelled') {
      statusBadge = '<span class="status-badge cancelled">✗ Cancelada</span>';
    } else if (isExpired) {
      statusBadge = '<span class="status-badge expired">⚠ Expirada</span>';
    } else if (daysRemaining <= 7) {
      statusBadge = `<span class="status-badge warning">⏰ ${daysRemaining} dias restantes</span>`;
    }

    return `
      <div class="goal-card" data-goal-id="${goal.id}">
        <div class="goal-header">
          <div>
            <h3>${goal.name}</h3>
            ${goal.category ? `<span class="goal-category">${getCategoryEmoji(goal.category)} ${goal.category}</span>` : ''}
          </div>
          ${statusBadge}
        </div>

        ${goal.description ? `<p class="goal-description">${goal.description}</p>` : ''}

        <div class="goal-amounts">
          <div class="amount-item">
            <span class="amount-label">Valor Atual:</span>
            <span class="amount-value">R$ ${goal.currentAmount.toFixed(2)}</span>
          </div>
          <div class="amount-item">
            <span class="amount-label">Valor Alvo:</span>
            <span class="amount-value">R$ ${goal.targetAmount.toFixed(2)}</span>
          </div>
          <div class="amount-item">
            <span class="amount-label">Faltam:</span>
            <span class="amount-value">R$ ${Math.max(0, goal.targetAmount - goal.currentAmount).toFixed(2)}</span>
          </div>
        </div>

        <div class="goal-progress">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${goal.progress}%; background-color: ${progressColor}"></div>
          </div>
          <span class="goal-percent">${goal.progress}%</span>
        </div>

        <div class="goal-footer">
          <span class="goal-deadline">📅 Prazo: ${deadlineFormatted}</span>
          <div class="goal-actions">
            ${goal.status === 'active' ? `<button class="btn-icon" onclick="openProgressModalForGoal(${goal.id}, ${goal.currentAmount}, ${goal.targetAmount})" title="Atualizar progresso">💰</button>` : ''}
            ${goal.status !== 'completed' ? `<button class="btn-icon" onclick="editGoal(${goal.id})" title="Editar">✏️</button>` : ''}
            <button class="btn-icon delete" onclick="deleteGoal(${goal.id})" title="Excluir">🗑️</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * OBTER EMOJI DA CATEGORIA
 */
function getCategoryEmoji(category) {
  const emojis = {
    'Viagem': '🏖️',
    'Emergência': '🚨',
    'Compra': '🛒',
    'Educação': '📚',
    'Investimento': '💰',
    'Casa': '🏠',
    'Carro': '🚗',
    'Saúde': '❤️',
    'Outro': '📌'
  };
  return emojis[category] || '📌';
}

/**
 * FILTRAR METAS POR STATUS
 */
function filterGoals(status) {
  currentFilter = status;
  
  // Atualiza estado visual dos botões de filtro
  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  document.querySelector(`[data-status="${status}"]`).classList.add('active');

  // Carrega metas com o filtro
  loadGoals(status);
}

/**
 * ABRIR MODAL DE NOVA META
 */
function openGoalModal() {
  const modal = document.getElementById('goalModal');
  const modalTitle = document.getElementById('modalTitle');
  const form = document.getElementById('goalForm');

  modalTitle.textContent = 'Nova Meta';
  form.reset();
  document.getElementById('goalId').value = '';
  document.getElementById('goalCurrentAmount').value = '0';
  
  // Define data mínima como hoje
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('goalDeadline').setAttribute('min', today);

  modal.style.display = 'flex';
}

/**
 * FECHAR MODAL DE META
 */
function closeGoalModal() {
  const modal = document.getElementById('goalModal');
  modal.style.display = 'none';
}

/**
 * EDITAR META
 * Carrega dados da meta no modal
 */
async function editGoal(goalId) {
  try {
    const response = await fetch(`/api/goals/${goalId}`);
    
    if (!response.ok) {
      throw new Error('Erro ao carregar meta');
    }

    const data = await response.json();
    const goal = data.goal;

    // Preenche o formulário
    document.getElementById('goalId').value = goal.id;
    document.getElementById('goalName').value = goal.name;
    document.getElementById('goalTargetAmount').value = goal.targetAmount;
    document.getElementById('goalCurrentAmount').value = goal.currentAmount;
    document.getElementById('goalDeadline').value = goal.deadline.split('T')[0];
    document.getElementById('goalCategory').value = goal.category || '';
    document.getElementById('goalDescription').value = goal.description || '';

    // Atualiza título do modal
    document.getElementById('modalTitle').textContent = 'Editar Meta';

    // Abre o modal
    document.getElementById('goalModal').style.display = 'flex';
  } catch (error) {
    console.error('Erro ao carregar meta:', error);
    showToast('Erro ao carregar meta', 'error');
  }
}

/**
 * SALVAR META (CRIAR OU ATUALIZAR)
 */
async function saveGoal(event) {
  event.preventDefault();

  const goalId = document.getElementById('goalId').value;
  const goalData = {
    name: document.getElementById('goalName').value.trim(),
    targetAmount: parseFloat(document.getElementById('goalTargetAmount').value),
    currentAmount: parseFloat(document.getElementById('goalCurrentAmount').value),
    deadline: document.getElementById('goalDeadline').value,
    category: document.getElementById('goalCategory').value || null,
    description: document.getElementById('goalDescription').value.trim() || null
  };

  try {
    let response;
    
    if (goalId) {
      // Atualizar meta existente
      response = await fetch(`/api/goals/${goalId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(goalData)
      });
    } else {
      // Criar nova meta
      response = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(goalData)
      });
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao salvar meta');
    }

    const data = await response.json();
    showToast(data.message, 'success');
    closeGoalModal();
    loadGoals(currentFilter);
  } catch (error) {
    console.error('Erro ao salvar meta:', error);
    showToast(error.message, 'error');
  }
}

/**
 * DELETAR META
 */
async function deleteGoal(goalId) {
  if (!confirm('Tem certeza que deseja excluir esta meta?')) {
    return;
  }

  try {
    const response = await fetch(`/api/goals/${goalId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error('Erro ao deletar meta');
    }

    const data = await response.json();
    showToast(data.message, 'success');
    loadGoals(currentFilter);
  } catch (error) {
    console.error('Erro ao deletar meta:', error);
    showToast('Erro ao deletar meta', 'error');
  }
}

/**
 * ABRIR MODAL DE ATUALIZAR PROGRESSO
 */
function openProgressModalForGoal(goalId, currentAmount, targetAmount) {
  const modal = document.getElementById('progressModal');
  const progressAmount = document.getElementById('progressAmount');
  const progressGoalId = document.getElementById('progressGoalId');
  const progressInfo = document.getElementById('progressInfo');

  progressGoalId.value = goalId;
  progressAmount.value = currentAmount;
  progressInfo.textContent = `Valor alvo: R$ ${targetAmount.toFixed(2)} | Faltam: R$ ${(targetAmount - currentAmount).toFixed(2)}`;

  modal.style.display = 'flex';
}

/**
 * FECHAR MODAL DE PROGRESSO
 */
function closeProgressModal() {
  const modal = document.getElementById('progressModal');
  modal.style.display = 'none';
}

/**
 * ATUALIZAR PROGRESSO DA META
 */
async function updateProgress(event) {
  event.preventDefault();

  const goalId = document.getElementById('progressGoalId').value;
  const amount = parseFloat(document.getElementById('progressAmount').value);

  try {
    const response = await fetch(`/api/goals/${goalId}/amount`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao atualizar progresso');
    }

    const data = await response.json();
    showToast(data.message, 'success');
    closeProgressModal();
    loadGoals(currentFilter);
  } catch (error) {
    console.error('Erro ao atualizar progresso:', error);
    showToast(error.message, 'error');
  }
}

/**
 * EXIBIR TOAST DE NOTIFICAÇÃO
 */
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type} show`;

  setTimeout(() => {
    toast.className = 'toast';
  }, 3000);
}

/**
 * FECHAR MODAIS AO CLICAR FORA
 */
window.addEventListener('click', function(event) {
  const goalModal = document.getElementById('goalModal');
  const progressModal = document.getElementById('progressModal');
  
  if (event.target === goalModal) {
    closeGoalModal();
  }
  
  if (event.target === progressModal) {
    closeProgressModal();
  }
});
