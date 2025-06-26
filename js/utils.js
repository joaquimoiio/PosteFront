// ================================
// API MULTI-TENANT - CORRIGIDO
// ================================
async function apiRequest(endpoint, options = {}) {
    const user = getCurrentUser();
    const cacheKey = `${endpoint}_${JSON.stringify(options)}_${user.type}`;
    
    // Cache simples por usuário
    if (AppState.cache.has(cacheKey) && !options.skipCache) {
        return AppState.cache.get(cacheKey);
    }
    
    const controller = new AbortController();
    const timeoutMs = AppState.isFirstRequest ? 60000 : 30000; // Aumentar timeout
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
        // Adicionar header de tenant automaticamente
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Tenant-ID': getTenantId(),
            ...options.headers
        };
        
        // Adicionar parâmetro de caminhão na URL se necessário
        let finalEndpoint = endpoint;
        if (!endpoint.includes('caminhao=') && !options.headers?.['X-Tenant-ID']) {
            const separator = endpoint.includes('?') ? '&' : '?';
            finalEndpoint = `${endpoint}${separator}caminhao=${getTenantId()}`;
        }
        
        const requestOptions = {
            ...options,
            signal: controller.signal,
            headers
        };
        
        // Log da requisição para debug
        console.log(`🔄 API Request: ${API_BASE}${finalEndpoint}`, {
            method: requestOptions.method || 'GET',
            headers: requestOptions.headers,
            tenant: getTenantId()
        });
        
        const response = await fetch(`${API_BASE}${finalEndpoint}`, requestOptions);
        
        clearTimeout(timeoutId);
        
        // Log da resposta para debug
        console.log(`📥 API Response: ${response.status} ${response.statusText}`, {
            url: `${API_BASE}${finalEndpoint}`,
            ok: response.ok
        });
        
        if (!response.ok) {
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            
            // Tentar extrair mensagem de erro do corpo da resposta
            try {
                const errorData = await response.json();
                if (errorData.message) {
                    errorMessage = errorData.message;
                } else if (errorData.error) {
                    errorMessage = errorData.error;
                }
            } catch (e) {
                // Se não conseguir fazer parse do JSON, usar mensagem padrão
                console.warn('Não foi possível fazer parse da resposta de erro:', e);
            }
            
            throw new Error(errorMessage);
        }
        
        // Marcar como conectado
        if (AppState.isFirstRequest) {
            AppState.isFirstRequest = false;
            sessionStorage.setItem('api-connected', 'true');
            console.log('✅ Primeira conexão com API estabelecida');
        }
        
        // Parse JSON se houver conteúdo
        let data = null;
        const contentLength = response.headers.get('Content-Length');
        const contentType = response.headers.get('Content-Type');
        
        if (response.status !== 204 && contentLength !== '0' && 
            contentType && contentType.includes('application/json')) {
            try {
                data = await response.json();
            } catch (e) {
                console.warn('Erro ao fazer parse do JSON da resposta:', e);
                // Para respostas sem conteúdo JSON, retornar objeto vazio
                data = {};
            }
        }
        
        // Cache resultado por usuário se não for nulo
        if (data !== null && !options.skipCache) {
            AppState.cache.set(cacheKey, data);
        }
        
        return data || {};
        
    } catch (error) {
        clearTimeout(timeoutId);
        
        console.error('❌ Erro na requisição API:', {
            url: `${API_BASE}${finalEndpoint}`,
            error: error.message,
            name: error.name
        });
        
        if (error.name === 'AbortError') {
            throw new Error('Tempo limite excedido. Verifique sua conexão e tente novamente.');
        }
        
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            throw new Error('Sem conexão com o servidor. Verifique sua internet.');
        }
        
        if (error.message.includes('HTTP 500')) {
            throw new Error('Erro interno do servidor. Tente novamente em alguns instantes.');
        }
        
        if (error.message.includes('HTTP 404')) {
            throw new Error('Recurso não encontrado.');
        }
        
        if (error.message.includes('HTTP 403')) {
            throw new Error('Acesso negado.');
        }
        
        // Para outros erros, manter a mensagem original
        throw error;
    }
}

// ================================
// MELHOR TRATAMENTO DE ALERTAS
// ================================
function showAlert(message, type = 'success', duration = 4000) {
    const container = document.getElementById('alert-container');
    if (!container) {
        console.warn('Container de alertas não encontrado, mostrando no console:', message);
        return;
    }
    
    // Remover alertas antigos do mesmo tipo para evitar spam
    const existingAlerts = container.querySelectorAll(`.alert-${type}`);
    existingAlerts.forEach(alert => {
        if (alert.textContent === message) {
            alert.remove();
        }
    });
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    
    // Adicionar ícone baseado no tipo
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    if (icons[type]) {
        alert.textContent = `${icons[type]} ${message}`;
    }
    
    container.appendChild(alert);
    
    // Auto-remover após o tempo especificado
    setTimeout(() => {
        if (alert.parentNode) {
            alert.style.opacity = '0';
            alert.style.transform = 'translateY(-10px)';
            setTimeout(() => alert.remove(), 300);
        }
    }, duration);
}

// ================================
// LOADING COM MELHOR UX
// ================================
function showLoading(show = true) {
    const loading = document.getElementById('loading') || 
                   document.getElementById('loading-overlay');
    if (loading) {
        if (show) {
            loading.style.display = 'flex';
            loading.style.opacity = '1';
        } else {
            loading.style.opacity = '0';
            setTimeout(() => {
                loading.style.display = 'none';
            }, 300);
        }
    }
}

