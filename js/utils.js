// ================================
// UTILS.JS OTIMIZADO - MULTI-TENANT
// Versão mais leve mantendo funcionalidade
// ================================

const API_BASE = 'https://posteback.onrender.com/api';
const AppState = { cache: new Map(), isFirstRequest: !sessionStorage.getItem('api-connected') };

// ================================
// AUTENTICAÇÃO
// ================================
function logout() {
    if (!confirm('Tem certeza que deseja sair?')) return;
    
    ['poste-system-logged-in', 'poste-system-login-time', 'poste-system-user-type', 
     'poste-system-username', 'poste-system-display-name'].forEach(key => localStorage.removeItem(key));
    
    sessionStorage.clear();
    AppState.cache.clear();
    showAlert('Logout realizado!', 'success');
    setTimeout(() => window.location.href = 'index.html', 1000);
}

function getCurrentUser() {
    return {
        isLoggedIn: localStorage.getItem('poste-system-logged-in') === 'true',
        type: localStorage.getItem('poste-system-user-type') || 'vermelho',
        username: localStorage.getItem('poste-system-username'),
        displayName: localStorage.getItem('poste-system-display-name')
    };
}

function checkAuth() {
    const user = getCurrentUser();
    if (!user.isLoggedIn) {
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

function getTenantId() {
    const user = getCurrentUser();
    return ['vermelho', 'branco', 'jefferson'].includes(user.type) ? user.type : 'vermelho';
}

// ================================
// API
// ================================
async function apiRequest(endpoint, options = {}) {
    const cacheKey = `${endpoint}_${JSON.stringify(options)}_${getTenantId()}`;
    
    if (AppState.cache.has(cacheKey) && !options.skipCache) {
        return AppState.cache.get(cacheKey);
    }
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                'X-Tenant-ID': getTenantId(),
                ...options.headers
            }
        });
        
        clearTimeout(timeout);
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        let data = null;
        if (response.headers.get('Content-Type')?.includes('application/json')) {
            data = await response.json();
        }
        
        if (data && !options.skipCache) AppState.cache.set(cacheKey, data);
        if (AppState.isFirstRequest) {
            AppState.isFirstRequest = false;
            sessionStorage.setItem('api-connected', 'true');
        }
        
        return data || {};
        
    } catch (error) {
        clearTimeout(timeout);
        if (error.name === 'AbortError') throw new Error('Timeout - verifique sua conexão');
        throw error;
    }
}

// ================================
// UI
// ================================
function showAlert(message, type = 'success', duration = 4000) {
    const container = document.getElementById('alert-container');
    if (!container) return;
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    container.appendChild(alert);
    
    setTimeout(() => {
        alert.style.opacity = '0';
        setTimeout(() => alert.remove(), 300);
    }, duration);
}

function showLoading(show = true) {
    const loading = document.getElementById('loading') || document.getElementById('loading-overlay');
    if (loading) loading.style.display = show ? 'flex' : 'none';
}

function updateElement(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        const input = modal.querySelector('input, select, textarea');
        if (input) setTimeout(() => input.focus(), 100);
    }
}

function closeModal(modalId) {
    if (modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.style.display = 'none';
    } else {
        document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
    }
}

// ================================
// FORMATAÇÃO
// ================================
function formatCurrency(value) {
    const num = parseFloat(value) || 0;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
}

function formatDateBR(dateString, includeTime = false) {
    if (!dateString) return '-';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '-';
        
        const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
        if (includeTime) { options.hour = '2-digit'; options.minute = '2-digit'; }
        
        return date.toLocaleString('pt-BR', options);
    } catch { return '-'; }
}

function formatDateBRFixed(dateString) {
    if (!dateString) return '-';
    try {
        if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) dateString += 'T12:00:00';
        return new Date(dateString).toLocaleDateString('pt-BR');
    } catch { return '-'; }
}

// ================================
// VALIDAÇÃO
// ================================
function validateRequired(value, fieldName) {
    if (!value || (typeof value === 'string' && !value.trim())) {
        showAlert(`${fieldName} é obrigatório`, 'warning');
        return false;
    }
    return true;
}

function validateNumber(value, fieldName, min = 0) {
    const num = parseFloat(value);
    if (isNaN(num) || num <= min) {
        showAlert(`${fieldName} deve ser maior que ${min}`, 'warning');
        return false;
    }
    return true;
}

function validateDate(dateValue, fieldName) {
    if (!dateValue || isNaN(new Date(dateValue).getTime())) {
        showAlert(`${fieldName} deve ser uma data válida`, 'warning');
        return false;
    }
    return true;
}

// ================================
// DATA
// ================================
function dateToInputValue(date) {
    return date ? new Date(date).toISOString().split('T')[0] : '';
}

