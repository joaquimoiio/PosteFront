// utils.js - Utilitários Compartilhados
// Versão leve e otimizada para o Sistema de Postes - COM CORREÇÕES DE DATA

const API_BASE = 'https://posteback.onrender.com/api';

// ================================
// ESTADO GLOBAL SIMPLES
// ================================
const AppState = {
    isFirstRequest: !sessionStorage.getItem('api-connected'),
    cache: new Map()
};

// ================================
// API SIMPLIFICADA
// ================================
async function apiRequest(endpoint, options = {}) {
    const cacheKey = `${endpoint}_${JSON.stringify(options)}`;
    
    // Cache simples
    if (AppState.cache.has(cacheKey) && !options.skipCache) {
        return AppState.cache.get(cacheKey);
    }
    
    const controller = new AbortController();
    const timeoutMs = AppState.isFirstRequest ? 60000 : 15000; // 1min vs 15s
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                ...options.headers
            }
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
        
        // Cache resultado
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

// Limpar cache
function clearCache() {
    AppState.cache.clear();
}

// ================================
// FORMATADORES DE DATA CORRIGIDOS
// ================================

// Função para converter data input para string sem problemas de timezone
function dateInputToString(dateInputValue) {
    if (!dateInputValue) return '';
    // Se já está no formato YYYY-MM-DD, retorna diretamente
    if (typeof dateInputValue === 'string' && dateInputValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return dateInputValue;
    }
    
    const date = new Date(dateInputValue);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Função para converter string de data para input sem problemas de timezone
function stringToDateInput(dateString) {
    if (!dateString) return '';
    
    // Se já está no formato correto, retorna
    if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return dateString;
    }
    
    // Tratar diferentes formatos de data
    let date;
    if (dateString.includes('T')) {
        // ISO string ou datetime-local
        date = new Date(dateString);
    } else if (dateString.includes('/')) {
        // Formato brasileiro DD/MM/YYYY
        const parts = dateString.split('/');
        if (parts.length === 3) {
            date = new Date(parts[2], parts[1] - 1, parts[0]);
        } else {
            date = new Date(dateString);
        }
    } else {
        // Formato YYYY-MM-DD ou outros
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

// Função para formatar data brasileira corrigida
function formatDateBRFixed(dateString, includeTime = false) {
    if (!dateString) return '-';
    
    let date;
    
    // Se é uma string no formato YYYY-MM-DD, criar data local
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
        timeZone: 'America/Sao_Paulo' // Forçar timezone brasileiro
    };
    
    if (includeTime) {
        options.hour = '2-digit';
        options.minute = '2-digit';
    }
    
    return date.toLocaleDateString('pt-BR', options);
}

// Função para obter data atual no formato input (YYYY-MM-DD)
function getCurrentDateInput() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Função para filtrar por intervalo de datas
function isDateInRange(dateToCheck, startDate, endDate) {
    if (!dateToCheck) return false;
    
    const checkDate = new Date(dateToCheck + 'T12:00:00'); // Meio-dia para evitar problemas de timezone
    
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
// FORMATADORES (MANTENDO COMPATIBILIDADE)
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

function getCurrentDateTime() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
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
    link.download = `${filename}.csv`;
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
// AUTH HELPERS
// ================================
function checkAuth() {
    const isLoggedIn = getStorageItem('poste-system-logged-in');
    const loginTime = getStorageItem('poste-system-login-time');
    
    if (isLoggedIn !== 'true') {
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
    
    const button = document.createElement('button');
    button.id = 'logout-button';
    button.style.cssText = `
        position: fixed;
        top: 16px;
        right: 70px;
        z-index: 1000;
        background: #ef4444;
        color: white;
        border: none;
        border-radius: 50%;
        width: 44px;
        height: 44px;
        font-size: 1.2rem;
        cursor: pointer;
        box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
        transition: all 0.2s ease;
    `;
    button.textContent = '🚪';
    button.title = 'Sair do sistema';
    button.addEventListener('click', () => logout());
    
    document.body.appendChild(button);
}

// ================================
// INICIALIZAÇÃO
// ================================
function initApp() {
    // Verificar autenticação se não estiver na página de login
    if (!window.location.pathname.includes('index.html') && 
        window.location.pathname !== '/') {
        if (checkAuth()) {
            createLogoutButton();
        }
    }
    
    // Inicializar tema
    initTheme();
    
    console.log('✅ App Utils inicializados');
}

// Auto-inicializar quando DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// Disponibilizar globalmente
window.AppUtils = {
    apiRequest,
    clearCache,
    formatCurrency,
    formatDateBR,
    formatDateBRFixed,
    dateToInputValue,
    dateInputToString,
    stringToDateInput,
    getCurrentDateTime,
    getCurrentDateInput,
    isDateInRange,
    updateElement,
    showLoading,
    showAlert,
    setDefaultDateFilters,
    setupFilters,
    debounce,
    getTipoLabel,
    getStatusLabel,
    validateRequired,
    validateNumber,
    validateDate,
    exportToCSV,
    showModal,
    closeModal,
    resetForm,
    getFormData,
    checkAuth,
    logout
};