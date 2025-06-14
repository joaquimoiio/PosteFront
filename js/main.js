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
    backendAvailable: false,
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
    // 1. Verificar se elementos necessários existem
    if (!verifyRequiredElements()) {
        console.error('❌ Elementos necessários não encontrados no DOM');
        return;
    }

    // 2. Configurar event listeners globais
    setupEventListeners();
    
    // 3. Verificar disponibilidade do backend
    AppState.backendAvailable = await checkBackendAvailability();
    
    // 4. Carregar página inicial
    await loadPage('dashboard');
    
    console.log('✅ Aplicação inicializada com sucesso');
}

// Verificar se elementos necessários existem
function verifyRequiredElements() {
    const requiredElements = [
        'page-content',
        'loading-overlay',
        'alert-container'
    ];
    
    for (const elementId of requiredElements) {
        if (!document.getElementById(elementId)) {
            console.error(`❌ Elemento necessário não encontrado: ${elementId}`);
            return false;
        }
    }
    
    return true;
}

// Verificar disponibilidade do backend
async function checkBackendAvailability() {
    try {
        const response = await fetch(CONFIG.API_BASE + '/postes', {
            method: 'GET',
            timeout: 5000
        });
        
        if (response.ok) {
            console.log('✅ Backend disponível');
            return true;
        } else {
            console.warn('⚠️ Backend respondeu com erro:', response.status);
            return false;
        }
    } catch (error) {
        console.warn('⚠️ Backend não disponível:', error.message);
        showAlert(
            'Backend não disponível. Verifique se o servidor está rodando na porta 8080.',
            'warning'
        );
        return false;
    }
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

    // Detectar erros de script
    window.addEventListener('error', (e) => {
        console.error('❌ Erro de script capturado:', e.error);
    });

    // Detectar promessas rejeitadas
    window.addEventListener('unhandledrejection', (e) => {
        console.error('❌ Promise rejeitada:', e.reason);
        e.preventDefault(); // Evitar que apareça no console
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
    if (AppState.isLoading) {
        console.log('⏳ Carregamento em andamento, ignorando nova solicitação');
        return;
    }
    
    console.log(`📄 Carregando página: ${pageName}`);
    
    try {
        showLoading(true);
        
        // Atualizar estado de navegação
        updateNavigation(pageName);
        
        // Limpar página anterior se necessário
        if (AppState.currentPage !== pageName) {
            await cleanupCurrentPage();
        }
        
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
        showAlert(`Erro ao carregar página ${pageName}: ${error.message}`, 'error');
        
        // Tentar carregar página de erro ou fallback
        await loadErrorPage(error);
        
    } finally {
        showLoading(false);
    }
}

// Limpar página atual antes de carregar nova
async function cleanupCurrentPage() {
    const currentPage = AppState.currentPage;
    
    console.log(`🧹 Limpando página: ${currentPage}`);
    
    // Executar função de cleanup específica da página se existir
    const cleanupFunction = window[`cleanup${capitalize(currentPage)}`];
    if (typeof cleanupFunction === 'function') {
        try {
            await cleanupFunction();
            console.log(`✅ Cleanup de ${currentPage} executado`);
        } catch (error) {
            console.error(`❌ Erro no cleanup de ${currentPage}:`, error);
        }
    }
    
    // Limpar timers globais
    clearPageTimers();
}

// Limpar timers da página
function clearPageTimers() {
    // Limpar intervalos e timeouts (números altos para garantir limpeza)
    for (let i = 1; i < 1000; i++) {
        clearInterval(i);
        clearTimeout(i);
    }
}

// Carregar conteúdo HTML da página
async function loadPageContent(pageName) {
    const pageUrl = CONFIG.PAGES[pageName];
    
    if (!pageUrl) {
        throw new Error(`Página ${pageName} não encontrada na configuração`);
    }
    
    const response = await fetch(pageUrl);
    
    if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
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
            console.log(`🚀 Executando ${initFunctionName}...`);
            await window[initFunctionName]();
        } else {
            console.warn(`⚠️ Função de inicialização ${initFunctionName} não encontrada`);
        }
        
    } catch (error) {
        console.warn(`⚠️ Script da página ${pageName} não encontrado ou erro na execução:`, error);
        
        // Para páginas críticas como dashboard, tentar carregar dados básicos
        if (pageName === 'dashboard') {
            await fallbackDashboardInit();
        }
    }
}

