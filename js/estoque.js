// Estoque JavaScript Mobile-First - Versão Otimizada para Cold Start
const API_BASE = 'https://posteback.onrender.com/api';

// Estado global simplificado
const state = {
    estoque: [],
    postes: [],
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
    console.log('🎯 Inicializando Estoque Mobile...');
    
    // Mostrar aviso sobre cold start na primeira visita
    showColdStartWarning();
    
    try {
        configurarEventos();
        await carregarDados();
        console.log('✅ Estoque carregado');
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
    const estoqueForm = document.getElementById('estoque-form');
    if (estoqueForm) {
        estoqueForm.addEventListener('submit', handleEstoqueSubmit);
        estoqueForm.addEventListener('reset', resetForm);
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
        
        console.log('📦 Carregando dados de estoque...');
        
        const [estoque, postes] = await Promise.all([
            fetchEstoque(),
            fetchPostes()
        ]);
        
        state.estoque = estoque || [];
        state.postes = postes || [];
        
        populatePosteSelect();
        updateResumo();
        updateAlertas();
        applyFilters();
        
        console.log('✅ Dados de estoque carregados');
        
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        
        // Mostrar dados em cache se disponível
        if (state.estoque.length > 0) {
            console.log('📦 Usando dados em cache');
            populatePosteSelect();
            updateResumo();
            updateAlertas();
            applyFilters();
            showAlert('Usando dados salvos. Alguns dados podem estar desatualizados.', 'warning');
        }
        
        throw error;
    } finally {
        showLoading(false);
    }
}

// Requisições API otimizadas
async function fetchEstoque() {
    try {
        return await apiRequestOptimized('/estoque');
    } catch (error) {
        console.error('Erro ao buscar estoque:', error);
        return [];
    }
}

async function fetchPostes() {
    try {
        const postes = await apiRequestOptimized('/postes');
        return (postes || []).filter(p => p.ativo);
    } catch (error) {
        console.error('Erro ao buscar postes:', error);
        return [];
    }
}

// Manipulação do formulário
async function handleEstoqueSubmit(e) {
    e.preventDefault();
    
    try {
        const formData = buildFormData();
        
        if (!validateFormData(formData)) {
            return;
        }
        
        showIntelligentLoading(false);
        
        await apiRequestOptimized('/estoque/adicionar', {
            method: 'POST',
            body: JSON.stringify(formData),
            skipCache: true
        });
        
        showAlert('Estoque adicionado com sucesso!', 'success');
        resetForm();
        
        // Limpar cache e recarregar
        cache.clear();
        await carregarDados();
        
    } catch (error) {
        console.error('Erro ao adicionar estoque:', error);
        showAlert('Erro ao adicionar estoque: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

function buildFormData() {
    return {
        posteId: parseInt(document.getElementById('estoque-poste').value),
        quantidade: parseInt(document.getElementById('estoque-quantidade').value),
        observacao: document.getElementById('estoque-observacao').value.trim() || null
    };
}

function validateFormData(data) {
    if (!data.posteId) {
        showAlert('Selecione um poste', 'warning');
        return false;
    }
    
    if (!data.quantidade || data.quantidade <= 0) {
        showAlert('Quantidade deve ser maior que zero', 'warning');
        return false;
    }
    
    return true;
}

// Populate selects
function populatePosteSelect() {
    const select = document.getElementById('estoque-poste');
    if (!select) return;
    
    // Limpar opções existentes exceto a primeira
    while (select.children.length > 1) {
        select.removeChild(select.lastChild);
    }
    
    // Adicionar opções dos postes
    state.postes.forEach(poste => {
        const option = document.createElement('option');
        option.value = poste.id;
        option.textContent = `${poste.codigo} - ${poste.descricao} (${formatCurrency(poste.preco)})`;
        select.appendChild(option);
    });
}

// Display estoque
function displayEstoque(estoque) {
    const container = document.getElementById('estoque-list');
    if (!container) return;
    
    if (!estoque || estoque.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📦</div>
                <h3>Nenhum estoque encontrado</h3>
                <p>Adicione postes ao estoque usando o formulário acima.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    // Ordenar por quantidade (negativos primeiro, depois por quantidade decrescente)
    const estoqueOrdenado = [...estoque].sort((a, b) => {
        const qA = a.quantidadeAtual || 0;
        const qB = b.quantidadeAtual || 0;
        
        // Negativos primeiro
        if (qA < 0 && qB >= 0) return -1;
        if (qA >= 0 && qB < 0) return 1;
        
        // Dentro da mesma categoria, por quantidade
        if (qA < 0 && qB < 0) return qA - qB; // Mais negativo primeiro
        return qB - qA; // Maior quantidade primeiro
    });
    
    estoqueOrdenado.forEach(item => {
        const element = createEstoqueItem(item);
        container.appendChild(element);
    });
}

function createEstoqueItem(item) {
    const element = document.createElement('div');
    const quantidade = item.quantidadeAtual || 0;
    const statusClass = getStatusClass(quantidade);
    
    element.className = `mobile-list-item ${statusClass}`;
    
    element.innerHTML = `
        <div class="item-header">
            <span class="item-status ${statusClass}">
                ${getStatusText(quantidade)}
            </span>
            <span class="item-code">${item.codigoPoste || 'N/A'}</span>
        </div>
        
        <div class="item-content">
            <div class="item-quantidade ${statusClass}">${quantidade}</div>
            <div class="item-title">${item.descricaoPoste || 'Descrição não disponível'}</div>
            <div class="item-details">Preço: ${formatCurrency(item.precoPoste || 0)}</div>
        </div>
        
        <div class="item-date">
            Atualizado: ${formatDateBR(item.dataAtualizacao)}
        </div>
    `;
    
    return element;
}

function getStatusClass(quantidade) {
    if (quantidade > 0) return 'positivo';
    if (quantidade < 0) return 'negativo';
    return 'zero';
}

function getStatusText(quantidade) {
    if (quantidade > 0) return '✅ Disponível';
    if (quantidade < 0) return '⚠️ Negativo';
    return '📦 Esgotado';
}

// Filtros e resumo
function applyFilters() {
    const { status, codigo, descricao } = state.filters;
    
    let filtered = [...state.estoque];
    
    if (status) {
        filtered = filtered.filter(item => {
            const quantidade = item.quantidadeAtual || 0;
            switch (status) {
                case 'positivo': return quantidade > 0;
                case 'zero': return quantidade === 0;
                case 'negativo': return quantidade < 0;
                default: return true;
            }
        });
    }
    
    if (codigo) {
        const searchTerm = codigo.toLowerCase();
        filtered = filtered.filter(item => 
            item.codigoPoste && item.codigoPoste.toLowerCase().includes(searchTerm)
        );
    }
    
    if (descricao) {
        const searchTerm = descricao.toLowerCase();
        filtered = filtered.filter(item => 
            item.descricaoPoste && item.descricaoPoste.toLowerCase().includes(searchTerm)
        );
    }
    
    displayEstoque(filtered);
}

function updateResumo() {
    const estoque = state.estoque;
    
    const total = estoque.length;
    const positivo = estoque.filter(item => (item.quantidadeAtual || 0) > 0).length;
    const negativo = estoque.filter(item => (item.quantidadeAtual || 0) < 0).length;
    const zero = estoque.filter(item => (item.quantidadeAtual || 0) === 0).length;
    
    updateElement('total-tipos', total);
    updateElement('estoque-positivo', positivo);
    updateElement('estoque-negativo', negativo);
    updateElement('estoque-zero', zero);
}

function updateAlertas() {
    const estoqueNegativo = state.estoque.filter(item => (item.quantidadeAtual || 0) < 0);
    const estoqueZero = state.estoque.filter(item => (item.quantidadeAtual || 0) === 0);
    
    const alertasSection = document.getElementById('alertas-section');
    const alertasList = document.getElementById('alertas-list');
    
    if (!alertasSection || !alertasList) return;
    
    if (estoqueNegativo.length === 0 && estoqueZero.length === 0) {
        alertasSection.style.display = 'none';
        return;
    }
    
    alertasSection.style.display = 'block';
    alertasList.innerHTML = '';
    
    // Alertas de estoque negativo
    estoqueNegativo.forEach(item => {
        const alertItem = createAlertItem(item, 'negativo', 'Estoque Negativo');
        alertasList.appendChild(alertItem);
    });
    
    // Alertas de estoque zero (máximo 5)
    estoqueZero.slice(0, 5).forEach(item => {
        const alertItem = createAlertItem(item, 'zero', 'Estoque Esgotado');
        alertasList.appendChild(alertItem);
    });
    
    // Indicador de mais itens
    if (estoqueZero.length > 5) {
        const moreItem = document.createElement('div');
        moreItem.className = 'alert-item zero';
        moreItem.innerHTML = `
            <span class="alert-icon">📦</span>
            <div class="alert-info">
                <h4>Mais Itens</h4>
                <p>+${estoqueZero.length - 5} outros postes com estoque zero</p>
            </div>
        `;
        alertasList.appendChild(moreItem);
    }
}

function createAlertItem(item, type, title) {
    const alertItem = document.createElement('div');
    alertItem.className = `alert-item ${type}`;
    
    const icon = type === 'negativo' ? '⚠️' : '📦';
    
    alertItem.innerHTML = `
        <span class="alert-icon">${icon}</span>
        <div class="alert-info">
            <h4>${title}</h4>
            <p><strong>${item.codigoPoste}</strong> - Quantidade: ${item.quantidadeAtual}</p>
        </div>
    `;
    
    return alertItem;
}

// Utilitários
function resetForm() {
    document.getElementById('estoque-form').reset();
}

function limparFiltros() {
    document.getElementById('filtro-status').value = '';
    document.getElementById('filtro-codigo').value = '';
    document.getElementById('filtro-descricao').value = '';
    
    state.filters = { status: '', codigo: '', descricao: '' };
    applyFilters();
    showAlert('Filtros limpos', 'success');
}

async function exportarEstoque() {
    if (!state.estoque || state.estoque.length === 0) {
        showAlert('Nenhum estoque para exportar', 'warning');
        return;
    }
    
    const dadosExportar = state.estoque.map(item => ({
        'Código': item.codigoPoste || 'N/A',
        'Descrição': item.descricaoPoste || 'Descrição não disponível',
        'Quantidade': item.quantidadeAtual || 0,
        'Status': getStatusText(item.quantidadeAtual || 0),
        'Última Atualização': formatDateBR(item.dataAtualizacao)
    }));
    
    exportToCSV(dadosExportar, `estoque_${new Date().toISOString().split('T')[0]}`);
}

async function loadEstoque() {
    try {
        // Limpar cache para forçar nova requisição
        cache.clear();
        
        await carregarDados();
        showAlert('Dados atualizados com sucesso!', 'success');
        
    } catch (error) {
        console.error('Erro ao atualizar estoque:', error);
        showAlert('Erro ao atualizar. Verifique sua conexão.', 'error');
    }
}

// Formatters
function formatCurrency(value) {
    if (value == null || isNaN(value)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

function formatDateBR(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
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

console.log('✅ Estoque Mobile carregado com otimizações para cold start');