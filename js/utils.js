// ================================
// UTILS.JS COMPLETO - MULTI-TENANT
// Sistema de Postes com Logout
// ================================

// ================================
// CONSTANTES E CONFIGURAÇÕES
// ================================

// URL base da API
const API_BASE = 'https://posteback.onrender.com/api';

// Estado global da aplicação
const AppState = {
    cache: new Map(),
    isFirstRequest: sessionStorage.getItem('api-connected') !== 'true'
};

// ================================
// SISTEMA DE AUTENTICAÇÃO E LOGOUT
// ================================

// Função para realizar logout
function logout() {
    try {
        // Confirmar logout
        if (!confirm('Tem certeza que deseja sair do sistema?')) {
            return;
        }

        // Limpar todos os dados do localStorage relacionados ao sistema
        const keysToRemove = [
            'poste-system-logged-in',
            'poste-system-login-time',
            'poste-system-user-type',
            'poste-system-username',
            'poste-system-display-name',
            'poste-system-remember',
            'poste-system-theme',
            'api-connected'
        ];

        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
        });

        // Limpar sessionStorage
        sessionStorage.clear();

        // Limpar cache da aplicação
        if (AppState && AppState.cache) {
            AppState.cache.clear();
        }

        // Mostrar mensagem de logout
        showAlert('Logout realizado com sucesso! Redirecionando...', 'success', 2000);

        // Log para debug
        console.log('🚪 Logout realizado - dados limpos');

        // Redirecionar para página de login após um pequeno delay
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);

    } catch (error) {
        console.error('Erro durante logout:', error);
        // Forçar redirecionamento mesmo em caso de erro
        window.location.href = 'index.html';
    }
}

// Função para verificar sessão expirada
function checkSessionExpiry() {
    const isLoggedIn = localStorage.getItem('poste-system-logged-in');
    const loginTime = localStorage.getItem('poste-system-login-time');
    
    if (isLoggedIn === 'true' && loginTime) {
        const loginDate = new Date(loginTime);
        const now = new Date();
        const timeDifference = now - loginDate;
        
        // Sessão expira em 8 horas (8 * 60 * 60 * 1000 ms)
        const maxSessionTime = 8 * 60 * 60 * 1000;
        
        if (timeDifference > maxSessionTime) {
            showAlert('Sua sessão expirou. Faça login novamente.', 'warning', 3000);
            
            setTimeout(() => {
                logout();
            }, 2000);
            
            return false;
        }
    }
    
    return true;
}

// Função para verificar autenticação
function checkAuth() {
    const isLoggedIn = localStorage.getItem('poste-system-logged-in');
    const userType = localStorage.getItem('poste-system-user-type');
    
    if (isLoggedIn !== 'true' || !userType) {
        console.log('🔒 Usuário não autenticado, redirecionando...');
        window.location.href = 'index.html';
        return false;
    }
    
    // Verificar se a sessão não expirou
    if (!checkSessionExpiry()) {
        return false;
    }
    
    return true;
}

// Função para obter informações do usuário atual
function getCurrentUser() {
    return {
        isLoggedIn: localStorage.getItem('poste-system-logged-in') === 'true',
        type: localStorage.getItem('poste-system-user-type'),
        username: localStorage.getItem('poste-system-username'),
        displayName: localStorage.getItem('poste-system-display-name'),
        loginTime: localStorage.getItem('poste-system-login-time')
    };
}

// Função para verificar se o usuário pode acessar um caminhão específico
function canAccessCaminhao(caminhao) {
    const user = getCurrentUser();
    
    if (!user.isLoggedIn) {
        return false;
    }
    
    // Jefferson pode acessar todos os caminhões
    if (user.type === 'jefferson') {
        return true;
    }
    
    // Outros usuários só podem acessar seu próprio caminhão
    return user.type === caminhao;
}

// Função para criar e inserir o botão de logout
function createLogoutButton() {
    // Verificar se o usuário está logado
    const isLoggedIn = localStorage.getItem('poste-system-logged-in');
    const userType = localStorage.getItem('poste-system-user-type');
    
    if (isLoggedIn !== 'true' || !userType) {
        return; // Não criar botão se não estiver logado
    }

    // Verificar se já existe um botão de logout
    const existingButton = document.getElementById('logout-button');
    if (existingButton) {
        return; // Já existe
    }

    // Criar o botão de logout
    const logoutButton = document.createElement('button');
    logoutButton.id = 'logout-button';
    logoutButton.className = 'logout-button';
    logoutButton.title = 'Sair do sistema';
    logoutButton.innerHTML = '🚪';
    logoutButton.onclick = logout;

    // Adicionar o botão ao body
    document.body.appendChild(logoutButton);

    console.log('🚪 Botão de logout criado');
}

