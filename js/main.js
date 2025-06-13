// Configuração global da aplicação
const CONFIG = {
    API_BASE: 'http://localhost:8080/api',
    PAGES: {
        dashboard: 'pages/dashboard.html',
        vendas: 'pages/vendas.html',
        despesas: 'pages/despesas.html',
        postes: 'pages/postes.html'
    }
};

// Estado global da aplicação
const AppState = {
    currentPage: 'dashboard',
    isLoading: false,
    data: {
        resumo: null,
        vendas: [],
        despesas: [],
        postes: []
    }
};

// Inicialização da aplicação
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Iniciando aplicação...');
    
    try {
        await initializeApp();
    } catch (error) {
        console.error('❌ Erro na inicialização:', error);
        showAlert('Erro ao inicializar aplicação', 'error');
    }
});

// Função principal de inicialização
async function initializeApp() {
    setupEventListeners();
    await loadPage('dashboard');
    console.log('✅ Aplicação inicializada com sucesso');
}

// Configurar event listeners globais
function setupEventListeners() {
    // Navigation buttons
    document.querySelectorAll('.nav-item').forEach(button => {
        button.addEventListener('click', handleNavigation);
    });

    // Escape key para fechar modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });

    // Handle browser back/forward
    window.addEventListener('popstate', (e) => {
        if (e.state && e.state.page) {
            loadPage(e.state.page, false);
        }
    });
}

// Gerenciar navegação entre páginas
async function handleNavigation(event) {
    const targetPage = event.currentTarget.dataset.page;
    
    if (targetPage && targetPage !== AppState.currentPage) {
        await loadPage(targetPage);
    }
}

// Carregar página dinamicamente
async function loadPage(pageName, updateHistory = true) {
    if (AppState.isLoading) return;
    
    console.log(`📄 Carregando página: ${pageName}`);
    
    try {
        showLoading(true);
        
        // Atualizar estado de navegação
        updateNavigation(pageName);
        
        // Carregar conteúdo da página
        const pageContent = await loadPageContent(pageName);
        
        // Inserir conteúdo
        const contentContainer = document.getElementById('page-content');
        contentContainer.innerHTML = pageContent;
        
        // Atualizar histórico do navegador
        if (updateHistory) {
            history.pushState({ page: pageName }, '', `#${pageName}`);
        }
        
        // Executar scripts específicos da página
        await executePageScripts(pageName);
        
        AppState.currentPage = pageName;
        
        console.log(`✅ Página ${pageName} carregada com sucesso`);
        
    } catch (error) {
        console.error(`❌ Erro ao carregar página ${pageName}:`, error);
        showAlert(`Erro ao carregar página ${pageName}`, 'error');
    } finally {
        showLoading(false);
    }
}

// Carregar conteúdo HTML da página
async function loadPageContent(pageName) {
    const pageUrl = CONFIG.PAGES[pageName];
    
    if (!pageUrl) {
        throw new Error(`Página ${pageName} não encontrada`);
    }
    
    const response = await fetch(pageUrl);
    
    if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
    }
    
    return await response.text();
}

// Executar scripts específicos da página
async function executePageScripts(pageName) {
    // Remove scripts anteriores para evitar conflitos
    removePageScripts();
    
    // Carregar script específico da página
    const scriptUrl = `js/${pageName}.js`;
    
    try {
        await loadScript(scriptUrl);
        
        // Executar função de inicialização da página se existir
        const initFunctionName = `init${capitalize(pageName)}Page`;
        if (typeof window[initFunctionName] === 'function') {
            await window[initFunctionName]();
        }
        
    } catch (error) {
        console.warn(`⚠️ Script da página ${pageName} não encontrado ou erro na execução:`, error);
    }
}

// Carregar script dinamicamente
function loadScript(src) {
    return new Promise((resolve, reject) => {
        // Verificar se o script já foi carregado
        if (document.querySelector(`script[src="${src}"]`)) {
            resolve();
            return;
        }
        
        const script = document.createElement('script');
        script.src = src;
        script.className = 'page-script';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Remover scripts específicos de páginas
function removePageScripts() {
    document.querySelectorAll('.page-script').forEach(script => {
        script.remove();
    });
}

// Atualizar estado visual da navegação
function updateNavigation(activePage) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        
        if (item.dataset.page === activePage) {
            item.classList.add('active');
        }
    });
}

// Mostrar/ocultar loading
function showLoading(show) {
    const loadingOverlay = document.getElementById('loading-overlay');
    AppState.isLoading = show;
    
    if (loadingOverlay) {
        loadingOverlay.style.display = show ? 'flex' : 'none';
    }
}

// Fechar todos os modals
function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
}

// Funções utilitárias
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Função global para mostrar alertas
window.showAlert = function(message, type = 'success', duration = 5000) {
    const alertContainer = document.getElementById('alert-container');
    
    if (!alertContainer) {
        console.warn('Container de alertas não encontrado');
        return;
    }
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    
    alertContainer.appendChild(alert);
    
    // Auto-remover após o tempo especificado
    setTimeout(() => {
        if (alert.parentNode) {
            alert.remove();
        }
    }, duration);
    
    console.log(`📢 Alerta: ${message} (${type})`);
};

// Função global para fechar modal
window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
};

// Exportar configurações para uso em outros scripts
window.CONFIG = CONFIG;
window.AppState = AppState;