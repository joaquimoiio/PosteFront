// Estoque JavaScript - Sistema de Controle de Estoque
const CONFIG = {
    API_BASE: 'http://localhost:8080/api'
};

// Estado global
let estoqueData = {
    estoque: [],
    filteredEstoque: [],
    postes: [],
    currentEditId: null,
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
    
    const definirMinimoForm = document.getElementById('definir-minimo-form');
    if (definirMinimoForm) {
        definirMinimoForm.addEventListener('submit', handleDefinirMinimoSubmit);
    }
}

function setupFilters() {
    const filterElements = {
        'filtro-status-estoque': 'status',
        'filtro-codigo-estoque': 'codigo',
        'filtro-descricao-estoque': 'descricao'
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
            switch (status) {
                case 'com-estoque':
                    return item.quantidadeAtual > 0;
                case 'sem-estoque':
                    return item.quantidadeAtual === 0;
                case 'abaixo-minimo':
                    return item.estoqueAbaixoMinimo;
                default:
                    return true;
            }
        });
    }
    
    if (codigo) {
        const searchTerm = codigo.toLowerCase();
        filtered = filtered.filter(item => 
            item.codigoPoste.toLowerCase().includes(searchTerm)
        );
    }
    
    if (descricao) {
        const searchTerm = descricao.toLowerCase();
        filtered = filtered.filter(item => 
            item.descricaoPoste.toLowerCase().includes(searchTerm)
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
        estoqueData.estoque = estoque;
        estoqueData.filteredEstoque = [...estoque];
        displayEstoque(estoque);
        updateResumo(estoque);
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
    
    // Limpar opções existentes (exceto a primeira)
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

function updateResumo(estoque) {
    const totalItens = estoque.reduce((sum, item) => sum + item.quantidadeAtual, 0);
    const postesComEstoque = estoque.filter(item => item.quantidadeAtual > 0).length;
    const postesSemEstoque = estoque.filter(item => item.quantidadeAtual === 0).length;
    const postesAbaixoMinimo = estoque.filter(item => item.estoqueAbaixoMinimo).length;
    
    const elements = {
        'total-itens-estoque': totalItens.toString(),
        'postes-com-estoque': postesComEstoque.toString(),
        'postes-sem-estoque': postesSemEstoque.toString(),
        'postes-abaixo-minimo': postesAbaixoMinimo.toString()
    };
    
    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    });
}

function displayEstoque(estoque) {
    const tbody = document.querySelector('#estoque-table tbody');
    if (!tbody) return;
    
    if (!estoque || estoque.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-table">
                    <div class="empty-state">
                        <div class="empty-icon">📦</div>
                        <h3>Nenhum item no estoque</h3>
                        <p>Adicione produtos ao estoque usando o formulário acima.</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = '';
    
    estoque.forEach(item => {
        const row = document.createElement('tr');
        
        // Aplicar classes baseadas no status do estoque
        if (item.quantidadeAtual === 0) {
            row.classList.add('sem-estoque-row');
        } else if (item.estoqueAbaixoMinimo) {
            row.classList.add('alerta-row');
        }
        
        row.innerHTML = `
            <td data-label="Código">
                <strong>${item.codigoPoste}</strong>
            </td>
            <td data-label="Descrição">
                <div style="max-width: 300px; overflow: hidden; text-overflow: ellipsis;" 
                     title="${item.descricaoPoste}">
                    ${item.descricaoPoste}
                </div>
            </td>
            <td class="currency" data-label="Preço">${formatCurrency(item.precoPoste)}</td>
            <td class="quantity ${getQuantityClass(item)}" data-label="Qtd. Atual">
                <strong>${item.quantidadeAtual}</strong>
            </td>
            <td class="quantity" data-label="Qtd. Mínima">
                ${item.quantidadeMinima || 0}
            </td>
            <td data-label="Status">
                <span class="status ${getStatusClass(item)}">
                    ${getStatusText(item)}
                </span>
            </td>
            <td class="date" data-label="Última Atualização">
                ${item.dataAtualizacao ? formatDateBR(item.dataAtualizacao) : '-'}
            </td>
            <td data-label="Ações">
                <div class="table-actions">
                    <button class="btn btn-warning btn-small" 
                            onclick="abrirDefinirMinimo(${item.posteId}, '${item.codigoPoste}', ${item.quantidadeMinima || 0})" 
                            title="Definir quantidade mínima">
                        <span class="btn-icon">⚙️</span>
                        Mínimo
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function getQuantityClass(item) {
    if (item.quantidadeAtual === 0) return 'zero';
    if (item.estoqueAbaixoMinimo) return 'low';
    return 'ok';
}

function getStatusClass(item) {
    if (item.quantidadeAtual === 0) return 'sem-estoque';
    if (item.estoqueAbaixoMinimo) return 'alerta';
    return 'com-estoque';
}

function getStatusText(item) {
    if (item.quantidadeAtual === 0) return '❌ Sem estoque';
    if (item.estoqueAbaixoMinimo) return '⚠️ Abaixo do mínimo';
    return '✅ Com estoque';
}

function displayEstoqueError() {
    const tbody = document.querySelector('#estoque-table tbody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-table">
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

async function handleEstoqueSubmit(e) {
    e.preventDefault();
    
    const formData = {
        posteId: parseInt(document.getElementById('estoque-poste').value),
        quantidade: parseInt(document.getElementById('estoque-quantidade').value),
        observacao: document.getElementById('estoque-observacao').value.trim()
    };
    
    const erros = validarEstoque(formData);
    if (erros.length > 0) {
        showAlert(erros.join(', '), 'warning');
        return;
    }
    
    try {
        showLoading(true);
        await apiRequest('/estoque/adicionar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        showAlert('Estoque adicionado com sucesso!', 'success');
        
        e.target.reset();
        
        await loadEstoque();
        
    } catch (error) {
        console.error('Erro ao adicionar estoque:', error);
        showAlert('Erro ao adicionar estoque: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function handleDefinirMinimoSubmit(e) {
    e.preventDefault();
    
    const quantidadeMinima = parseInt(document.getElementById('modal-quantidade-minima').value);
    
    if (quantidadeMinima < 0) {
        showAlert('Quantidade mínima não pode ser negativa', 'warning');
        return;
    }
    
    try {
        showLoading(true);
        await apiRequest(`/estoque/quantidade-minima/${estoqueData.currentEditId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ quantidadeMinima })
        });
        
        showAlert('Quantidade mínima definida com sucesso!', 'success');
        
        closeModal('definir-minimo-modal');
        
        await loadEstoque();
        
    } catch (error) {
        console.error('Erro ao definir quantidade mínima:', error);
        showAlert('Erro ao definir quantidade mínima', 'error');
    } finally {
        showLoading(false);
    }
}

