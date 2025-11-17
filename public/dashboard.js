/**
 * SCRIPT PRINCIPAL DO DASHBOARD
 * 
 * Responsável por:
 * - Verificar autenticação do usuário
 * - Carregar e exibir dados do perfil (nome e foto)
 * - Carregar saldo financeiro
 * - Carregar últimas metas adicionadas
 * - Gerenciar toggle de visibilidade do saldo
 * - Gerenciar logout
 * 
 * Este script é usado em todas as páginas do dashboard
 */

// Estado de visibilidade do saldo
let balanceVisible = true;

/**
 * Escapa caracteres HTML para prevenir XSS
 * Converte caracteres especiais em entidades HTML
 */
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Quando a página carregar completamente
document.addEventListener('DOMContentLoaded', async () => {
    // Verifica se o usuário está autenticado
    await checkAuth();
    // Carrega os dados do usuário (nome e foto)
    await loadUserName();
    // Carrega o saldo financeiro (apenas na página dashboard)
    await loadBalance();
    // Carrega as últimas metas (apenas na página dashboard)
    await loadRecentGoals();
    // Carrega e renderiza o gráfico de gastos e receitas
    await loadChart();
    // Configura o toggle de visibilidade do saldo
    setupBalanceToggle();
});

/**
 * Verifica se o usuário está autenticado
 * Se não estiver, redireciona para a página de login
 */
async function checkAuth() {
    try {
        // Faz requisição para verificar autenticação
        const response = await fetch('/api/auth/check');
        const data = await response.json();

        // Se não estiver autenticado, redireciona para login
        if (!data.authenticated) {
            window.location.href = '/login.html';
        }
    } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        // Em caso de erro, redireciona para login por segurança
        window.location.href = '/login.html';
    }
}

/**
 * Carrega os dados do usuário e atualiza a interface
 * Atualiza tanto o card de perfil quanto o mini perfil da sidebar
 */
