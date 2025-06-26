// utils.js - Utilitários Multi-Tenant COMPLETO
// Sistema de Postes com suporte a Caminhão Vermelho, Branco e Jefferson

const API_BASE = 'https://posteback.onrender.com/api';

// ================================
// ESTADO GLOBAL MULTI-TENANT
// ================================
const AppState = {
    isFirstRequest: !sessionStorage.getItem('api-connected'),
    cache: new Map(),
    currentUser: null
};

// ================================
// GERENCIAMENTO DE USUÁRIO
// ================================
function getCurrentUser() {
    if (!AppState.currentUser) {
        AppState.currentUser = {
            type: localStorage.getItem('poste-system-user-type'),
            username: localStorage.getItem('poste-system-username'),
            displayName: localStorage.getItem('poste-system-display-name'),
            isLoggedIn: localStorage.getItem('poste-system-logged-in') === 'true'
        };
    }
    return AppState.currentUser;
}

function getTenantId() {
    const user = getCurrentUser();
    return user.type || 'vermelho'; // Default para vermelho
}

function canAccessCaminhao(caminhaoType) {
    const user = getCurrentUser();
    // Jefferson pode acessar ambos, outros só podem acessar o próprio
    return user.type === 'jefferson' || user.type === caminhaoType;
}

// ================================
// API MULTI-TENANT
// ================================
async function apiRequest(endpoint, options = {}) {
    const user = getCurrentUser();
    const cacheKey = `${endpoint}_${JSON.stringify(options)}_${user.type}`;
    
    // Cache simples por usuário
    if (AppState.cache.has(cacheKey) && !options.skipCache) {
        return AppState.cache.get(cacheKey);
    }
    
    const controller = new AbortController();
    const timeoutMs = AppState.isFirstRequest ? 60000 : 15000;
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
        if (!endpoint.includes('caminhao=') && !endpoint.includes('X-Tenant-ID')) {
            const separator = endpoint.includes('?') ? '&' : '?';
            finalEndpoint = `${endpoint}${separator}caminhao=${getTenantId()}`;
        }
        
        const response = await fetch(`${API_BASE}${finalEndpoint}`, {
            ...options,
            signal: controller.signal,
            headers
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        // Marcar como conectado
        if (AppState.isFirstRequest) {
            AppState.isFirstRequest = false;
            sessionStorage.setItem('api-connected', 'true');
        }
        
        // Parse JSON se houver conteúdo
        let data = null;
        if (response.status !== 204 && response.headers.get('Content-Length') !== '0') {
            try {
                data = await response.json();
            } catch (e) {
                // Ignorar erro de JSON se não houver conteúdo
            }
        }
        
        // Cache resultado por usuário
        if (data !== null) {
            AppState.cache.set(cacheKey, data);
        }
        
        return data;
        
    } catch (error) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
            throw new Error('Tempo limite excedido. Tente novamente.');
        }
        
        if (error.message.includes('Failed to fetch')) {
            throw new Error('Sem conexão com a internet.');
        }
        
        throw error;
    }
}

// Limpar cache por usuário
function clearCache() {
    const user = getCurrentUser();
    const keysToDelete = [];
    
    for (let key of AppState.cache.keys()) {
        if (key.includes(user.type)) {
            keysToDelete.push(key);
        }
    }
    
    keysToDelete.forEach(key => AppState.cache.delete(key));
}

// ================================
// FORMATADORES DE DATA CORRIGIDOS
// ================================
function dateInputToString(dateInputValue) {
    if (!dateInputValue) return '';
    if (typeof dateInputValue === 'string' && dateInputValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return dateInputValue;
    }
    
    const date = new Date(dateInputValue);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function stringToDateInput(dateString) {
    if (!dateString) return '';
    
    if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return dateString;
    }
    
    let date;
    if (dateString.includes('T')) {
        date = new Date(dateString);
    } else if (dateString.includes('/')) {
        const parts = dateString.split('/');
        if (parts.length === 3) {
            date = new Date(parts[2], parts[1] - 1, parts[0]);
        } else {
            date = new Date(dateString);
        }
    } else {
        date = new Date(dateString + 'T00:00:00');
    }
    
    if (isNaN(date.getTime())) {
        console.warn('Data inválida:', dateString);
        return '';
    }
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDateBRFixed(dateString, includeTime = false) {
    if (!dateString) return '-';
    
    let date;
    
    if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const parts = dateString.split('-');
        date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    } else {
        date = new Date(dateString);
    }
    
    if (isNaN(date.getTime())) {
        console.warn('Data inválida para formatação:', dateString);
        return '-';
    }
    
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
    
    return date.toLocaleDateString('pt-BR', options);
}

function getCurrentDateInput() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getCurrentDateTime() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function isDateInRange(dateToCheck, startDate, endDate) {
    if (!dateToCheck) return false;
    
    const checkDate = new Date(dateToCheck + 'T12:00:00');
    
    if (startDate) {
        const start = new Date(startDate + 'T00:00:00');
        if (checkDate < start) return false;
    }
    
    if (endDate) {
        const end = new Date(endDate + 'T23:59:59');
        if (checkDate > end) return false;
    }
    
    return true;
}