// Função para criar botão de alternância de tema (dark/light)
function createThemeToggle() {
    // Verificar se já existe
    const existingToggle = document.getElementById('theme-toggle');
    if (existingToggle) {
        return;
    }

    const themeToggle = document.createElement('button');
    themeToggle.id = 'theme-toggle';
    themeToggle.className = 'theme-toggle';
    themeToggle.title = 'Alternar tema';
    
    // Verificar tema atual
    const currentTheme = localStorage.getItem('poste-system-theme') || 'light';
    themeToggle.innerHTML = currentTheme === 'dark' ? '☀️' : '🌙';
    
    // Aplicar tema atual
    document.documentElement.setAttribute('data-theme', currentTheme);
    
    themeToggle.onclick = function() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('poste-system-theme', newTheme);
        
        themeToggle.innerHTML = newTheme === 'dark' ? '☀️' : '🌙';
        
        console.log(`🎨 Tema alterado para: ${newTheme}`);
    };

    document.body.appendChild(themeToggle);
}

// Função para exibir informações do usuário logado
function displayUserInfo() {
    const user = getCurrentUser();
    
    if (!user.isLoggedIn) {
        return;
    }
    
    // Atualizar título da página se houver
    const displayName = user.displayName || user.username || 'Usuário';
    
    // Log para debug
    console.log(`👤 Usuário logado: ${displayName} (${user.type})`);
}

// Função para inicializar sistema de autenticação
function initAuthSystem() {
    // Só inicializar se não estivermos na página de login
    if (window.location.pathname.includes('index.html') || 
        window.location.pathname === '/' || 
        window.location.pathname === '') {
        return;
    }
    
    // Verificar autenticação
    if (!checkAuth()) {
        return;
    }
    
    // Criar botões da interface
    createLogoutButton();
    createThemeToggle();
    displayUserInfo();
    
    // Verificar sessão periodicamente (a cada 5 minutos)
    setInterval(checkSessionExpiry, 5 * 60 * 1000);
    
    console.log('🔐 Sistema de autenticação inicializado');
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
// FUNÇÕES DE FORMATAÇÃO
// ================================

function formatCurrency(value) {
    if (!value && value !== 0) return 'R$ 0,00';
    
    const num = parseFloat(value);
    if (isNaN(num)) return 'R$ 0,00';
    
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(num);
}

function formatDateBR(dateString, includeTime = false) {
    if (!dateString) return '-';
    
    try {
        const date = new Date(dateString);
        
        if (isNaN(date.getTime())) return '-';
        
        const options = {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            timeZone: 'America/Sao_Paulo'
        };
        
        if (includeTime) {
            options.hour = '2-digit';
            options.minute = '2-digit';
        }
        
        return date.toLocaleString('pt-BR', options);
    } catch (error) {
        console.error('Erro ao formatar data:', error);
        return '-';
    }
}

function formatDateBRFixed(dateString) {
    if (!dateString) return '-';
    
    try {
        // Se for apenas uma data (YYYY-MM-DD), adicionar horário padrão
        if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
            dateString += 'T12:00:00';
        }
        
        const date = new Date(dateString);
        
        if (isNaN(date.getTime())) return '-';
        
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch (error) {
        console.error('Erro ao formatar data:', error);
        return '-';
    }
}

// ================================
// FUNÇÕES DE DATA
// ================================

function dateToInputValue(date) {
    if (!date) return '';
    
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    return d.toISOString().split('T')[0];
}

function dateInputToString(inputValue) {
    if (!inputValue) return null;
    return inputValue;
}

function stringToDateInput(dateString) {
    if (!dateString) return '';
    
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        
        return date.toISOString().split('T')[0];
    } catch (error) {
        console.error('Erro ao converter data:', error);
        return '';
    }
}

function getCurrentDateTime() {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localTime = new Date(now.getTime() - offset);
    return localTime.toISOString().slice(0, 16);
}

function getCurrentDateInput() {
    return new Date().toISOString().split('T')[0];
}

function isDateInRange(dateToCheck, startDate, endDate) {
    if (!dateToCheck) return false;
    
    const checkDate = new Date(dateToCheck);
    
    if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        return checkDate >= start && checkDate <= end;
    } else if (startDate) {
        const start = new Date(startDate);
        return checkDate >= start;
    } else if (endDate) {
        const end = new Date(endDate);
        return checkDate <= end;
    }
    
    return true;
}

// ================================
// FUNÇÕES DOM
// ================================

function updateElement(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
    }
}

