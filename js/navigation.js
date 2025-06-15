// Navigation.js - Versão corrigida com lifecycle melhorado
class NavigationManager {
    constructor() {
        this.currentPage = 'dashboard';
        this.pageHistory = [];
        this.maxHistorySize = 10;
        this.pageCleanupFunctions = new Map();
        this.isNavigating = false; // Flag para evitar navegação simultânea
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadInitialPage();
    }

    setupEventListeners() {
        // Navegação por clique
        document.addEventListener('click', (e) => {
            const navItem = e.target.closest('.nav-item');
            if (navItem) {
                e.preventDefault();
                const page = navItem.dataset.page;
                if (page && page !== this.currentPage && !this.isNavigating) {
                    this.navigateTo(page);
                }
            }
        });

        // Navegação por teclado
        document.addEventListener('keydown', (e) => {
            if (e.altKey) {
                switch(e.key) {
                    case '1':
                        e.preventDefault();
                        this.navigateTo('dashboard');
                        break;
                    case '2':
                        e.preventDefault();
                        this.navigateTo('vendas');
                        break;
                    case '3':
                        e.preventDefault();
                        this.navigateTo('despesas');
                        break;
                    case '4':
                        e.preventDefault();
                        this.navigateTo('postes');
                        break;
                }
            }
        });

        // Browser back/forward
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.page && !this.isNavigating) {
                this.loadPageContent(e.state.page, false);
            }
        });

        // Detectar mudanças de visibilidade da página
        document.addEventListener('visibilitychange', () => {
            this.handleVisibilityChange();
        });
    }

    loadInitialPage() {
        // Verificar hash na URL
        const hash = window.location.hash.substring(1);
        const validPages = ['dashboard', 'vendas', 'despesas', 'postes'];
        
        if (hash && validPages.includes(hash)) {
            this.navigateTo(hash, false);
        } else {
            this.navigateTo('dashboard', false);
        }
    }

    async navigateTo(page, addToHistory = true) {
        if (this.isNavigating) {
            console.log('🚫 Navegação já em andamento, ignorando...');
            return;
        }

        if (this.currentPage === page) {
            // Mesmo se for a mesma página, recarregar dados
            console.log(`🔄 Mesma página ${page} - forçando refresh...`);
            await this.refreshCurrentPage();
            return;
        }

        console.log(`🧭 Navegando de ${this.currentPage} para: ${page}`);

        try {
            this.isNavigating = true;
            
            // Verificar se pode sair da página atual
            if (await this.canLeavePage()) {
                // IMPORTANTE: Limpar página anterior antes de carregar nova
                await this.cleanupCurrentPage();
                
                await this.loadPageContent(page, addToHistory);
            }
        } catch (error) {
            console.error('Erro na navegação:', error);
            showAlert('Erro ao navegar para a página', 'error');
        } finally {
            this.isNavigating = false;
        }
    }

    // Função para recarregar a página atual
    async refreshCurrentPage() {
        try {
            this.isNavigating = true;
            
            console.log(`🔄 Recarregando página: ${this.currentPage}`);
            
            // Executar função específica de recarga se existir
            const refreshFunction = window[`refresh${Utils.capitalize(this.currentPage)}`];
            if (typeof refreshFunction === 'function') {
                await refreshFunction();
            } else {
                // Fallback: reinicializar a página
                const initFunction = window[`init${Utils.capitalize(this.currentPage)}Page`];
                if (typeof initFunction === 'function') {
                    await initFunction();
                }
            }
            
        } catch (error) {
            console.error('Erro ao recarregar página:', error);
            showAlert('Erro ao recarregar página', 'error');
        } finally {
            this.isNavigating = false;
        }
    }

    // Função para limpar a página atual
    async cleanupCurrentPage() {
        const currentPage = this.currentPage;
        
        console.log(`🧹 Limpando página: ${currentPage}`);
        
        // Executar função de cleanup específica da página se existir
        const cleanupFunction = window[`cleanup${Utils.capitalize(currentPage)}`];
        if (typeof cleanupFunction === 'function') {
            try {
                await cleanupFunction();
                console.log(`✅ Cleanup de ${currentPage} executado`);
            } catch (error) {
                console.error(`❌ Erro no cleanup de ${currentPage}:`, error);
            }
        }
        
        // Limpar qualquer timer ou evento global da página anterior
        this.clearPageTimers();
    }

    // Limpar timers e eventos globais
    clearPageTimers() {
        // Limpar todos os intervalos ativos
        for (let i = 1; i < 1000; i++) {
            clearInterval(i);
            clearTimeout(i);
        }
    }

    // Gerenciar visibilidade da página
    handleVisibilityChange() {
        if (!document.hidden && this.currentPage === 'dashboard') {
            // Página ficou visível e estamos no dashboard
            console.log('👁️ Dashboard ficou visível - verificando se precisa recarregar...');
            setTimeout(() => {
                if (window.ensureDashboardLoaded) {
                    window.ensureDashboardLoaded();
                }
            }, 500);
        }
    }

    async canLeavePage() {
        // Verificar se há formulários não salvos
        const forms = document.querySelectorAll('form');
        for (const form of forms) {
            if (this.hasUnsavedChanges(form)) {
                const leave = await Utils.confirm(
                    'Você tem alterações não salvas. Deseja continuar?',
                    'Alterações não salvas'
                );
                if (!leave) return false;
            }
        }
        return true;
    }

    hasUnsavedChanges(form) {
        // Implementar lógica para detectar mudanças não salvas
        const inputs = form.querySelectorAll('input, select, textarea');
        for (const input of inputs) {
            if (input.dataset.originalValue !== input.value) {
                return true;
            }
        }
        return false;
    }

    async loadPageContent(page, addToHistory = true) {
        try {
            showLoading(true);

            // Adicionar ao histórico
            if (addToHistory) {
                this.addToHistory(this.currentPage);
                history.pushState({ page }, '', `#${page}`);
            }

            // Atualizar navegação visual
            this.updateNavigationState(page);

            // Carregar conteúdo
            await this.loadPage(page);

            // Atualizar estado DEPOIS de carregar com sucesso
            this.currentPage = page;

            console.log(`✅ Navegação para ${page} concluída`);

        } catch (error) {
            console.error(`Erro ao carregar página ${page}:`, error);
            showAlert(`Erro ao carregar página ${page}`, 'error');
        } finally {
            showLoading(false);
        }
    }

    async loadPage(page) {
        const pageUrl = CONFIG.PAGES[page];
        if (!pageUrl) {
            throw new Error(`Página ${page} não encontrada`);
        }

        // Carregar HTML
        const response = await fetch(pageUrl + '?t=' + Date.now()); // Cache bust
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }

        const html = await response.text();
        const contentContainer = document.getElementById('page-content');
        contentContainer.innerHTML = html;

        // Carregar e executar script da página
        await this.loadPageScript(page);

        // Inicializar página
        await this.initializePage(page);
    }

    async loadPageScript(page) {
        // Remover scripts anteriores
        document.querySelectorAll('.page-script').forEach(script => {
            script.remove();
        });

        // Carregar novo script
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = `js/${page}.js?t=${Date.now()}`; // Cache bust para garantir script fresco
            script.className = 'page-script';
            script.onload = resolve;
            script.onerror = () => {
                console.warn(`Script ${page}.js não encontrado`);
                resolve(); // Não é erro crítico
            };
            document.head.appendChild(script);
        });
    }

    async initializePage(page) {
        // Pequeno delay para garantir que o script foi carregado
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Executar função de inicialização se existir
        const initFunction = window[`init${Utils.capitalize(page)}Page`];
        if (typeof initFunction === 'function') {
            console.log(`🚀 Inicializando página: ${page}`);
            await initFunction();
        } else {
            console.warn(`⚠️ Função de inicialização init${Utils.capitalize(page)}Page não encontrada`);
        }

        // Configurar máscaras de input
        this.setupInputMasks();

        // Configurar validação de formulários
        this.setupFormValidation();

        // LOG ESPECIAL PARA PÁGINAS
        console.log(`📊 ${Utils.capitalize(page)} inicializado - dados sempre frescos!`);
    }

    setupInputMasks() {
        // CPF
        document.querySelectorAll('input[data-mask="cpf"]').forEach(input => {
            Utils.applyMask(input, '999.999.999-99');
        });

        // Telefone
        document.querySelectorAll('input[data-mask="phone"]').forEach(input => {
            Utils.applyMask(input, '(99) 99999-9999');
        });

        // Dinheiro
        document.querySelectorAll('input[data-mask="money"]').forEach(input => {
            input.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');
                value = (value / 100).toFixed(2);
                e.target.value = value;
            });
        });
    }

    setupFormValidation() {
        document.querySelectorAll('form').forEach(form => {
            // Marcar valores originais para detectar mudanças
            const inputs = form.querySelectorAll('input, select, textarea');
            inputs.forEach(input => {
                input.dataset.originalValue = input.value;
            });

            // Validação em tempo real
            inputs.forEach(input => {
                input.addEventListener('blur', () => {
                    this.validateField(input);
                });
            });
        });
    }

    validateField(field) {
        const value = field.value.trim();
        const errors = [];

        // Campo obrigatório
        if (field.hasAttribute('required') && !value) {
            errors.push('Este campo é obrigatório');
        }

        // Email
        if (field.type === 'email' && value && !Utils.isValidEmail(value)) {
            errors.push('Email inválido');
        }

        // CPF
        if (field.dataset.validation === 'cpf' && value && !Utils.isValidCPF(value)) {
            errors.push('CPF inválido');
        }

        // Mostrar/ocultar erros
        this.showFieldErrors(field, errors);
    }

    showFieldErrors(field, errors) {
        // Remover erros anteriores
        const existingError = field.parentNode.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }

        field.classList.remove('error');

        if (errors.length > 0) {
            field.classList.add('error');
            
            const errorDiv = document.createElement('div');
            errorDiv.className = 'field-error';
            errorDiv.style.color = '#ef4444';
            errorDiv.style.fontSize = '0.8rem';
            errorDiv.style.marginTop = '4px';
            errorDiv.textContent = errors[0];
            
            field.parentNode.appendChild(errorDiv);
        }
    }

    updateNavigationState(activePage) {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.page === activePage) {
                item.classList.add('active');
            }
        });
    }

    addToHistory(page) {
        this.pageHistory.push(page);
        if (this.pageHistory.length > this.maxHistorySize) {
            this.pageHistory.shift();
        }
    }

    goBack() {
        if (this.pageHistory.length > 0) {
            const previousPage = this.pageHistory.pop();
            this.navigateTo(previousPage, false);
        }
    }

    // Métodos públicos para uso externo
    getCurrentPage() {
        return this.currentPage;
    }

    async refresh() {
        await this.refreshCurrentPage();
    }
}

// Instanciar o gerenciador quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.navigationManager = new NavigationManager();
});

// Atalhos de teclado globais
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + R para refresh
    if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        if (window.navigationManager) {
            window.navigationManager.refresh();
        }
    }

    // F5 para refresh
    if (e.key === 'F5') {
        e.preventDefault();
        if (window.navigationManager) {
            window.navigationManager.refresh();
        }
    }
});

console.log('🧭 Navigation.js carregado com lifecycle melhorado e navegação corrigida');