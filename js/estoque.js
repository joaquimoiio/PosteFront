// Estoque JavaScript - Versão Leve
// Utiliza AppUtils para funcionalidades compartilhadas

const { 
    apiRequest, clearCache, formatCurrency, formatDateBR,
    updateElement, showLoading, showAlert, setupFilters,
    validateRequired, validateNumber, exportToCSV
} = window.AppUtils;

// Estado local
let estoqueData = {
    estoque: [],
    postes: [],
    filters: { status: '', codigo: '', descricao: '' }
};

// ================================
// INICIALIZAÇÃO
// ================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎯 Inicializando Estoque...');
    
    try {
        setupEventListeners();
        await loadData();
        console.log('✅ Estoque carregado');
    } catch (error) {
        console.error('❌ Erro ao carregar:', error);
        showAlert('Erro ao carregar dados. Verifique sua conexão.', 'error');
    }
});

// ================================
// EVENT LISTENERS
// ================================
function setupEventListeners() {
    // Form principal
    const estoqueForm = document.getElementById('estoque-form');
    if (estoqueForm) {
        estoqueForm.addEventListener('submit', handleEstoqueSubmit);
        estoqueForm.addEventListener('reset', resetForm);
    }
    
    // Filtros
    setupFilters({
        'filtro-status': 'status',
        'filtro-codigo': 'codigo',
        'filtro-descricao': 'descricao'
    }, applyFilters);
}

// ================================
// CARREGAMENTO DE DADOS
// ================================
async function loadData() {
    try {
        showLoading(true);
        
        const [estoque, postes] = await Promise.all([
            fetchEstoque(),
            fetchPostes()
        ]);
        
        estoqueData.estoque = estoque || [];
        estoqueData.postes = postes || [];
        
        enrichEstoqueData();
        populatePosteSelect();
        updateResumo();
        updateAlertas();
        applyFilters();
        
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        throw error;
    } finally {
        showLoading(false);
    }
}

async function fetchEstoque() {
    return await apiRequest('/estoque');
}

async function fetchPostes() {
    const postes = await apiRequest('/postes');
    return (postes || []).filter(p => p.ativo);
}

// Enriquecer dados do estoque com informações dos postes
function enrichEstoqueData() {
    estoqueData.estoque.forEach(item => {
        const poste = estoqueData.postes.find(p => p.id === item.posteId);
        if (poste) {
            item.codigoPoste = poste.codigo;
            item.descricaoPoste = poste.descricao;
            item.precoPoste = poste.preco;
        } else {
            item.codigoPoste = item.codigoPoste || 'N/A';
            item.descricaoPoste = item.descricaoPoste || 'Poste não encontrado';
            item.precoPoste = item.precoPoste || 0;
        }
    });
}

// ================================
// MANIPULAÇÃO DO FORMULÁRIO
// ================================
async function handleEstoqueSubmit(e) {
    e.preventDefault();
    
    try {
        const formData = buildFormData();
        
        if (!validateFormData(formData)) {
            return;
        }
        
        showLoading(true);
        
        await apiRequest('/estoque/adicionar', {
            method: 'POST',
            body: JSON.stringify(formData),
            skipCache: true
        });
        
        showAlert('Estoque adicionado com sucesso!', 'success');
        resetForm();
        
        clearCache();
        await loadData();
        
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
    if (!validateRequired(data.posteId, 'Poste')) {
        return false;
    }
    
    return validateNumber(data.quantidade, 'Quantidade', 0);
}

// ================================
// POPULATE SELECTS
// ================================
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

// ================================
// DISPLAY ESTOQUE
// ================================
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
        if (qA < 0 && qB < 0) return qA - qB;
        return qB - qA;
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
    
    const codigoPoste = item.codigoPoste || 'N/A';
    const descricaoPoste = item.descricaoPoste || 'Descrição não disponível';
    const precoPoste = item.precoPoste || 0;
    
    element.innerHTML = `
        <div class="item-header">
            <span class="item-status ${statusClass}">
                ${getStatusText(quantidade)}
            </span>
            <span class="item-code">${codigoPoste}</span>
        </div>
        
        <div class="item-content">
            <div class="item-quantidade ${statusClass}">${quantidade}</div>
            <div class="item-title">${codigoPoste} - ${descricaoPoste}</div>
            <div class="item-details">Preço: ${formatCurrency(precoPoste)}</div>
        </div>
        
        <div class="item-date">
            Atualizado: ${formatDateBR(item.dataAtualizacao, true)}
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

// ================================
// FILTROS E RESUMO
// ================================
function applyFilters() {
    const { status, codigo, descricao } = estoqueData.filters;
    
    let filtered = [...estoqueData.estoque];
    
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
    const estoque = estoqueData.estoque;
    
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
    const estoqueNegativo = estoqueData.estoque.filter(item => (item.quantidadeAtual || 0) < 0);
    const estoqueZero = estoqueData.estoque.filter(item => (item.quantidadeAtual || 0) === 0);
    
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
    const codigoPoste = item.codigoPoste || 'N/A';
    const descricaoPoste = item.descricaoPoste || 'Poste não encontrado';
    
    alertItem.innerHTML = `
        <span class="alert-icon">${icon}</span>
        <div class="alert-info">
            <h4>${title}</h4>
            <p><strong>${codigoPoste} - ${descricaoPoste}</strong></p>
            <p>Quantidade: ${item.quantidadeAtual}</p>
        </div>
    `;
    
    return alertItem;
}

// ================================
// HELPER FUNCTIONS
// ================================
function resetForm() {
    document.getElementById('estoque-form').reset();
}

// ================================
// FUNÇÕES GLOBAIS
// ================================
function limparFiltros() {
    document.getElementById('filtro-status').value = '';
    document.getElementById('filtro-codigo').value = '';
    document.getElementById('filtro-descricao').value = '';
    
    estoqueData.filters = { status: '', codigo: '', descricao: '' };
    applyFilters();
    showAlert('Filtros limpos', 'success');
}

async function exportarEstoque() {
    if (!estoqueData.estoque || estoqueData.estoque.length === 0) {
        showAlert('Nenhum estoque para exportar', 'warning');
        return;
    }
    
    const dadosExportar = estoqueData.estoque.map(item => ({
        'Código': item.codigoPoste || 'N/A',
        'Descrição': item.descricaoPoste || 'Descrição não disponível',
        'Preço': formatCurrency(item.precoPoste || 0),
        'Quantidade': item.quantidadeAtual || 0,
        'Status': getStatusText(item.quantidadeAtual || 0),
        'Última Atualização': formatDateBR(item.dataAtualizacao, true)
    }));
    
    exportToCSV(dadosExportar, `estoque_${new Date().toISOString().split('T')[0]}`);
}

async function loadEstoque() {
    try {
        clearCache();
        await loadData();
        showAlert('Dados atualizados com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao atualizar estoque:', error);
        showAlert('Erro ao atualizar. Verifique sua conexão.', 'error');
    }
}

// Disponibilizar funções globalmente
window.limparFiltros = limparFiltros;
window.exportarEstoque = exportarEstoque;
window.loadEstoque = loadEstoque;

console.log('✅ Estoque leve carregado');