// Postes JavaScript Mobile-First - Versão Otimizada para Cold Start
const API_BASE = 'https://posteback.onrender.com/api';

// Estado global simplificado
const state = {
    postes: [],
    currentEditId: null,
    filters: { status: '', codigo: '', descricao: '' },
    isFirstRequest: !sessionStorage.getItem('api-connected'),
    requestCache: new Map()
};

// Cache simples com TTL
const cache = {
    data: new Map(),
    ttl: 5 * 60 * 1000, // 5 minutos
    
    set(key, value) {
        this.data.set(key, {
            value,
            timestamp: Date.now()
        });
    },
    
    get(key) {
        const item = this.data.get(key);
        if (!item) return null;
        
        if (Date.now() - item.timestamp > this.ttl) {
            this.data.delete(key);
            return null;
        }
        
        return item.value;
    },
    
    clear() {
        this.data.clear();
    }
};

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎯 Inicializando Postes Mobile...');
    
    // Mostrar aviso sobre cold start na primeira visita
    showColdStartWarning();
    
    try {
        configurarEventos();
        await carregarDados();
        console.log('✅ Postes carregado');
    } catch (error) {
        console.error('❌ Erro ao carregar:', error);
        showAlert('Erro ao carregar dados. Verifique sua conexão.', 'error');
    }
});

// Aviso sobre cold start
function showColdStartWarning() {
    if (state.isFirstRequest && !sessionStorage.getItem('cold-start-warning-shown')) {
        sessionStorage.setItem('cold-start-warning-shown', 'true');
        showAlert(`
            ℹ️ Primeira conexão pode demorar até 2 minutos devido ao servidor gratuito. 
            Após isso, ficará mais rápido!
        `, 'info', 10000);
    }
}

// Loading inteligente com feedback progressivo
function showIntelligentLoading(isFirstLoad = false) {
    const loading = document.getElementById('loading');
    const loadingText = loading?.querySelector('p');
    
    if (loading) {
        loading.style.display = 'flex';
        
        if (loadingText && isFirstLoad) {
            loadingText.textContent = 'Iniciando servidor (pode demorar até 2 minutos)...';
            
            // Feedback progressivo
            let seconds = 0;
            const progressInterval = setInterval(() => {
                seconds += 5;
                if (seconds <= 30) {
                    loadingText.textContent = `Iniciando servidor... ${seconds}s`;
                } else if (seconds <= 90) {
                    loadingText.textContent = `Servidor inicializando (demora normal)... ${seconds}s`;
                } else {
                    loadingText.textContent = 'Quase pronto, aguarde mais um pouco...';
                }
            }, 5000);
            
            // Limpar intervalo quando loading sumir
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.target.style.display === 'none') {
                        clearInterval(progressInterval);
                        observer.disconnect();
                    }
                });
            });
            observer.observe(loading, { attributes: true, attributeFilter: ['style'] });
        } else if (loadingText) {
            loadingText.textContent = 'Carregando...';
        }
    }
}

