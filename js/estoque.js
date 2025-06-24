// Estoque JavaScript - Versão Leve
// Utiliza AppUtils para funcionalidades compartilhadas

// Aguardar AppUtils estar disponível
document.addEventListener('DOMContentLoaded', () => {
    // Verificar se AppUtils está disponível
    if (!window.AppUtils) {
        console.error('AppUtils não carregado! Verifique se utils.js foi incluído.');
        return;
    }
    
    initEstoque();
});

// Estado local
let estoqueData = {
    estoque: [],
    postes: [],
    filters: { status: '', codigo: '', descricao: '' }
};

// ================================
// INICIALIZAÇÃO
// ================================
async function initEstoque() {
    console.log('🎯 Inicializando Estoque...');
    
    try {
        setupEventListeners();
        await loadData();
        console.log('✅ Estoque carregado');
    } catch (error) {
        console.error('❌ Erro ao carregar:', error);
        window.AppUtils.showAlert('Erro ao carregar dados. Verifique sua conexão.', 'error');
    }
}

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
    window.AppUtils.setupFilters({
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
        window.AppUtils.showLoading(true);
        
        const [estoque, postes] = await Promise.all([
            fetchEstoque(),
            fetchPostes()
        ]);
        
        estoqueData.estoque = estoque || [];
        estoqueData.postes = postes || [];
        
        enrichEstoqueData();
        populatePosteSelect();
        updateResumo();
        applyFilters();
        
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        throw error;
    } finally {
        window.AppUtils.showLoading(false);
    }
}

async function fetchEstoque() {
    return await window.AppUtils.apiRequest('/estoque');
}

async function fetchPostes() {
    const postes = await window.AppUtils.apiRequest('/postes');
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
        
        window.AppUtils.showLoading(true);
        
        await window.AppUtils.apiRequest('/estoque/adicionar', {
            method: 'POST',
            body: JSON.stringify(formData),
            skipCache: true
        });
        
        window.AppUtils.showAlert('Estoque adicionado com sucesso!', 'success');
        resetForm();
        
        window.AppUtils.clearCache();
        await loadData();
        
    } catch (error) {
        console.error('Erro ao adicionar estoque:', error);
        window.AppUtils.showAlert('Erro ao adicionar estoque: ' + error.message, 'error');
    } finally {
        window.AppUtils.showLoading(false);
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
    if (!window.AppUtils.validateRequired(data.posteId, 'Poste')) {
        return false;
    }
    
    return window.AppUtils.validateNumber(data.quantidade, 'Quantidade', 0);
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
        option.textContent = `${poste.codigo} - ${poste.descricao} (${window.AppUtils.formatCurrency(poste.preco)})`;
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
            <div class="item-details">Preço: ${window.AppUtils.formatCurrency(precoPoste)}</div>
        </div>
        
        <div class="item-date">
            Atualizado: ${window.AppUtils.formatDateBR(item.dataAtualizacao, true)}
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
    
    window.AppUtils.updateElement('total-tipos', total);
    window.AppUtils.updateElement('estoque-positivo', positivo);
    window.AppUtils.updateElement('estoque-negativo', negativo);
    window.AppUtils.updateElement('estoque-zero', zero);
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
    window.AppUtils.showAlert('Filtros limpos', 'success');
}

async function exportarEstoque() {
    if (!estoqueData.estoque || estoqueData.estoque.length === 0) {
        window.AppUtils.showAlert('Nenhum estoque para exportar', 'warning');
        return;
    }
    
    const dadosExportar = estoqueData.estoque.map(item => ({
        'Código': item.codigoPoste || 'N/A',
        'Descrição': item.descricaoPoste || 'Descrição não disponível',
        'Preço': window.AppUtils.formatCurrency(item.precoPoste || 0),
        'Quantidade': item.quantidadeAtual || 0,
        'Status': getStatusText(item.quantidadeAtual || 0),
        'Última Atualização': window.AppUtils.formatDateBR(item.dataAtualizacao, true)
    }));
    
    window.AppUtils.exportToCSV(dadosExportar, `estoque_${new Date().toISOString().split('T')[0]}`);
}

async function loadEstoque() {
    try {
        window.AppUtils.clearCache();
        await loadData();
        window.AppUtils.showAlert('Dados atualizados com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao atualizar estoque:', error);
        window.AppUtils.showAlert('Erro ao atualizar. Verifique sua conexão.', 'error');
    }
}

// Disponibilizar funções globalmente
window.limparFiltros = limparFiltros;
window.exportarEstoque = exportarEstoque;
window.loadEstoque = loadEstoque;

console.log('✅ Estoque leve carregado');