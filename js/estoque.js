// Estoque JavaScript - VERSÃO SIMPLIFICADA SEM VALIDAÇÕES
const CONFIG = {
    API_BASE: 'http://localhost:8080/api'
};

// Estado global
let estoqueData = {
    estoque: [],
    filteredEstoque: [],
    postes: [],
    filters: {
        status: '',
        codigo: '',
        descricao: ''
    }
};

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎯 Inicializando página de Estoque...');
    
    try {
        await loadPostes();
        await loadEstoque();
        setupEventListeners();
        setupFilters();
        
        console.log('✅ Página de Estoque carregada com sucesso');
    } catch (error) {
        console.error('❌ Erro ao carregar página de Estoque:', error);
        showAlert('Erro ao carregar dados de estoque', 'error');
    }
});

function setupEventListeners() {
    const estoqueForm = document.getElementById('estoque-form');
    if (estoqueForm) {
        estoqueForm.addEventListener('submit', handleEstoqueSubmit);
    }
}

function setupFilters() {
    const filterElements = {
        'filtro-status': 'status',
        'filtro-codigo': 'codigo',
        'filtro-descricao': 'descricao'
    };
    
    Object.entries(filterElements).forEach(([elementId, filterKey]) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener('input', debounce(() => {
                estoqueData.filters[filterKey] = element.value;
                applyFilters();
            }, 300));
        }
    });
}