function setDefaultDateFilters(startInputId, endInputId) {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const startInput = document.getElementById(startInputId);
    const endInput = document.getElementById(endInputId);
    
    if (startInput) {
        startInput.value = dateToInputValue(firstDayOfMonth);
    }
    
    if (endInput) {
        endInput.value = dateToInputValue(today);
    }
}

// ================================
// SISTEMA DE MODAL
// ================================

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        // Focar no primeiro input do modal
        const firstInput = modal.querySelector('input, select, textarea');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }
}

function closeModal(modalId) {
    if (modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    } else {
        // Fechar todos os modais visíveis
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }
}

// ================================
// FUNÇÕES DE FILTRO
// ================================

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function setupFilters(filterMap, applyFunction) {
    Object.entries(filterMap).forEach(([elementId, filterKey]) => {
        const element = document.getElementById(elementId);
        if (element) {
            const debouncedApply = debounce(() => {
                // Atualizar filtros antes de aplicar
                if (typeof window[`${applyFunction.name.replace('apply', 'update')}Filters`] === 'function') {
                    window[`${applyFunction.name.replace('apply', 'update')}Filters`]();
                }
                applyFunction();
            }, 300);
            
            element.addEventListener('input', debouncedApply);
            element.addEventListener('change', debouncedApply);
        }
    });
}

// ================================
// LABELS E UTILITÁRIOS
// ================================

function getTipoLabel(tipo) {
    const labels = {
        'E': '📈 Extra',
        'V': '🛒 Normal',
        'L': '🏪 Loja'
    };
    return labels[tipo] || tipo;
}

function getStatusLabel(status) {
    const labels = {
        'FUNCIONARIO': '👥 Funcionário',
        'OUTRAS': '📋 Outras'
    };
    return labels[status] || status;
}

// ================================
// EXPORTAÇÃO CSV
// ================================

