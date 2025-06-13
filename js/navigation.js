// Gerenciador de Navegação
class NavigationManager {
    constructor() {
        this.currentPage = 'dashboard';
        this.pageHistory = [];
        this.maxHistorySize = 10;
        
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
                if (page && page !== this.currentPage) {
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
            if (e.state && e.state.page) {
                this.loadPageContent(e.state.page, false);
            }
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
        if (this.currentPage === page) return;

        console.log(`🧭 Navegando para: ${page}`);

        try {
            // Verificar se pode sair da página atual
            if (await this.canLeavePage()) {
                await this.loadPageContent(page, addToHistory);
            }
        } catch (error) {
            console.error('Erro na navegação:', error);
            showAlert('Erro ao navegar para a página', 'error');
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

            // Atualizar estado
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
        const response = await fetch(pageUrl);
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
            script.src = `js/${page}.js`;
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
        // Executar função de inicialização se existir
        const initFunction = window[`init${Utils.capitalize(page)}Page`];
        if (typeof initFunction === 'function') {
            await initFunction();
        }

        // Configurar máscaras de input
        this.setupInputMasks();

        // Configurar validação de formulários
        this.setupFormValidation();

        // Configurar tooltips
        this.setupTooltips();
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

    setupTooltips() {
        document.querySelectorAll('[data-tooltip]').forEach(element => {
            element.addEventListener('mouseenter', (e) => {
                this.showTooltip(e.target, e.target.dataset.tooltip);
            });

            element.addEventListener('mouseleave', () => {
                this.hideTooltip();
            });
        });
    }

    showTooltip(element, text) {
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = text;
        tooltip.style.cssText = `
            position: absolute;
            background: #1f2937;
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 0.8rem;
            z-index: 1000;
            pointer-events: none;
            white-space: nowrap;
        `;

        document.body.appendChild(tooltip);

        const rect = element.getBoundingClientRect();
        tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
        tooltip.style.top = rect.top - tooltip.offsetHeight - 8 + 'px';

        this.currentTooltip = tooltip;
    }

    hideTooltip() {
        if (this.currentTooltip) {
            this.currentTooltip.remove();
            this.currentTooltip = null;
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

    refresh() {
        this.navigateTo(this.currentPage, false);
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