// Fallback para inicialização do dashboard
async function fallbackDashboardInit() {
    console.log('🔄 Executando inicialização fallback do dashboard...');
    
    try {
        // Mostrar dados básicos mesmo sem o script específico
        const elementos = [
            'total-venda-postes', 'valor-total-vendas', 'total-contribuicoes-extras',
            'total-despesas', 'lucro-total'
        ];
        
        elementos.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = 'R$ 0,00';
            }
        });
        
        showAlert('Dashboard carregado em modo básico', 'warning');
        
    } catch (error) {
        console.error('Erro no fallback do dashboard:', error);
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
        script.src = src + '?t=' + Date.now(); // Cache busting
        script.className = 'page-script';
        script.onload = resolve;
        script.onerror = () => reject(new Error(`Falha ao carregar script: ${src}`));
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

// Carregar página de erro
async function loadErrorPage(error) {
    const contentContainer = document.getElementById('page-content');
    if (contentContainer) {
        contentContainer.innerHTML = `
            <div class="error-page" style="text-align: center; padding: 40px 20px;">
                <div style="font-size: 4rem; margin-bottom: 20px;">❌</div>
                <h2>Erro ao Carregar Página</h2>
                <p style="color: #6b7280; margin: 20px 0;">${error.message}</p>
                <button class="btn btn-primary" onclick="location.reload()">
                    🔄 Recarregar Página
                </button>
                <button class="btn btn-secondary" onclick="loadPage('dashboard')">
                    🏠 Ir para Dashboard
                </button>
            </div>
        `;
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

// Função para verificar status do sistema
window.checkSystemStatus = async function() {
    const status = {
        backend: await checkBackendAvailability(),
        currentPage: AppState.currentPage,
        isLoading: AppState.isLoading
    };
    
    console.log('📊 Status do sistema:', status);
    return status;
};

// Função para recarregar página atual
window.reloadCurrentPage = async function() {
    console.log('🔄 Recarregando página atual...');
    
    try {
        await loadPage(AppState.currentPage, false);
        showAlert('Página recarregada com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao recarregar página:', error);
        showAlert('Erro ao recarregar página', 'error');
    }
};

// Função para diagnosticar problemas
window.diagnoseProblem = async function() {
    console.log('🔍 Iniciando diagnóstico...');
    
    const diagnostics = {
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        currentPage: AppState.currentPage,
        backendAvailable: await checkBackendAvailability(),
        elementsPresent: {
            pageContent: !!document.getElementById('page-content'),
            loadingOverlay: !!document.getElementById('loading-overlay'),
            alertContainer: !!document.getElementById('alert-container')
        },
        scriptsLoaded: Array.from(document.querySelectorAll('script')).map(s => s.src),
        errors: []
    };
    
    // Testar APIs básicas
    try {
        if (window.Utils) {
            diagnostics.utilsAvailable = true;
            // Testar função de cálculo
            const testResult = Utils.calcularLucros({}, []);
            diagnostics.calculationWorks = !!testResult;
        }
    } catch (error) {
        diagnostics.errors.push(`Utils error: ${error.message}`);
    }
    
    try {
        if (window.VendaService) {
            diagnostics.vendaServiceAvailable = true;
        }
    } catch (error) {
        diagnostics.errors.push(`VendaService error: ${error.message}`);
    }
    
    console.log('🔍 Diagnóstico completo:', diagnostics);
    
    // Mostrar resumo do diagnóstico
    const problemas = diagnostics.errors.length > 0 ? 
        diagnostics.errors.join(', ') : 'Nenhum problema detectado';
    
    showAlert(`Diagnóstico: ${problemas}`, diagnostics.errors.length > 0 ? 'warning' : 'success');
    
    return diagnostics;
};

// Função para reinicializar aplicação
window.reinitializeApp = async function() {
    console.log('🔄 Reinicializando aplicação...');
    
    try {
        // Limpar estado
        AppState.currentPage = 'dashboard';
        AppState.isLoading = false;
        AppState.data = { resumo: null, vendas: [], despesas: [], postes: [] };
        
        // Limpar timers
        clearPageTimers();
        
        // Remover scripts de página
        removePageScripts();
        
        // Reinicializar
        await initializeApp();
        
        showAlert('Aplicação reinicializada com sucesso!', 'success');
        
    } catch (error) {
        console.error('Erro ao reinicializar:', error);
        showAlert('Erro ao reinicializar aplicação', 'error');
    }
};

// Configurar atalhos de teclado para debug
document.addEventListener('keydown', (e) => {
    // Ctrl + Shift + D para diagnóstico
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        diagnoseProblem();
    }
    
    // Ctrl + Shift + R para reinicializar
    if (e.ctrlKey && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        reinitializeApp();
    }
    
    // Ctrl + Shift + S para status
    if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        checkSystemStatus();
    }
});

// Monitorar mudanças de conectividade
window.addEventListener('online', () => {
    console.log('🌐 Conexão restaurada');
    showAlert('Conexão com a internet restaurada', 'success');
    checkBackendAvailability();
});

window.addEventListener('offline', () => {
    console.log('📡 Conexão perdida');
    showAlert('Conexão com a internet perdida', 'warning');
});

// Exportar configurações para uso em outros scripts
window.CONFIG = CONFIG;
window.AppState = AppState;
window.loadPage = loadPage;

// Log de inicialização
console.log('✅ Main.js carregado - versão melhorada com diagnósticos');
console.log('🔧 Atalhos disponíveis:');
console.log('   Ctrl+Shift+D = Diagnóstico');
console.log('   Ctrl+Shift+R = Reinicializar');
console.log('   Ctrl+Shift+S = Status do sistema');