function exportToCSV(data, filename) {
    if (!data || data.length === 0) {
        showAlert('Nenhum dado para exportar', 'warning');
        return;
    }
    
    try {
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => 
                headers.map(header => {
                    const value = row[header];
                    // Escapar aspas e envolver em aspas se necessário
                    if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                        return `"${value.replace(/"/g, '""')}"`;
                    }
                    return value;
                }).join(',')
            )
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `${filename}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showAlert('Arquivo exportado com sucesso!', 'success');
        }
    } catch (error) {
        console.error('Erro ao exportar CSV:', error);
        showAlert('Erro ao exportar arquivo', 'error');
    }
}

// ================================
// FORM UTILITIES
// ================================

function resetForm(formId) {
    const form = document.getElementById(formId);
    if (form) {
        form.reset();
    }
}

function getFormData(formId) {
    const form = document.getElementById(formId);
    if (!form) return {};
    
    const formData = new FormData(form);
    const data = {};
    
    for (let [key, value] of formData.entries()) {
        data[key] = value;
    }
    
    return data;
}

// ================================
// NAVIGATION UTILITIES
// ================================

function getNavigationBasePath() {
    const user = getCurrentUser();
    
    switch (user.type) {
        case 'vermelho':
            return 'dashboard.html';
        case 'branco':
            return 'dashboard-branco.html';
        case 'jefferson':
            return 'dashboard-jefferson.html';
        default:
            return 'index.html';
    }
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
// AUTO-INICIALIZAÇÃO
// ================================

// Auto-inicializar quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuthSystem);
} else {
    initAuthSystem();
}

// ================================
// DISPONIBILIZAR GLOBALMENTE - COMPLETO
// ================================
window.AppUtils = {
    // API com retry
    apiRequest: apiRequestWithRetry,
    apiRequestDirect: apiRequest, // Versão sem retry
    clearCache,
    
    // Autenticação e Logout
    logout,
    checkAuth,
    checkSessionExpiry,
    initAuthSystem,
    createLogoutButton,
    createThemeToggle,
    
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
    
    // Navigation
    getNavigationBasePath,
    
    // Debug
    enableDebugMode: enableDebugMode,
    getDebugReport: () => window.PosteSystemDebug?.getReport() || null
};

// ================================
// EVENTOS GLOBAIS E LISTENERS
// ================================

// Listener para detectar mudanças de tema do sistema
if (window.matchMedia) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', (e) => {
        // Só aplicar automaticamente se o usuário não tiver definido uma preferência
        const userTheme = localStorage.getItem('poste-system-theme');
        if (!userTheme) {
            const newTheme = e.matches ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
            
            const themeToggle = document.getElementById('theme-toggle');
            if (themeToggle) {
                themeToggle.innerHTML = newTheme === 'dark' ? '☀️' : '🌙';
            }
            
            console.log(`🎨 Tema do sistema alterado automaticamente para: ${newTheme}`);
        }
    });
}

// Listener para detectar quando o usuário sai da página (logout automático em caso de fechamento)
window.addEventListener('beforeunload', (e) => {
    // Limpar cache temporário ao sair
    if (AppState && AppState.cache) {
        // Manter apenas dados essenciais no cache
        const essentialKeys = [];
        for (let key of AppState.cache.keys()) {
            if (!key.includes('temp') && !key.includes('search')) {
                essentialKeys.push(key);
            }
        }
        
        // Limpar chaves não essenciais
        AppState.cache.clear();
        console.log('🧹 Cache temporário limpo ao sair da página');
    }
});

// Listener para detectar conectividade de rede
window.addEventListener('online', () => {
    console.log('🌐 Conexão com internet restaurada');
    showAlert('Conexão restaurada', 'success', 2000);
});

window.addEventListener('offline', () => {
    console.log('🚫 Conexão com internet perdida');
    showAlert('Sem conexão com a internet', 'warning', 3000);
});

// ================================
// UTILITÁRIOS ADICIONAIS
// ================================

// Função para detectar se é dispositivo móvel
function isMobileDevice() {
    return window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Função para detectar se está em modo standalone (PWA)
function isStandalone() {
    return window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
}

// Função para copiar texto para clipboard
async function copyToClipboard(text) {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            showAlert('Copiado para área de transferência', 'success', 2000);
            return true;
        } else {
            // Fallback para navegadores mais antigos
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'absolute';
            textarea.style.left = '-999999px';
            document.body.appendChild(textarea);
            textarea.select();
            const success = document.execCommand('copy');
            document.body.removeChild(textarea);
            
            if (success) {
                showAlert('Copiado para área de transferência', 'success', 2000);
                return true;
            }
        }
    } catch (error) {
        console.error('Erro ao copiar para clipboard:', error);
        showAlert('Erro ao copiar texto', 'error');
        return false;
    }
}

// Função para gerar ID único
function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Função para scroll suave para elemento
function scrollToElement(elementId, offset = 0) {
    const element = document.getElementById(elementId);
    if (element) {
        const targetPosition = element.offsetTop - offset;
        window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
        });
    }
}

// Função para verificar se elemento está visível na tela
function isElementInViewport(element) {
    if (typeof element === 'string') {
        element = document.getElementById(element);
    }
    
    if (!element) return false;
    
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

// ================================
// PERFORMANCE E OTIMIZAÇÕES
// ================================

// Função para lazy loading de imagens
function setupLazyLoading() {
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazy');
                    imageObserver.unobserve(img);
                }
            });
        });

        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    }
}

// Função para debounce de resize
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        // Recalcular layouts responsivos se necessário
        console.log('📱 Viewport redimensionado:', window.innerWidth + 'x' + window.innerHeight);
    }, 250);
});

// ================================
// ADICIONAR UTILITÁRIOS AO AppUtils
// ================================

// Estender AppUtils com funções adicionais
Object.assign(window.AppUtils, {
    // Utilitários de device
    isMobileDevice,
    isStandalone,
    
    // Clipboard
    copyToClipboard,
    
    // Utilitários gerais
    generateUniqueId,
    scrollToElement,
    isElementInViewport,
    
    // Performance
    setupLazyLoading
});

// ================================
// INICIALIZAÇÃO FINAL
// ================================

// Aplicar tema salvo na inicialização
const savedTheme = localStorage.getItem('poste-system-theme');
if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
} else {
    // Aplicar tema baseado na preferência do sistema se não houver tema salvo
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
}

// Log final
console.log('✅ Utils Multi-Tenant COMPLETO carregado');
console.log('🔧 Funcionalidades disponíveis:', Object.keys(window.AppUtils));
console.log('👤 Usuário atual:', getCurrentUser());
console.log('🏢 Tenant ID:', getTenantId());

// ================================
// HEALTH CHECK DO SISTEMA
// ================================

// Função para verificar saúde do sistema
function systemHealthCheck() {
    const health = {
        timestamp: new Date().toISOString(),
        user: getCurrentUser(),
        tenant: getTenantId(),
        cacheSize: AppState.cache.size,
        isOnline: navigator.onLine,
        isMobile: isMobileDevice(),
        theme: document.documentElement.getAttribute('data-theme'),
        viewport: {
            width: window.innerWidth,
            height: window.innerHeight
        }
    };
    
    return health;
}

// Disponibilizar health check
window.AppUtils.systemHealthCheck = systemHealthCheck;

// Executar health check inicial
console.log('🏥 System Health Check:', systemHealthCheck());