// Lifecycle Manager - Sistema para garantir carregamento correto dos dados
class PageLifecycleManager {
    constructor() {
        this.pageStates = new Map();
        this.loadingPromises = new Map();
        this.retryCount = new Map();
        this.maxRetries = 3;
        
        this.init();
    }
    
    init() {
        console.log('🔄 Lifecycle Manager inicializado');
        
        // Interceptar mudanças de visibilidade
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.onPageVisible();
            }
        });
        
        // Interceptar focus na janela
        window.addEventListener('focus', () => {
            this.onPageVisible();
        });
    }
    
    // Registrar estado de uma página
    registerPage(pageName, initialData = {}) {
        this.pageStates.set(pageName, {
            initialized: false,
            dataLoaded: false,
            lastUpdate: null,
            data: initialData,
            dependencies: ['Utils', 'VendaService', 'DespesaService', 'PosteService']
        });
        
        console.log(`📝 Página ${pageName} registrada`);
    }
    
    // Marcar página como inicializada
    markInitialized(pageName) {
        const state = this.pageStates.get(pageName);
        if (state) {
            state.initialized = true;
            state.dataLoaded = true;
            state.lastUpdate = new Date();
            
            console.log(`✅ Página ${pageName} marcada como inicializada`);
        }
    }
    
    // Verificar se página precisa ser recarregada
    needsReload(pageName) {
        const state = this.pageStates.get(pageName);
        
        if (!state || !state.initialized) {
            console.log(`🔄 ${pageName} precisa ser carregada (não inicializada)`);
            return true;
        }
        
        // Verificar dependências
        if (!this.checkDependencies(pageName)) {
            console.log(`🔄 ${pageName} precisa ser carregada (dependências em falta)`);
            return true;
        }
        
        // Verificar se dados são muito antigos (5 minutos para dashboard)
        if (pageName === 'dashboard' && state.lastUpdate) {
            const timeDiff = new Date() - state.lastUpdate;
            if (timeDiff > 5 * 60 * 1000) { // 5 minutos
                console.log(`🔄 ${pageName} precisa ser carregada (dados antigos)`);
                return true;
            }
        }
        
        return false;
    }
    
    // Verificar dependências da página
    checkDependencies(pageName) {
        const state = this.pageStates.get(pageName);
        if (!state || !state.dependencies) return true;
        
        for (const dep of state.dependencies) {
            if (!window[dep]) {
                console.warn(`❌ Dependência ${dep} não encontrada para ${pageName}`);
                return false;
            }
        }
        
        return true;
    }
    
    // Carregar página com retry automático
    async loadPageWithRetry(pageName, loadFunction) {
        const retryKey = `${pageName}_${Date.now()}`;
        
        if (this.loadingPromises.has(pageName)) {
            console.log(`⏳ ${pageName} já está carregando, aguardando...`);
            return await this.loadingPromises.get(pageName);
        }
        
        const loadPromise = this._executeLoadWithRetry(pageName, loadFunction, retryKey);
        this.loadingPromises.set(pageName, loadPromise);
        
        try {
            const result = await loadPromise;
            this.markInitialized(pageName);
            return result;
        } finally {
            this.loadingPromises.delete(pageName);
            this.retryCount.delete(retryKey);
        }
    }
    
    // Executar carregamento com retry
    async _executeLoadWithRetry(pageName, loadFunction, retryKey) {
        let lastError;
        let currentRetry = this.retryCount.get(retryKey) || 0;
        
        while (currentRetry < this.maxRetries) {
            try {
                console.log(`🔄 Tentativa ${currentRetry + 1} de carregar ${pageName}`);
                
                // Verificar e carregar dependências primeiro
                await this.ensureDependencies(pageName);
                
                // Executar função de carregamento
                const result = await loadFunction();
                
                console.log(`✅ ${pageName} carregado com sucesso na tentativa ${currentRetry + 1}`);
                return result;
                
            } catch (error) {
                lastError = error;
                currentRetry++;
                this.retryCount.set(retryKey, currentRetry);
                
                console.warn(`❌ Tentativa ${currentRetry} falhou para ${pageName}:`, error.message);
                
                if (currentRetry < this.maxRetries) {
                    // Delay exponencial: 1s, 2s, 4s
                    const delay = Math.pow(2, currentRetry - 1) * 1000;
                    console.log(`⏳ Aguardando ${delay}ms antes da próxima tentativa...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        console.error(`❌ Falha ao carregar ${pageName} após ${this.maxRetries} tentativas`);
        throw lastError;
    }
    
    // Garantir que dependências estão carregadas
    async ensureDependencies(pageName) {
        const state = this.pageStates.get(pageName);
        if (!state || !state.dependencies) return;
        
        const missingDeps = state.dependencies.filter(dep => !window[dep]);
        
        if (missingDeps.length > 0) {
            console.log(`📦 Carregando dependências para ${pageName}:`, missingDeps);
            
            // Carregar dependências básicas
            if (missingDeps.includes('Utils')) {
                await this.loadScript('js/utils.js');
            }
            
            if (missingDeps.some(dep => dep.includes('Service'))) {
                await this.loadScript('js/api.js');
            }
            
            // Verificar novamente
            const stillMissing = state.dependencies.filter(dep => !window[dep]);
            if (stillMissing.length > 0) {
                throw new Error(`Dependências ainda em falta: ${stillMissing.join(', ')}`);
            }
        }
    }
    
    // Carregar script
    async loadScript(src) {
        return new Promise((resolve, reject) => {
            // Verificar se já existe
            if (document.querySelector(`script[src*="${src.split('/').pop()}"]`)) {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = src + '?t=' + Date.now();
            script.onload = resolve;
            script.onerror = () => reject(new Error(`Falha ao carregar ${src}`));
            document.head.appendChild(script);
        });
    }
    
    // Chamado quando página fica visível
    onPageVisible() {
        console.log('👁️ Página ficou visível, verificando se precisa recarregar dados...');
        
        if (window.navigationManager) {
            const currentPage = window.navigationManager.getCurrentPage();
            
            if (this.needsReload(currentPage)) {
                console.log(`🔄 Recarregando ${currentPage} por mudança de visibilidade`);
                setTimeout(() => {
                    window.navigationManager.refresh();
                }, 500);
            }
        }
    }
    
    // Forçar recarregamento de uma página
    forceReload(pageName) {
        const state = this.pageStates.get(pageName);
        if (state) {
            state.initialized = false;
            state.dataLoaded = false;
            state.lastUpdate = null;
            
            console.log(`🔄 Forçando recarregamento de ${pageName}`);
        }
    }
    
    // Debug: mostrar estado de todas as páginas
    debugStatus() {
        console.log('📊 Estado das páginas:');
        for (const [pageName, state] of this.pageStates) {
            console.log(`  ${pageName}:`, {
                initialized: state.initialized,
                dataLoaded: state.dataLoaded,
                lastUpdate: state.lastUpdate,
                needsReload: this.needsReload(pageName)
            });
        }
    }
}

// Instância global
window.lifecycleManager = new PageLifecycleManager();

// Registrar páginas
window.lifecycleManager.registerPage('dashboard');
window.lifecycleManager.registerPage('vendas');
window.lifecycleManager.registerPage('despesas');
window.lifecycleManager.registerPage('postes');

// Funções auxiliares globais
window.ensurePageLoaded = async function(pageName) {
    if (window.lifecycleManager.needsReload(pageName)) {
        const initFunction = window[`init${Utils.capitalize(pageName)}Page`];
        if (typeof initFunction === 'function') {
            await window.lifecycleManager.loadPageWithRetry(pageName, initFunction);
        }
    }
};

window.forcePageReload = function(pageName) {
    window.lifecycleManager.forceReload(pageName);
    if (window.navigationManager) {
        window.navigationManager.refresh();
    }
};

// Interceptar funções de inicialização para registrar automaticamente
const originalInitDashboard = window.initDashboardPage;
if (originalInitDashboard) {
    window.initDashboardPage = async function() {
        try {
            await originalInitDashboard();
            window.lifecycleManager.markInitialized('dashboard');
        } catch (error) {
            console.error('Erro na inicialização do dashboard:', error);
            throw error;
        }
    };
}

// Adicionar atalho para debug
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'L') {
        e.preventDefault();
        window.lifecycleManager.debugStatus();
    }
});

console.log('✅ Lifecycle Manager carregado');
console.log('🔧 Atalho adicional: Ctrl+Shift+L = Status das páginas');