// Requisição otimizada com retry e timeout inteligente
async function apiRequestOptimized(endpoint, options = {}) {
    const cacheKey = `${endpoint}_${JSON.stringify(options)}`;
    
    // Verificar cache primeiro
    const cachedData = cache.get(cacheKey);
    if (cachedData && !options.skipCache) {
        console.log('📦 Dados do cache:', endpoint);
        return cachedData;
    }
    
    const controller = new AbortController();
    const isFirstRequest = state.isFirstRequest;
    
    // Timeout maior para primeira requisição (cold start)
    const timeoutMs = isFirstRequest ? 120000 : 30000; // 2min vs 30s
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    const maxRetries = 2;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            console.log(`🌐 Tentativa ${attempt + 1}/${maxRetries + 1}: ${endpoint}`, isFirstRequest ? '(COLD START)' : '(WARM)');
            
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
            if (state.isFirstRequest) {
                state.isFirstRequest = false;
                sessionStorage.setItem('api-connected', 'true');
            }
            
            // Verificar se há conteúdo antes de fazer parse JSON
            if (response.status === 204 || response.status === 205) {
                return null;
            }
            
            const contentLength = response.headers.get('Content-Length');
            if (contentLength === '0') {
                return null;
            }
            
            let data;
            try {
                data = await response.json();
            } catch (jsonError) {
                return null;
            }
            
            // Cachear resultado
            if (data !== null) {
                cache.set(cacheKey, data);
            }
            
            return data;
            
        } catch (error) {
            console.warn(`⚠️ Tentativa ${attempt + 1} falhou:`, error.message);
            
            if (attempt === maxRetries) {
                clearTimeout(timeoutId);
                
                // Mostrar erro específico para cold start
                if (isFirstRequest && error.name === 'AbortError') {
                    showAlert('⏱️ Servidor demorou para responder. Tente novamente em alguns segundos.', 'warning', 8000);
                } else if (error.message.includes('Failed to fetch')) {
                    showAlert('🌐 Sem conexão com a internet ou servidor indisponível.', 'error');
                } else {
                    showAlert('Erro ao conectar: ' + error.message, 'error');
                }
                
                throw error;
            }
            
            // Aguardar antes de tentar novamente (backoff exponencial)
            const delay = Math.min(2000 * Math.pow(2, attempt), 10000);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

// Configuração de eventos
function configurarEventos() {
    // Form principal
    const posteForm = document.getElementById('poste-form');
    if (posteForm) {
        posteForm.addEventListener('submit', handlePosteSubmit);
        posteForm.addEventListener('reset', resetForm);
    }
    
    // Form de edição
    const editForm = document.getElementById('edit-form');
    if (editForm) {
        editForm.addEventListener('submit', handleEditSubmit);
    }
    
    // Filtros
    setupFilters();
}

function setupFilters() {
    const filters = {
        'filtro-status': 'status',
        'filtro-codigo': 'codigo',
        'filtro-descricao': 'descricao'
    };
    
    Object.entries(filters).forEach(([elementId, filterKey]) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener('input', debounce(() => {
                state.filters[filterKey] = element.value;
                applyFilters();
            }, 300));
        }
    });
}

// Carregamento de dados otimizado
async function carregarDados() {
    try {
        showIntelligentLoading(state.isFirstRequest);
        
        console.log('⚡ Carregando dados de postes...');
        
        const postes = await fetchPostes();
        state.postes = postes || [];
        
        updateResumo();
        applyFilters();
        
        console.log('✅ Dados de postes carregados');
        
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        
        // Mostrar dados em cache se disponível
        if (state.postes.length > 0) {
            console.log('📦 Usando dados em cache');
            updateResumo();
            applyFilters();
            showAlert('Usando dados salvos. Alguns dados podem estar desatualizados.', 'warning');
        }
        
        throw error;
    } finally {
        showLoading(false);
    }
}

// Requisições API otimizadas
async function fetchPostes() {
    try {
        return await apiRequestOptimized('/postes');
    } catch (error) {
        console.error('Erro ao buscar postes:', error);
        return [];
    }
}