function getCurrentDateInput() {
    return new Date().toISOString().split('T')[0];
}

function getCurrentDateTime() {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function stringToDateInput(dateString) {
    try {
        return dateString ? new Date(dateString).toISOString().split('T')[0] : '';
    } catch { return ''; }
}

function dateInputToString(inputValue) {
    return inputValue || null;
}

function isDateInRange(dateToCheck, startDate, endDate) {
    if (!dateToCheck) return false;
    const check = new Date(dateToCheck);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    
    if (start && end) return check >= start && check <= end;
    if (start) return check >= start;
    if (end) return check <= end;
    return true;
}

function setDefaultDateFilters(startId, endId) {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const start = document.getElementById(startId);
    const end = document.getElementById(endId);
    
    if (start) start.value = dateToInputValue(firstDay);
    if (end) end.value = dateToInputValue(today);
}

// ================================
// UTILITÁRIOS
// ================================
function clearCache(pattern = null) {
    const tenant = getTenantId();
    const toDelete = [];
    for (let key of AppState.cache.keys()) {
        if (key.includes(tenant) && (!pattern || key.includes(pattern))) {
            toDelete.push(key);
        }
    }
    toDelete.forEach(key => AppState.cache.delete(key));
}

function getTipoLabel(tipo) {
    const labels = { E: '📈 Extra', V: '🛒 Normal', L: '🏪 Loja' };
    return labels[tipo] || tipo;
}

function getStatusLabel(status) {
    const labels = { FUNCIONARIO: '👥 Funcionário', OUTRAS: '📋 Outras' };
    return labels[status] || status;
}

function exportToCSV(data, filename) {
    if (!data?.length) {
        showAlert('Nenhum dado para exportar', 'warning');
        return;
    }
    
    const headers = Object.keys(data[0]);
    const csv = [
        headers.join(','),
        ...data.map(row => headers.map(h => {
            const val = row[h];
            return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
        }).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.click();
    showAlert('Arquivo exportado!', 'success');
}

function debounce(func, wait) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

function setupFilters(filterMap, applyFunction) {
    Object.entries(filterMap).forEach(([elementId, filterKey]) => {
        const element = document.getElementById(elementId);
        if (element) {
            const debouncedApply = debounce(applyFunction, 300);
            element.addEventListener('input', debouncedApply);
            element.addEventListener('change', debouncedApply);
        }
    });
}

function scrollToElement(elementId, offset = 0) {
    const element = document.getElementById(elementId);
    if (element) {
        window.scrollTo({
            top: element.offsetTop - offset,
            behavior: 'smooth'
        });
    }
}

// ================================
// INICIALIZAÇÃO
// ================================
function createLogoutButton() {
    if (!getCurrentUser().isLoggedIn || document.getElementById('logout-button')) return;
    
    const btn = document.createElement('button');
    btn.id = 'logout-button';
    btn.className = 'logout-button';
    btn.innerHTML = '🚪';
    btn.onclick = logout;
    btn.title = 'Sair';
    document.body.appendChild(btn);
}

function createThemeToggle() {
    if (document.getElementById('theme-toggle')) return;
    
    const btn = document.createElement('button');
    btn.id = 'theme-toggle';
    btn.className = 'theme-toggle';
    btn.title = 'Alternar tema';
    
    const theme = localStorage.getItem('poste-system-theme') || 'light';
    btn.innerHTML = theme === 'dark' ? '☀️' : '🌙';
    document.documentElement.setAttribute('data-theme', theme);
    
    btn.onclick = () => {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('poste-system-theme', newTheme);
        btn.innerHTML = newTheme === 'dark' ? '☀️' : '🌙';
    };
    
    document.body.appendChild(btn);
}

function initAuthSystem() {
    if (window.location.pathname.includes('index.html') || 
        window.location.pathname === '/' || 
        window.location.pathname === '') return;
    
    if (!checkAuth()) return;
    createLogoutButton();
    createThemeToggle();
}

// Auto-init
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuthSystem);
} else {
    initAuthSystem();
}

// ================================
// GLOBAL EXPORT
// ================================
window.AppUtils = {
    apiRequest, clearCache, logout, getCurrentUser, getTenantId, checkAuth, initAuthSystem,
    showAlert, showLoading, updateElement, showModal, closeModal,
    formatCurrency, formatDateBR, formatDateBRFixed,
    dateToInputValue, getCurrentDateInput, getCurrentDateTime, stringToDateInput, 
    dateInputToString, isDateInRange, setDefaultDateFilters,
    validateRequired, validateNumber, validateDate,
    getTipoLabel, getStatusLabel, exportToCSV, debounce, setupFilters, scrollToElement
};

console.log('✅ Utils otimizado carregado');