function applyFilters() {
    const { status, codigo, descricao } = estoqueData.filters;
    
    let filtered = [...estoqueData.estoque];
    
    if (status) {
        filtered = filtered.filter(item => {
            const quantidade = item.quantidadeAtual || 0;
            switch (status) {
                case 'positivo':
                    return quantidade > 0;
                case 'zero':
                    return quantidade === 0;
                case 'negativo':
                    return quantidade < 0;
                default:
                    return true;
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
    
    estoqueData.filteredEstoque = filtered;
    displayEstoque(filtered);
}

// Funções de API
async function apiRequest(endpoint, options = {}) {
    try {
        const response = await fetch(`${CONFIG.API_BASE}${endpoint}`, options);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Erro na requisição ${endpoint}:`, error);
        throw error;
    }
}

async function loadPostes() {
    try {
        const postes = await apiRequest('/postes');
        estoqueData.postes = postes.filter(p => p.ativo);
        populatePosteSelect();
    } catch (error) {
        console.error('Erro ao carregar postes:', error);
        showAlert('Erro ao carregar lista de postes', 'warning');
    }
}

async function loadEstoque() {
    try {
        showLoading(true);
        const estoque = await apiRequest('/estoque');
        estoqueData.estoque = estoque || [];
        estoqueData.filteredEstoque = [...estoqueData.estoque];
        
        updateResumo();
        updateAlertas();
        displayEstoque(estoqueData.estoque);
        
    } catch (error) {
        console.error('Erro ao carregar estoque:', error);
        displayEstoqueError();
    } finally {
        showLoading(false);
    }
}

function populatePosteSelect() {
    const select = document.getElementById('estoque-poste');
    if (!select) return;
    
    // Limpar opções existentes exceto a primeira
    while (select.children.length > 1) {
        select.removeChild(select.lastChild);
    }
    
    // Adicionar opções dos postes
    estoqueData.postes.forEach(poste => {
        const option = document.createElement('option');
        option.value = poste.id;
        option.textContent = `${poste.codigo} - ${poste.descricao} (${formatCurrency(poste.preco)})`;
        select.appendChild(option);
    });
}

async function handleEstoqueSubmit(e) {
    e.preventDefault();
    
    const formData = {
        posteId: parseInt(document.getElementById('estoque-poste').value),
        quantidade: parseInt(document.getElementById('estoque-quantidade').value),
        observacao: document.getElementById('estoque-observacao').value.trim() || null
    };
    
    if (!formData.posteId || !formData.quantidade || formData.quantidade <= 0) {
        showAlert('Selecione um poste e informe uma quantidade válida', 'warning');
        return;
    }
    
    try {
        showLoading(true);
        
        await apiRequest('/estoque/adicionar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        showAlert('Estoque adicionado com sucesso!', 'success');
        
        e.target.reset();
        await loadEstoque();
        
    } catch (error) {
        console.error('Erro ao adicionar estoque:', error);
        showAlert('Erro ao adicionar estoque', 'error');
    } finally {
        showLoading(false);
    }
}

function updateResumo() {
    const estoque = estoqueData.estoque;
    
    const totalTipos = estoque.length;
    const estoquePositivo = estoque.filter(item => (item.quantidadeAtual || 0) > 0).length;
    const estoqueNegativo = estoque.filter(item => (item.quantidadeAtual || 0) < 0).length;
    const estoqueZero = estoque.filter(item => (item.quantidadeAtual || 0) === 0).length;
    
    updateElement('total-tipos-postes', totalTipos);
    updateElement('total-estoque-positivo', estoquePositivo);
    updateElement('total-estoque-negativo', estoqueNegativo);
    updateElement('total-estoque-zero', estoqueZero);
}

function updateAlertas() {
    const alertasContainer = document.getElementById('estoque-alertas');
    if (!alertasContainer) return;
    
    const estoqueNegativo = estoqueData.estoque.filter(item => (item.quantidadeAtual || 0) < 0);
    const estoqueZero = estoqueData.estoque.filter(item => (item.quantidadeAtual || 0) === 0);
    
    alertasContainer.innerHTML = '';
    
    if (estoqueNegativo.length === 0 && estoqueZero.length === 0) {
        alertasContainer.innerHTML = `
            <div class="alert-placeholder">
                <span class="alert-icon">✅</span>
                <p>Nenhum alerta de estoque no momento</p>
            </div>
        `;
        return;
    }
    
    // Alertas de estoque negativo
    estoqueNegativo.forEach(item => {
        const alertCard = document.createElement('div');
        alertCard.className = 'alert-card negativo';
        alertCard.innerHTML = `
            <span class="alert-icon">⚠️</span>
            <div class="alert-info">
                <h4>Estoque Negativo</h4>
                <p><strong>${item.codigoPoste}</strong> - Quantidade: ${item.quantidadeAtual}</p>
            </div>
        `;
        alertasContainer.appendChild(alertCard);
    });
    
    // Alertas de estoque zero (máximo 5)
    estoqueZero.slice(0, 5).forEach(item => {
        const alertCard = document.createElement('div');
        alertCard.className = 'alert-card zerado';
        alertCard.innerHTML = `
            <span class="alert-icon">📦</span>
            <div class="alert-info">
                <h4>Estoque Esgotado</h4>
                <p><strong>${item.codigoPoste}</strong> - Quantidade: 0</p>
            </div>
        `;
        alertasContainer.appendChild(alertCard);
    });
    
    // Se há mais itens em estoque zero
    if (estoqueZero.length > 5) {
        const alertCard = document.createElement('div');
        alertCard.className = 'alert-card zerado';
        alertCard.innerHTML = `
            <span class="alert-icon">📦</span>
            <div class="alert-info">
                <h4>Mais Itens</h4>
                <p>+${estoqueZero.length - 5} outros postes com estoque zero</p>
            </div>
        `;
        alertasContainer.appendChild(alertCard);
    }
}

function displayEstoque(estoque) {
    const tbody = document.querySelector('#estoque-table tbody');
    if (!tbody) return;
    
    if (!estoque || estoque.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-table">
                    <div class="empty-state">
                        <div class="empty-icon">📦</div>
                        <h3>Nenhum estoque encontrado</h3>
                        <p>Adicione postes ao estoque usando o formulário acima.</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = '';
    
    // Ordenar: negativos primeiro, depois zeros, depois positivos (decrescente)
    const estoqueOrdenado = [...estoque].sort((a, b) => {
        const qA = a.quantidadeAtual || 0;
        const qB = b.quantidadeAtual || 0;
        
        // Se ambos negativos, o mais negativo primeiro
        if (qA < 0 && qB < 0) return qA - qB;
        
        // Negativos sempre primeiro
        if (qA < 0 && qB >= 0) return -1;
        if (qA >= 0 && qB < 0) return 1;
        
        // Depois zeros e positivos por quantidade decrescente
        return qB - qA;
    });
    
    estoqueOrdenado.forEach(item => {
        const row = document.createElement('tr');
        const quantidade = item.quantidadeAtual || 0;
        
        // Aplicar classe CSS baseada na quantidade
        if (quantidade > 0) {
            row.className = 'estoque-positivo';
        } else if (quantidade < 0) {
            row.className = 'estoque-negativo';
        } else {
            row.className = 'estoque-zero';
        }
        
        row.innerHTML = `
            <td data-label="Código"><strong>${item.codigoPoste || 'N/A'}</strong></td>
            <td data-label="Descrição">
                <div style="max-width: 300px; overflow: hidden; text-overflow: ellipsis;" 
                     title="${item.descricaoPoste || 'Descrição não disponível'}">
                    ${item.descricaoPoste || 'Descrição não disponível'}
                </div>
            </td>
            <td class="quantidade ${getQuantidadeClass(quantidade)}" data-label="Quantidade">
                ${quantidade}
            </td>
            <td data-label="Status">
                <span class="status ${getQuantidadeClass(quantidade)}">
                    ${getStatusText(quantidade)}
                </span>
            </td>
            <td class="date" data-label="Última Atualização">
                ${formatDateBR(item.dataAtualizacao)}
            </td>
        `;
        tbody.appendChild(row);
    });
}

function getQuantidadeClass(quantidade) {
    if (quantidade > 0) return 'positivo';
    if (quantidade < 0) return 'negativo';
    return 'zero';
}

function getStatusText(quantidade) {
    if (quantidade > 0) return '✅ Disponível';
    if (quantidade < 0) return '⚠️ Negativo';
    return '📦 Esgotado';
}

function displayEstoqueError() {
    const tbody = document.querySelector('#estoque-table tbody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-table">
                    <div class="empty-state">
                        <div class="empty-icon">❌</div>
                        <h3>Erro ao carregar estoque</h3>
                        <button class="btn btn-secondary" onclick="loadEstoque()">Tentar Novamente</button>
                    </div>
                </td>
            </tr>
        `;
    }
}

function exportarEstoque() {
    if (!estoqueData.filteredEstoque || estoqueData.filteredEstoque.length === 0) {
        showAlert('Nenhum estoque para exportar', 'warning');
        return;
    }
    
    const dadosExportar = estoqueData.filteredEstoque.map(item => ({
        'Código': item.codigoPoste || 'N/A',
        'Descrição': item.descricaoPoste || 'Descrição não disponível',
        'Quantidade Atual': item.quantidadeAtual || 0,
        'Status': getStatusText(item.quantidadeAtual || 0),
        'Última Atualização': formatDateBR(item.dataAtualizacao)
    }));
    
    exportToCSV(dadosExportar, `estoque_${new Date().toISOString().split('T')[0]}`);
}

function limparFiltros() {
    document.getElementById('filtro-status').value = '';
    document.getElementById('filtro-codigo').value = '';
    document.getElementById('filtro-descricao').value = '';
    
    estoqueData.filters = {
        status: '',
        codigo: '',
        descricao: ''
    };
    
    applyFilters();
    showAlert('Filtros limpos', 'success');
}

// Utilitários
function updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value.toString();
    }
}

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

function showLoading(show) {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = show ? 'flex' : 'none';
    }
}

function showAlert(message, type = 'success', duration = 5000) {
    const alertContainer = document.getElementById('alert-container');
    
    if (!alertContainer) {
        console.warn('Container de alertas não encontrado');
        return;
    }
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    
    alertContainer.appendChild(alert);
    
    setTimeout(() => {
        if (alert.parentNode) {
            alert.remove();
        }
    }, duration);
    
    console.log(`📢 Alerta: ${message} (${type})`);
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

console.log('✅ Estoque simplificado carregado');