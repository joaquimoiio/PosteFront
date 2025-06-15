// Main.js - Versão corrigida com melhor gerenciamento de lifecycle
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
    },
    pageInitialized: {
        dashboard: false,
        vendas: false,
        despesas: false,
        postes: false
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
    
    // 4. Não carregar página inicial aqui - deixar para o NavigationManager
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
    // Escape key para fechar modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAllModals();
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
        isLoading: AppState.isLoading,
        pageInitialized: AppState.pageInitialized
    };
    
    console.log('📊 Status do sistema:', status);
    return status;
};

// Função para recarregar página atual
window.reloadCurrentPage = async function() {
    console.log('🔄 Recarregando página atual...');
    
    try {
        if (window.navigationManager) {
            await window.navigationManager.refresh();
            showAlert('Página recarregada com sucesso!', 'success');
        } else {
            location.reload();
        }
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
        pageInitialized: AppState.pageInitialized,
        elementsPresent: {
            pageContent: !!document.getElementById('page-content'),
            loadingOverlay: !!document.getElementById('loading-overlay'),
            alertContainer: !!document.getElementById('alert-container')
        },
        scriptsLoaded: Array.from(document.querySelectorAll('script')).map(s => s.src),
        navigationManager: !!window.navigationManager,
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
        AppState.pageInitialized = {
            dashboard: false,
            vendas: false,
            despesas: false,
            postes: false
        };
        
        // Limpar timers
        clearPageTimers();
        
        // Remover scripts de página
        removePageScripts();
        
        // Reinicializar
        await initializeApp();
        
        // Recriar navigation manager
        if (window.navigationManager) {
            window.navigationManager = new NavigationManager();
        }
        
        showAlert('Aplicação reinicializada com sucesso!', 'success');
        
    } catch (error) {
        console.error('Erro ao reinicializar:', error);
        showAlert('Erro ao reinicializar aplicação', 'error');
    }
};

// Limpar timers da página
function clearPageTimers() {
    // Limpar intervalos e timeouts (números altos para garantir limpeza)
    for (let i = 1; i < 1000; i++) {
        clearInterval(i);
        clearTimeout(i);
    }
}

// Remover scripts específicos de páginas
function removePageScripts() {
    document.querySelectorAll('.page-script').forEach(script => {
        script.remove();
    });
}

// Função para marcar página como inicializada
window.markPageInitialized = function(pageName) {
    AppState.pageInitialized[pageName] = true;
    console.log(`✅ Página ${pageName} marcada como inicializada`);
};

// Função para verificar se página foi inicializada
window.isPageInitialized = function(pageName) {
    return AppState.pageInitialized[pageName] || false;
};

// Função para resetar estado de inicialização de uma página
window.resetPageInitialization = function(pageName) {
    AppState.pageInitialized[pageName] = false;
    console.log(`🔄 Estado de inicialização de ${pageName} resetado`);
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

// Função para garantir que Utils está disponível
window.ensureUtilsLoaded = function() {
    if (!window.Utils) {
        console.warn('⚠️ Utils não carregado, carregando...');
        
        // Tentar carregar utils.js
        const script = document.createElement('script');
        script.src = 'js/utils.js?t=' + Date.now();
        script.onload = () => {
            console.log('✅ Utils carregado com sucesso');
        };
        script.onerror = () => {
            console.error('❌ Falha ao carregar Utils');
        };
        document.head.appendChild(script);
    }
};

// Função para garantir que serviços de API estão disponíveis
window.ensureAPIServicesLoaded = function() {
    const requiredServices = ['VendaService', 'DespesaService', 'PosteService'];
    const missingServices = requiredServices.filter(service => !window[service]);
    
    if (missingServices.length > 0) {
        console.warn('⚠️ Serviços de API em falta:', missingServices);
        
        // Tentar carregar api.js
        const script = document.createElement('script');
        script.src = 'js/api.js?t=' + Date.now();
        script.onload = () => {
            console.log('✅ Serviços de API carregados');
        };
        script.onerror = () => {
            console.error('❌ Falha ao carregar serviços de API');
        };
        document.head.appendChild(script);
    }
};

// Executar verificações de dependências
setTimeout(() => {
    ensureUtilsLoaded();
    ensureAPIServicesLoaded();
}, 1000);

// Exportar configurações para uso em outros scripts
window.CONFIG = CONFIG;
window.AppState = AppState;
window.showLoading = showLoading;

// Log de inicialização
console.log('✅ Main.js carregado - versão com lifecycle melhorado');
console.log('🔧 Atalhos disponíveis:');
console.log('   Ctrl+Shift+D = Diagnóstico');
console.log('   Ctrl+Shift+R = Reinicializar');
console.log('   Ctrl+Shift+S = Status do sistema');
console.log('   Alt+1/2/3/4 = Navegar entre páginas');