async function loadUserName() {
    try {
        // Busca dados do usuário autenticado
        const response = await fetch('/api/auth/me');
        
        if (response.ok) {
            const data = await response.json();
            
            // Busca elementos do DOM que precisam ser atualizados
            const userNameElement = document.getElementById('userName'); // Nome no card principal
            const userAvatar = document.getElementById('userAvatar'); // Avatar no card principal
            const sidebarName = document.getElementById('sidebarName'); // Nome na sidebar
            const sidebarAvatar = document.getElementById('sidebarAvatar'); // Avatar na sidebar
            
            // Atualiza o nome no card principal (se existir na página)
            if (userNameElement) {
                userNameElement.textContent = data.user.name;
            }
            
            // Atualiza o nome na sidebar
            if (sidebarName) {
                sidebarName.textContent = data.user.name;
            }
            
            // Atualiza o avatar no card principal
            if (userAvatar) {
                if (data.user.profilePhoto) {
                    // Se tiver foto, exibe a foto
                    userAvatar.innerHTML = `<img src="${data.user.profilePhoto}" alt="Foto de perfil">`;
                } else if (data.user.name) {
                    // Se não tiver foto, cria iniciais do nome
                    // Ex: "João Silva" -> "JS"
                    const initials = data.user.name
                        .split(' ') // Separa palavras
                        .map(n => n[0]) // Pega primeira letra de cada palavra
                        .join('') // Junta as letras
                        .substring(0, 2) // Pega no máximo 2 letras
                        .toUpperCase(); // Converte para maiúsculas
                    userAvatar.textContent = initials;
                }
            }
            
            // Atualiza o avatar na sidebar
            if (sidebarAvatar) {
                if (data.user.profilePhoto) {
                    // Se tiver foto, exibe a foto com estilos inline para manter redonda
                    sidebarAvatar.innerHTML = `<img src="${data.user.profilePhoto}" alt="Foto de perfil" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
                } else if (data.user.name) {
                    // Se não tiver foto, cria iniciais (mesmo processo acima)
                    const initials = data.user.name
                        .split(' ')
                        .map(n => n[0])
                        .join('')
                        .substring(0, 2)
                        .toUpperCase();
                    sidebarAvatar.textContent = initials;
                }
            }
        }
    } catch (error) {
        console.error('Erro ao carregar nome do usuário:', error);
    }
}

/**
 * Carrega o saldo financeiro do usuário
 * Busca resumo de transações e exibe o saldo total
 */
async function loadBalance() {
    try {
        // Verifica se estamos na página dashboard (elemento existe)
        const balanceElement = document.getElementById('balanceAmount');
        if (!balanceElement) return;

        const response = await fetch('/api/transactions/summary/stats');
        
        if (response.ok) {
            const data = await response.json();
            const balance = data.balance || 0;
            
            // Formata o saldo em real brasileiro
            const formattedBalance = balance.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL'
            });
            
            balanceElement.textContent = formattedBalance;
            balanceElement.dataset.balance = formattedBalance; // Armazena para toggle
        }
    } catch (error) {
        console.error('Erro ao carregar saldo:', error);
    }
}

/**
 * Carrega as últimas 2 metas adicionadas
 * Exibe no card de metas da dashboard
 */
async function loadRecentGoals() {
    try {
        // Verifica se estamos na página dashboard (elemento existe)
        const goalsContainer = document.getElementById('goalsContainer');
        if (!goalsContainer) return;

        const response = await fetch('/api/goals/latest/recent');
        
        if (response.ok) {
            const data = await response.json();
            const goals = data.goals || [];
            
            if (goals.length === 0) {
                goalsContainer.innerHTML = '<p style="text-align: center; color: #888; padding: 20px;">Nenhuma meta adicionada ainda</p>';
                return;
            }
            
            // Renderiza as metas (com escape de HTML para prevenir XSS)
            goalsContainer.innerHTML = goals.map(goal => {
                const currentFormatted = goal.currentAmount.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                });
                const targetFormatted = goal.targetAmount.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                });
                
                // Escapa o nome da meta para prevenir XSS
                const safeName = escapeHtml(goal.name);
                
                return `
                    <div class="goal-item">
                        <div class="goal-info">
                            <span class="goal-name">${safeName}</span>
                            <span class="goal-amount">${currentFormatted} de ${targetFormatted}</span>
                        </div>
                        <div class="goal-progress">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${goal.progress}%"></div>
                            </div>
                            <span class="goal-percent">${goal.progress}%</span>
                        </div>
                    </div>
                `;
            }).join('');
        }
    } catch (error) {
        console.error('Erro ao carregar metas:', error);
        const goalsContainer = document.getElementById('goalsContainer');
        if (goalsContainer) {
            goalsContainer.innerHTML = '<p style="text-align: center; color: #888; padding: 20px;">Erro ao carregar metas</p>';
        }
    }
}

/**
 * Carrega e renderiza o gráfico de receitas e despesas
 * Busca dados mensais da API e cria visualização SVG
 */
async function loadChart() {
    try {
        // Verifica se estamos na página dashboard (elemento existe)
        const chartSvg = document.getElementById('chartSvg');
        if (!chartSvg) return;

        const response = await fetch('/api/transactions/chart/monthly');
        
        if (response.ok) {
            const data = await response.json();
            const months = data.months || [];
            
            if (months.length === 0) return;
            
            // Atualiza os meses abaixo do gráfico
            const chartMonths = document.getElementById('chartMonths');
            if (chartMonths) {
                chartMonths.innerHTML = months.map(m => `<span>${m.label}</span>`).join('');
            }
            
            // Encontra o valor máximo para normalização
            const maxValue = Math.max(
                ...months.map(m => Math.max(m.income, m.expenses)),
                100 // Valor mínimo para evitar gráfico muito achatado
            );
            
            // Função para normalizar valores (0 = topo do gráfico, 80 = base)
            const normalize = (value) => {
                if (maxValue === 0) return 70;
                return 70 - (value / maxValue) * 60; // Inverte para SVG (topo = 0)
            };
            
            // Calcula pontos para as linhas (6 meses, espaçados igualmente em 200px de largura)
            const spacing = 200 / (months.length - 1 || 1);
            
            // Cria pontos para receitas (azul)
            const incomePoints = months.map((m, i) => 
                `${i * spacing},${normalize(m.income)}`
            ).join(' ');
            
            // Cria pontos para despesas (vermelho)
            const expensePoints = months.map((m, i) => 
                `${i * spacing},${normalize(m.expenses)}`
            ).join(' ');
            
            // Renderiza o gráfico com duas linhas
            chartSvg.innerHTML = `
                <!-- Linha de receitas (azul) -->
                <polyline points="${incomePoints}" 
                          fill="none" stroke="#00D9FF" stroke-width="2.5" 
                          stroke-linecap="round" stroke-linejoin="round"/>
                <!-- Linha de despesas (vermelho) -->
                <polyline points="${expensePoints}" 
                          fill="none" stroke="#FF6B6B" stroke-width="2.5"
                          stroke-linecap="round" stroke-linejoin="round"/>
                <!-- Pontos na linha de receitas -->
                ${months.map((m, i) => `
                    <circle cx="${i * spacing}" cy="${normalize(m.income)}" 
                            r="3" fill="#00D9FF" stroke="white" stroke-width="1"/>
                `).join('')}
                <!-- Pontos na linha de despesas -->
                ${months.map((m, i) => `
                    <circle cx="${i * spacing}" cy="${normalize(m.expenses)}" 
                            r="3" fill="#FF6B6B" stroke="white" stroke-width="1"/>
                `).join('')}
            `;
            
            // Calcula total do mês atual (último mês)
            const currentMonth = months[months.length - 1];
            const currentTotal = currentMonth.income - currentMonth.expenses;
            
            // Atualiza o valor total exibido
            const chartValue = document.getElementById('chartTotalValue');
            if (chartValue) {
                chartValue.textContent = currentTotal.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                });
            }
            
            // Calcula a variação percentual (comparando com o mês anterior)
            if (months.length >= 2) {
                const previousMonth = months[months.length - 2];
                const previousTotal = previousMonth.income - previousMonth.expenses;
                
                let percentChange = 0;
                if (previousTotal !== 0) {
                    percentChange = ((currentTotal - previousTotal) / Math.abs(previousTotal)) * 100;
                }
                
                const chartSubtitle = document.getElementById('chartSubtitle');
                if (chartSubtitle) {
                    const sign = percentChange >= 0 ? '+' : '';
                    chartSubtitle.textContent = `Este mês ${sign}${percentChange.toFixed(1)}%`;
                }
            }
        }
    } catch (error) {
        console.error('Erro ao carregar gráfico:', error);
    }
}

/**
 * Configura o botão de toggle de visibilidade do saldo
 * Alterna entre mostrar e ocultar o valor do saldo
 */
function setupBalanceToggle() {
    const toggleButton = document.getElementById('balanceToggle');
    const balanceElement = document.getElementById('balanceAmount');
    
    if (!toggleButton || !balanceElement) return;
    
    toggleButton.addEventListener('click', () => {
        balanceVisible = !balanceVisible;
        
        if (balanceVisible) {
            // Mostra o saldo
            balanceElement.textContent = balanceElement.dataset.balance || 'R$ 0,00';
            toggleButton.textContent = '👁️';
        } else {
            // Oculta o saldo
            balanceElement.textContent = '••••••';
            toggleButton.textContent = '👁️‍🗨️';
        }
    });
}

/**
 * Faz logout do usuário e redireciona para a página de login
 * Esta função é chamada pelo botão "Sair" na sidebar
 */
async function logout() {
    try {
        // Faz requisição POST para o endpoint de logout
        const response = await fetch('/api/auth/logout', {
            method: 'POST'
        });

        if (response.ok) {
            // Se logout bem-sucedido, redireciona para login
            window.location.href = '/login.html';
        } else {
            alert('Erro ao fazer logout');
        }
    } catch (error) {
        console.error('Erro ao fazer logout:', error);
        alert('Erro ao fazer logout');
    }
}