// ================================
// FORMATADORES
// ================================
function formatCurrency(value) {
    if (value == null || isNaN(value)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

function formatDateBR(dateString, includeTime = false) {
    return formatDateBRFixed(dateString, includeTime);
}

function dateToInputValue(date) {
    if (!date) return '';
    
    if (typeof date === 'string') {
        return stringToDateInput(date);
    }
    
    if (date instanceof Date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    return '';
}

// ================================
// DOM HELPERS
// ================================
function updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value.toString();
    }
}

function showLoading(show = true) {
    const loading = document.getElementById('loading') || 
                   document.getElementById('loading-overlay');
    if (loading) {
        loading.style.display = show ? 'flex' : 'none';
    }
}

function showAlert(message, type = 'success', duration = 3000) {
    const container = document.getElementById('alert-container');
    if (!container) {
        console.warn('Container de alertas não encontrado');
        return;
    }
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    
    container.appendChild(alert);
    
    setTimeout(() => {
        if (alert.parentNode) {
            alert.remove();
        }
    }, duration);
}

// ================================
// FILTROS PADRÃO
// ================================
function setDefaultDateFilters(startElementId, endElementId) {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const startElement = document.getElementById(startElementId);
    const endElement = document.getElementById(endElementId);
    
    if (startElement) startElement.value = dateToInputValue(firstDayOfMonth);
    if (endElement) endElement.value = dateToInputValue(today);
}

function setupFilters(filters, applyCallback) {
    Object.entries(filters).forEach(([elementId, filterKey]) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener('input', debounce(() => {
                applyCallback();
            }, 300));
        }
    });
}

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

// ================================
// LABELS E CONSTANTES
// ================================
const TIPO_LABELS = {
    'E': '📈 Extra',
    'V': '🛒 Normal', 
    'L': '🏪 Loja'
};

const STATUS_LABELS = {
    'FUNCIONARIO': '👥 Funcionário',
    'OUTRAS': '📋 Outras'
};

function getTipoLabel(tipo) {
    return TIPO_LABELS[tipo] || tipo;
}

function getStatusLabel(status) {
    return STATUS_LABELS[status] || status;
}

// ================================
// VALIDAÇÕES
// ================================
function validateRequired(value, fieldName) {
    if (!value || value.toString().trim() === '') {
        showAlert(`${fieldName} é obrigatório`, 'warning');
        return false;
    }
    return true;
}

function validateNumber(value, fieldName, min = 0) {
    if (isNaN(value) || value <= min) {
        showAlert(`${fieldName} deve ser maior que ${min}`, 'warning');
        return false;
    }
    return true;
}

function validateDate(dateValue, fieldName) {
    if (!dateValue) {
        showAlert(`${fieldName} é obrigatória`, 'warning');
        return false;
    }
    return true;
}

