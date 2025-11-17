/**
 * COMPONENTE REUTILIZÁVEL DA SIDEBAR
 *
 * Este componente é usado em todas as 6 páginas do dashboard
 * (Visão Geral, Transações, Metas, Relatórios, Educação, Recompensas)
 *
 * Vantagens:
 * - Elimina duplicação de código HTML
 * - Facilita manutenção (alterar em 1 lugar atualiza todas as páginas)
 * - Destaca automaticamente a página ativa
 */

/**
 * Cria o HTML da sidebar com navegação e perfil do usuário
 * @param {string} activePage - Nome da página ativa (ex: 'dashboard', 'transacoes', 'metas')
 * @returns {string} HTML completo da sidebar
 */
function createSidebar(activePage) {
  const sidebarHTML = `
        <aside class="sidebar">
            <!-- Cabeçalho com logo do sistema -->
            <div class="sidebar-header">
                <h1>💰 OrganizeFinance</h1>
            </div>
            
            <!-- Menu de navegação com 6 seções -->
            <nav class="sidebar-nav">
                <!-- Visão Geral - classe 'active' é adicionada dinamicamente -->
                <a href="/dashboard.html" class="nav-item ${
                  activePage === "dashboard" ? "active" : ""
                }">
                    <span class="nav-icon">🏠</span>
                    <span class="nav-text">Visão Geral</span>
                </a>
                <!-- Transações -->
                <a href="/transacoes.html" class="nav-item ${
                  activePage === "transacoes" ? "active" : ""
                }">
                    <span class="nav-icon">📊</span>
                    <span class="nav-text">Transações</span>
                </a>
                <!-- Metas -->
                <a href="/metas.html" class="nav-item ${
                  activePage === "metas" ? "active" : ""
                }">
                    <span class="nav-icon">🎯</span>
                    <span class="nav-text">Metas</span>
                </a>
            </nav>

            <!-- Rodapé com perfil do usuário e botão de sair -->
            <div class="sidebar-footer">
                <div class="user-profile">
                    <!-- Avatar (será preenchido com foto ou iniciais pelo dashboard.js) -->
                    <div class="avatar-small" id="sidebarAvatar">U</div>
                    <div class="user-info-small">
                        <!-- Nome do usuário (será atualizado pelo dashboard.js) -->
                        <span id="sidebarName">Usuário</span>
                        <!-- Botão de logout (chama função do dashboard.js) -->
                        <button onclick="logout()" class="logout-link">Sair</button>
                    </div>
                </div>
            </div>
        </aside>
    `;

  return sidebarHTML;
}

/**
 * Carrega a sidebar na página atual
 * @param {string} activePage - Nome da página ativa para destacar o item correto
 */
function loadSidebar(activePage) {
  // Busca o container principal da aplicação
  const appContainer = document.querySelector(".app-container");

  if (appContainer) {
    // Cria o HTML da sidebar
    const sidebar = createSidebar(activePage);

    // Insere a sidebar no início do container (antes do main-content)
    appContainer.insertAdjacentHTML("afterbegin", sidebar);
  }
}