// Manipulação do formulário
async function handlePosteSubmit(e) {
    e.preventDefault();
    
    try {
        const formData = buildFormData();
        
        if (!validateFormData(formData)) {
            return;
        }
        
        showIntelligentLoading(false);
        
        await apiRequestOptimized('/postes', {
            method: 'POST',
            body: JSON.stringify(formData),
            skipCache: true
        });
        
        showAlert('Poste criado com sucesso!', 'success');
        resetForm();
        
        // Limpar cache e recarregar
        cache.clear();
        await carregarDados();
        
    } catch (error) {
        console.error('Erro ao criar poste:', error);
        showAlert('Erro ao criar poste: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

function buildFormData() {
    return {
        codigo: document.getElementById('poste-codigo').value.trim(),
        descricao: document.getElementById('poste-descricao').value.trim(),
        preco: parseFloat(document.getElementById('poste-preco').value),
        ativo: true
    };
}

function validateFormData(data) {
    if (!data.codigo || data.codigo.length < 1) {
        showAlert('Código é obrigatório', 'warning');
        return false;
    }
    
    if (!data.descricao || data.descricao.length < 3) {
        showAlert('Descrição deve ter pelo menos 3 caracteres', 'warning');
        return false;
    }
    
    if (!data.preco || data.preco <= 0) {
        showAlert('Preço deve ser maior que zero', 'warning');
        return false;
    }
    
    // Verificar código duplicado
    const codigoExistente = state.postes.find(p => 
        p.codigo.toLowerCase() === data.codigo.toLowerCase() && 
        (!state.currentEditId || p.id !== state.currentEditId)
    );
    
    if (codigoExistente) {
        showAlert('Código já existe', 'warning');
        return false;
    }
    
    return true;
}

// Display postes
function displayPostes(postes) {
    const container = document.getElementById('postes-list');
    if (!container) return;
    
    if (!postes || postes.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⚡</div>
                <h3>Nenhum poste encontrado</h3>
                <p>Comece cadastrando seu primeiro poste.</p>
                <button class="btn btn-primary" onclick="scrollToForm()">
                    Cadastrar Primeiro Poste
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    postes.forEach(poste => {
        const item = createPosteItem(poste);
        container.appendChild(item);
    });
}

function createPosteItem(poste) {
    const item = document.createElement('div');
    item.className = `mobile-list-item ${poste.ativo ? 'ativo' : 'inativo'}`;
    
    const statusLabel = poste.ativo ? '✅ Ativo' : '❌ Inativo';
    const statusClass = poste.ativo ? 'ativo' : 'inativo';
    
    item.innerHTML = `
        <div class="item-header">
            <span class="item-status ${statusClass}">
                ${statusLabel}
            </span>
            <span class="item-code">${poste.codigo}</span>
        </div>
        
        <div class="item-content">
            <div class="item-price">${formatCurrency(poste.preco)}</div>
            <div class="item-title">${poste.descricao}</div>
        </div>
        
        <div class="item-actions">
            <button class="btn btn-small btn-primary" onclick="editPoste(${poste.id})">
                ✏️ Editar
            </button>
            <button class="btn btn-small ${poste.ativo ? 'btn-secondary' : 'btn-success'}" 
                    onclick="togglePosteStatus(${poste.id})">
                ${poste.ativo ? '❌ Inativar' : '✅ Ativar'}
            </button>
        </div>
    `;
    
    return item;
}

// CRUD operations
async function editPoste(id) {
    try {
        const poste = state.postes.find(p => p.id === id);
        if (!poste) {
            throw new Error('Poste não encontrado');
        }
        
        populateEditForm(poste);
        state.currentEditId = id;
        showModal();
        
    } catch (error) {
        console.error('Erro ao carregar poste para edição:', error);
        showAlert('Erro ao carregar dados do poste: ' + error.message, 'error');
    }
}

function populateEditForm(poste) {
    document.getElementById('edit-poste-codigo').value = poste.codigo;
    document.getElementById('edit-poste-descricao').value = poste.descricao;
    document.getElementById('edit-poste-preco').value = poste.preco;
    document.getElementById('edit-poste-ativo').value = poste.ativo.toString();
}

async function handleEditSubmit(e) {
    e.preventDefault();
    
    try {
        const formData = buildEditFormData();
        
        if (!validateFormData(formData)) {
            return;
        }
        
        showIntelligentLoading(false);
        
        await apiRequestOptimized(`/postes/${state.currentEditId}`, {
            method: 'PUT',
            body: JSON.stringify(formData),
            skipCache: true
        });
        
        showAlert('Poste atualizado com sucesso!', 'success');
        closeModal();
        
        // Limpar cache e recarregar
        cache.clear();
        await carregarDados();
        
    } catch (error) {
        console.error('Erro ao atualizar poste:', error);
        showAlert('Erro ao atualizar poste: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

function buildEditFormData() {
    return {
        codigo: document.getElementById('edit-poste-codigo').value.trim(),
        descricao: document.getElementById('edit-poste-descricao').value.trim(),
        preco: parseFloat(document.getElementById('edit-poste-preco').value),
        ativo: document.getElementById('edit-poste-ativo').value === 'true'
    };
}

async function togglePosteStatus(id) {
    try {
        const poste = state.postes.find(p => p.id === id);
        if (!poste) {
            throw new Error('Poste não encontrado');
        }
        
        const novoStatus = !poste.ativo;
        const acao = novoStatus ? 'ativar' : 'inativar';
        
        if (!confirm(`Tem certeza que deseja ${acao} este poste?`)) {
            return;
        }
        
        showIntelligentLoading(false);
        
        await apiRequestOptimized(`/postes/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ ...poste, ativo: novoStatus }),
            skipCache: true
        });
        
        showAlert(`Poste ${acao}do com sucesso!`, 'success');
        
        // Limpar cache e recarregar
        cache.clear();
        await carregarDados();
        
    } catch (error) {
        console.error('Erro ao alterar status do poste:', error);
        showAlert('Erro ao alterar status do poste: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Filtros e resumo
function applyFilters() {
    const { status, codigo, descricao } = state.filters;
    
    let filtered = [...state.postes];
    
    if (status !== '') {
        const isActive = status === 'true';
        filtered = filtered.filter(p => p.ativo === isActive);
    }
    
    if (codigo) {
        const searchTerm = codigo.toLowerCase();
        filtered = filtered.filter(p => 
            p.codigo.toLowerCase().includes(searchTerm)
        );
    }
    
    if (descricao) {
        const searchTerm = descricao.toLowerCase();
        filtered = filtered.filter(p => 
            p.descricao.toLowerCase().includes(searchTerm)
        );
    }
    
    displayPostes(filtered);
}

function updateResumo() {
    const postes = state.postes;
    
    const total = postes.length;
    const ativos = postes.filter(p => p.ativo).length;
    const inativos = total - ativos;
    const precoMedio = total > 0 ? 
        postes.reduce((sum, p) => sum + (p.preco || 0), 0) / total : 0;
    
    updateElement('total-postes', total);
    updateElement('postes-ativos', ativos);
    updateElement('postes-inativos', inativos);
    updateElement('preco-medio', formatCurrency(precoMedio));
}

// Utilitários
function resetForm() {
    document.getElementById('poste-form').reset();
}

function limparFiltros() {
    document.getElementById('filtro-status').value = '';
    document.getElementById('filtro-codigo').value = '';
    document.getElementById('filtro-descricao').value = '';
    
    state.filters = { status: '', codigo: '', descricao: '' };
    applyFilters();
    showAlert('Filtros limpos', 'success');
}

function scrollToForm() {
    const form = document.getElementById('poste-form');
    if (form) {
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const firstInput = form.querySelector('input, select, textarea');
        if (firstInput) firstInput.focus();
    }
}

async function exportarPostes() {
    if (!state.postes || state.postes.length === 0) {
        showAlert('Nenhum poste para exportar', 'warning');
        return;
    }
    
    const dadosExportar = state.postes.map(poste => ({
        'Código': poste.codigo,
        'Descrição': poste.descricao,
        'Preço': poste.preco,
        'Status': poste.ativo ? 'Ativo' : 'Inativo'
    }));
    
    exportToCSV(dadosExportar, `postes_${new Date().toISOString().split('T')[0]}`);
}

async function loadPostes() {
    try {
        // Limpar cache para forçar nova requisição
        cache.clear();
        
        await carregarDados();
        showAlert('Dados atualizados com sucesso!', 'success');
        
    } catch (error) {
        console.error('Erro ao atualizar postes:', error);
        showAlert('Erro ao atualizar. Verifique sua conexão.', 'error');
    }
}

// Modal functions
function showModal() {
    const modal = document.getElementById('edit-modal');
    if (modal) {
        modal.style.display = 'flex';
        const firstInput = modal.querySelector('input, select, textarea');
        if (firstInput) firstInput.focus();
    }
}

function closeModal() {
    const modal = document.getElementById('edit-modal');
    if (modal) modal.style.display = 'none';
    state.currentEditId = null;
}

// Formatters
function formatCurrency(value) {
    if (value == null || isNaN(value)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

// Helper functions
function updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value.toString();
}

function showLoading(show) {
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = show ? 'flex' : 'none';
}

function showAlert(message, type = 'success', duration = 3000) {
    const container = document.getElementById('alert-container');
    if (!container) return;
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    
    container.appendChild(alert);
    
    setTimeout(() => {
        if (alert.parentNode) alert.remove();
    }, duration);
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

    const blob = new Blob([csv], { type: 'text/csv' });
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

console.log('✅ Postes Mobile carregado com otimizações para cold start');