// ================================
// EXPORT CSV
// ================================
function exportToCSV(data, filename) {
    if (!data || data.length === 0) {
        showAlert('Nenhum dado para exportar', 'warning');
        return;
    }

    const headers = Object.keys(data[0]);
    const csv = [
        headers.join(','),
        ...data.map(row => 
            headers.map(header => {
                let value = row[header] || '';
                if (typeof value === 'string' && value.includes(',')) {
                    value = `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            }).join(',')
        )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const user = getCurrentUser();
    const userSuffix = user.type ? `_${user.type}` : '';
    link.download = `${filename}${userSuffix}.csv`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    showAlert('Dados exportados com sucesso!', 'success');
}

// ================================
// MODAL HELPERS
// ================================
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        const firstInput = modal.querySelector('input, select, textarea');
        if (firstInput) firstInput.focus();
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// ================================
// FORM HELPERS
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
// STORAGE HELPERS
// ================================
function getStorageItem(key) {
    try {
        return localStorage.getItem(key);
    } catch (error) {
        console.warn('Erro ao acessar localStorage:', error);
        return null;
    }
}

function setStorageItem(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch (error) {
        console.warn('Erro ao salvar no localStorage:', error);
    }
}

function removeStorageItem(key) {
    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.warn('Erro ao remover do localStorage:', error);
    }
}

// ================================
// AUTH HELPERS MULTI-TENANT
// ================================
function checkAuth() {
    const isLoggedIn = getStorageItem('poste-system-logged-in');
    const loginTime = getStorageItem('poste-system-login-time');
    const userType = getStorageItem('poste-system-user-type');
    
    if (isLoggedIn !== 'true' || !userType) {
        window.location.href = 'index.html';
        return false;
    }
    
    // Verificar expiração (8 horas)
    if (loginTime) {
        const now = new Date().getTime();
        const loginTimestamp = new Date(loginTime).getTime();
        const sessionTimeout = 8 * 60 * 60 * 1000; // 8 horas
        
        if (now - loginTimestamp > sessionTimeout) {
            logout('Sessão expirada');
            return false;
        }
    }
    
    return true;
}

function logout(message = null) {
    removeStorageItem('poste-system-logged-in');
    removeStorageItem('poste-system-login-time');
    removeStorageItem('poste-system-user-type');
    removeStorageItem('poste-system-username');
    removeStorageItem('poste-system-display-name');
    
    // Limpar cache do usuário
    AppState.currentUser = null;
    clearCache();
    
    if (message) {
        showAlert(message, 'warning', 2000);
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
    } else {
        window.location.href = 'index.html';
    }
}

function createLogoutButton() {
    if (document.getElementById('logout-button')) return;
    
    const user = getCurrentUser();
    
    const button = document.createElement('button');
    button.id = 'logout-button';
    button.className = 'logout-button';
    button.textContent = '🚪';
    button.title = `Sair do sistema (${user.displayName})`;
    button.addEventListener('click', () => logout());
    
    document.body.appendChild(button);
}

function createUserBadge() {
    if (document.getElementById('user-badge')) return;
    
    const user = getCurrentUser();
    if (!user.type) return;
    
    const badge = document.createElement('div');
    badge.id = 'user-badge';
    badge.className = `caminhao-badge ${user.type}`;
    badge.style.cssText = `
        position: fixed;
        top: var(--space-4);
        left: var(--space-4);
        z-index: 999;
        font-size: var(--text-sm);
        font-weight: 600;
        pointer-events: none;
    `;
    
    // Ícone baseado no tipo de usuário
    let icon = '';
    switch (user.type) {
        case 'vermelho': icon = '🚛'; break;
        case 'branco': icon = '🚚'; break;
        case 'jefferson': icon = '👨‍💼'; break;
    }
    
    badge.innerHTML = `${icon} ${user.displayName}`;
    document.body.appendChild(badge);
}

// ================================
// THEME HELPERS
// ================================
function initTheme() {
    const savedTheme = getStorageItem('poste-system-theme');
    if (savedTheme && savedTheme !== 'auto') {
        document.documentElement.setAttribute('data-theme', savedTheme);
    }
    
    createThemeToggle();
}

function createThemeToggle() {
    if (document.getElementById('theme-toggle')) return;
    
    const toggle = document.createElement('button');
    toggle.id = 'theme-toggle';
    toggle.className = 'theme-toggle';
    toggle.setAttribute('aria-label', 'Alternar tema');
    toggle.addEventListener('click', toggleTheme);
    
    updateThemeIcon(toggle);
    document.body.appendChild(toggle);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    let next;
    
    if (!current || current === 'auto') {
        next = 'light';
    } else if (current === 'light') {
        next = 'dark';
    } else {
        next = 'auto';
        document.documentElement.removeAttribute('data-theme');
    }
    
    if (next !== 'auto') {
        document.documentElement.setAttribute('data-theme', next);
    }
    
    setStorageItem('poste-system-theme', next);
    updateThemeIcon(document.getElementById('theme-toggle'));
}

function updateThemeIcon(toggle) {
    if (!toggle) return;
    
    const current = document.documentElement.getAttribute('data-theme');
    const isDark = current === 'dark' || 
                   (!current && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    if (!current) {
        toggle.textContent = isDark ? '🌓' : '🌗';
        toggle.title = 'Tema Automático';
    } else if (current === 'light') {
        toggle.textContent = '☀️';
        toggle.title = 'Tema Claro';
    } else {
        toggle.textContent = '🌙';
        toggle.title = 'Tema Escuro';
    }
}

// ================================
// NAVIGATION HELPERS MULTI-TENANT
// ================================
function updateNavigationForUser() {
    const user = getCurrentUser();
    if (!user.type) return;
    
    const navContainer = document.querySelector('.nav-container');
    if (!navContainer) return;
    
    // Adicionar classe específica do usuário
    navContainer.classList.add(user.type);
    
    // Ajustar navegação para Jefferson (4 itens)
    if (user.type === 'jefferson') {
        navContainer.classList.add('jefferson');
    }
}

function getNavigationBasePath() {
    const user = getCurrentUser();
    
    switch (user.type) {
        case 'branco':
            return '-branco';
        case 'jefferson':
            return '-jefferson';
        default:
            return '';
    }
}

// ================================
// INICIALIZAÇÃO MULTI-TENANT
// ================================
function initApp() {
    // Verificar autenticação se não estiver na página de login
    if (!window.location.pathname.includes('index.html') && 
        window.location.pathname !== '/') {
        if (checkAuth()) {
            createLogoutButton();
            createUserBadge();
            updateNavigationForUser();
        }
    }
    
    // Inicializar tema
    initTheme();
    
    const user = getCurrentUser();
    console.log(`✅ App Utils Multi-Tenant inicializados para: ${user.displayName || 'Usuário não identificado'}`);
}

// Auto-inicializar quando DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// ================================
// DISPONIBILIZAR GLOBALMENTE
// ================================
window.AppUtils = {
    // API
    apiRequest,
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
    
    // Validações
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
    getNavigationBasePath
};

console.log('✅ Utils Multi-Tenant COMPLETO carregado');