// ================================
// VERIFICAÇÃO DE TENANT
// ================================
function getTenantId() {
    const user = getCurrentUser();
    const tenantId = user.type || 'vermelho';
    
    // Validar se o tenant é válido
    if (!['vermelho', 'branco', 'jefferson'].includes(tenantId)) {
        console.warn('Tenant inválido detectado:', tenantId, 'usando vermelho como padrão');
        return 'vermelho';
    }
    
    return tenantId;
}

// ================================
// DEBUG E MONITORAMENTO
// ================================
function enableDebugMode() {
    window.PosteSystemDebug = {
        apiRequests: [],
        errors: [],
        tenantChanges: [],
        
        logApiRequest: function(url, options, response) {
            this.apiRequests.push({
                timestamp: new Date().toISOString(),
                url,
                options,
                response: response?.status || 'pending',
                tenant: getTenantId()
            });
        },
        
        logError: function(error, context) {
            this.errors.push({
                timestamp: new Date().toISOString(),
                error: error.message,
                stack: error.stack,
                context,
                tenant: getTenantId()
            });
        },
        
        logTenantChange: function(oldTenant, newTenant) {
            this.tenantChanges.push({
                timestamp: new Date().toISOString(),
                from: oldTenant,
                to: newTenant
            });
        },
        
        getReport: function() {
            return {
                requests: this.apiRequests.slice(-10),
                errors: this.errors.slice(-5),
                tenantChanges: this.tenantChanges.slice(-5),
                currentTenant: getTenantId(),
                cacheSize: AppState.cache.size
            };
        },
        
        clearLogs: function() {
            this.apiRequests = [];
            this.errors = [];
            this.tenantChanges = [];
        }
    };
    
    console.log('🐛 Debug mode ativado. Use PosteSystemDebug.getReport() para ver logs');
}

// Ativar debug em desenvolvimento
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    enableDebugMode();
}

// ================================
// RETRY AUTOMÁTICO PARA REQUISIÇÕES
// ================================
async function apiRequestWithRetry(endpoint, options = {}, maxRetries = 2) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
        try {
            return await apiRequest(endpoint, options);
        } catch (error) {
            lastError = error;
            
            // Log do erro para debug
            if (window.PosteSystemDebug) {
                window.PosteSystemDebug.logError(error, { endpoint, attempt });
            }
            
            // Não fazer retry para alguns tipos de erro
            if (error.message.includes('HTTP 404') || 
                error.message.includes('HTTP 403') ||
                error.message.includes('Acesso negado')) {
                throw error;
            }
            
            // Se não é a última tentativa, aguardar antes de tentar novamente
            if (attempt <= maxRetries) {
                const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Backoff exponencial
                console.log(`🔄 Tentativa ${attempt} falhou, tentando novamente em ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    
    throw lastError;
}

// ================================
// MELHOR GESTÃO DE CACHE
// ================================
function clearCache(pattern = null) {
    const user = getCurrentUser();
    const keysToDelete = [];
    
    for (let key of AppState.cache.keys()) {
        const shouldDelete = pattern ? 
            key.includes(pattern) && key.includes(user.type) :
            key.includes(user.type);
            
        if (shouldDelete) {
            keysToDelete.push(key);
        }
    }
    
    keysToDelete.forEach(key => AppState.cache.delete(key));
    
    if (keysToDelete.length > 0) {
        console.log(`🗑️ Cache limpo: ${keysToDelete.length} entradas removidas`);
    }
}

// ================================
// VALIDAÇÕES MELHORADAS
// ================================
function validateRequired(value, fieldName) {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
        showAlert(`${fieldName} é obrigatório`, 'warning');
        return false;
    }
    return true;
}

function validateNumber(value, fieldName, min = 0) {
    const num = parseFloat(value);
    if (isNaN(num) || num <= min) {
        showAlert(`${fieldName} deve ser um número maior que ${min}`, 'warning');
        return false;
    }
    return true;
}

function validateDate(dateValue, fieldName) {
    if (!dateValue) {
        showAlert(`${fieldName} é obrigatória`, 'warning');
        return false;
    }
    
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
        showAlert(`${fieldName} deve ser uma data válida`, 'warning');
        return false;
    }
    
    return true;
}

// ================================
// DISPONIBILIZAR GLOBALMENTE - ATUALIZADO
// ================================
window.AppUtils = {
    // API com retry
    apiRequest: apiRequestWithRetry,
    apiRequestDirect: apiRequest, // Versão sem retry
    clearCache,
    
    // Usuário
    getCurrentUser,
    getTenantId,
    canAccessCaminhao,
    
    // Formatadores
    formatCurrency,
    formatDateBR,
    formatDateBRFixed,
    dateToInputValue,
    dateInputToString,
    stringToDateInput,
    getCurrentDateTime,
    getCurrentDateInput,
    isDateInRange,
    
    // DOM
    updateElement,
    showLoading,
    showAlert,
    
    // Filtros
    setDefaultDateFilters,
    setupFilters,
    debounce,
    
    // Labels
    getTipoLabel,
    getStatusLabel,
    
    // Validações melhoradas
    validateRequired,
    validateNumber,
    validateDate,
    
    // Export
    exportToCSV,
    
    // Modal
    showModal,
    closeModal,
    
    // Form
    resetForm,
    getFormData,
    
    // Auth
    checkAuth,
    logout,
    
    // Navigation
    getNavigationBasePath,
    
    // Debug
    enableDebugMode: enableDebugMode,
    getDebugReport: () => window.PosteSystemDebug?.getReport() || null
};

console.log('✅ Utils Multi-Tenant CORRIGIDO carregado');