function abrirDefinirMinimo(posteId, codigoPoste, quantidadeAtual) {
    document.getElementById('modal-poste-codigo').value = `${codigoPoste} - Definir Mínimo`;
    document.getElementById('modal-quantidade-minima').value = quantidadeAtual;
    
    estoqueData.currentEditId = posteId;
    document.getElementById('definir-minimo-modal').style.display = 'block';
}

function validarEstoque(dados) {
    const erros = [];
    
    if (!dados.posteId || dados.posteId <= 0) {
        erros.push('Selecione um poste válido');
    }
    
    if (!dados.quantidade || dados.quantidade <= 0) {
        erros.push('Quantidade deve ser maior que zero');
    }
    
    return erros;
}

function exportarEstoque() {
    if (!estoqueData.filteredEstoque || estoqueData.filteredEstoque.length === 0) {
        showAlert('Nenhum item no estoque para exportar', 'warning');
        return;
    }
    
    const dadosExportar = estoqueData.filteredEstoque.map(item => ({
        'Código': item.codigoPoste,
        'Descrição': item.descricaoPoste,
        'Preço Unitário': item.precoPoste,
        'Quantidade Atual': item.quantidadeAtual,
        'Quantidade Mínima': item.quantidadeMinima || 0,
        'Status': getStatusText(item),
        'Última Atualização': item.dataAtualizacao ? formatDateBR(item.dataAtualizacao) : '-',
        'Poste Ativo': item.posteAtivo ? 'Sim' : 'Não'
    }));
    
    exportToCSV(dadosExportar, `estoque_${new Date().toISOString().split('T')[0]}`);
}

function limparFiltros() {
    document.getElementById('filtro-status-estoque').value = '';
    document.getElementById('filtro-codigo-estoque').value = '';
    document.getElementById('filtro-descricao-estoque').value = '';
    
    estoqueData.filters = {
        status: '',
        codigo: '',
        descricao: ''
    };
    
    applyFilters();
    showAlert('Filtros limpos', 'success');
}

async function verificarEstoqueDisponivel(posteId, quantidade) {
    try {
        const response = await apiRequest('/estoque/verificar-disponibilidade', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ posteId, quantidade })
        });
        
        return response.disponivel;
    } catch (error) {
        console.error('Erro ao verificar disponibilidade:', error);
        return false;
    }
}

// Utilitários
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

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
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

// Eventos do modal
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('close')) {
        const modal = e.target.closest('.modal');
        if (modal) {
            closeModal(modal.id);
        }
    }
});

// Fechar modal com ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (modal.style.display === 'block') {
                closeModal(modal.id);
            }
        });
    }
});

// Funções globais para os botões
window.loadEstoque = loadEstoque;
window.exportarEstoque = exportarEstoque;
window.limparFiltros = limparFiltros;
window.abrirDefinirMinimo = abrirDefinirMinimo;
window.closeModal = closeModal;
window.verificarEstoqueDisponivel = verificarEstoqueDisponivel;

console.log('✅ Estoque JavaScript carregado com sucesso');