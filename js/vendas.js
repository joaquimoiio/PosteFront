// Vendas JavaScript - Versão Leve
// Utiliza AppUtils para funcionalidades compartilhadas

// Aguardar AppUtils estar disponível
document.addEventListener('DOMContentLoaded', () => {
    // Verificar se AppUtils está disponível
    if (!window.AppUtils) {
        console.error('AppUtils não carregado! Verifique se utils.js foi incluído.');
        return;
    }
    
    initVendas();
});

// Estado local
let vendasData = {
    vendas: [],
    postes: [],
    currentEditId: null,
    filters: { tipo: '', dataInicio: '', dataFim: '' }
};

// ================================
// INICIALIZAÇÃO
// ================================
async function initVendas() {
    console.log('🎯 Inicializando Vendas...');
    
    try {
        setupEventListeners();
        setDefaultDateTime();
        window.AppUtils.setDefaultDateFilters('filtro-data-inicio', 'filtro-data-fim');
        await loadData();
        console.log('✅ Vendas carregado');
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
    const vendaForm = document.getElementById('venda-form');
    if (vendaForm) {
        vendaForm.addEventListener('submit', handleVendaSubmit);
        vendaForm.addEventListener('reset', resetForm);
    }
    
    // Form de edição
    const editForm = document.getElementById('edit-form');
    if (editForm) {
        editForm.addEventListener('submit', handleEditSubmit);
    }
    
    // Tipo de venda
    const vendaTipo = document.getElementById('venda-tipo');
    if (vendaTipo) {
        vendaTipo.addEventListener('change', handleTipoChange);
    }
    
    // Cálculo automático para tipo V
    const posteV = document.getElementById('venda-poste-v');
    const quantidadeV = document.getElementById('venda-quantidade-v');
    if (posteV && quantidadeV) {
        posteV.addEventListener('change', calcularValorVenda);
        quantidadeV.addEventListener('input', calcularValorVenda);
    }
    
    // Filtros
    window.AppUtils.setupFilters({
        'filtro-tipo-venda': 'tipo',
        'filtro-data-inicio': 'dataInicio',
        'filtro-data-fim': 'dataFim'
    }, applyFilters);
}

function setDefaultDateTime() {
    const vendaData = document.getElementById('venda-data');
    if (vendaData) {
        vendaData.value = window.AppUtils.getCurrentDateTime();
    }
}

// ================================
// CARREGAMENTO DE DADOS
// ================================
async function loadData() {
    try {
        window.AppUtils.showLoading(true);
        
        const [vendas, postes] = await Promise.all([
            fetchVendas(),
            fetchPostes()
        ]);
        
        vendasData.vendas = vendas || [];
        vendasData.postes = postes || [];
        
        populatePosteSelects();
        updateResumo();
        applyFilters();
        
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        throw error;
    } finally {
        window.AppUtils.showLoading(false);
    }
}

async function fetchVendas() {
    const params = new URLSearchParams();
    if (vendasData.filters.dataInicio) params.append('dataInicio', vendasData.filters.dataInicio);
    if (vendasData.filters.dataFim) params.append('dataFim', vendasData.filters.dataFim);
    
    const endpoint = params.toString() ? `/vendas?${params}` : '/vendas';
    return await window.AppUtils.apiRequest(endpoint);
}

async function fetchPostes() {
    const postes = await window.AppUtils.apiRequest('/postes');
    return (postes || []).filter(p => p.ativo);
}

// ================================
// MANIPULAÇÃO DO FORMULÁRIO
// ================================
async function handleVendaSubmit(e) {
    e.preventDefault();
    
    try {
        const formData = buildFormData();
        
        if (!validateFormData(formData)) {
            return;
        }
        
        window.AppUtils.showLoading(true);
        
        await window.AppUtils.apiRequest('/vendas', {
            method: 'POST',
            body: JSON.stringify(formData),
            skipCache: true
        });
        
        window.AppUtils.showAlert('Venda criada com sucesso!', 'success');
        resetForm();
        
        window.AppUtils.clearCache();
        await loadData();
        
    } catch (error) {
        console.error('Erro ao criar venda:', error);
        window.AppUtils.showAlert('Erro ao criar venda: ' + error.message, 'error');
    } finally {
        window.AppUtils.showLoading(false);
    }
}

function buildFormData() {
    const tipo = document.getElementById('venda-tipo').value;
    const data = document.getElementById('venda-data').value;
    const observacoes = document.getElementById('venda-observacoes').value.trim();
    
    let formData = {
        tipoVenda: tipo,
        dataVenda: data,
        observacoes: observacoes || null
    };
    
    switch (tipo) {
        case 'E':
            formData.valorExtra = parseFloat(document.getElementById('venda-valor-extra').value);
            break;
        case 'V':
            formData.posteId = parseInt(document.getElementById('venda-poste-v').value);
            formData.quantidade = parseInt(document.getElementById('venda-quantidade-v').value) || 1;
            formData.valorVenda = parseFloat(document.getElementById('venda-valor-total-v').value);
            break;
        case 'L':
            formData.posteId = parseInt(document.getElementById('venda-poste-l').value);
            formData.quantidade = parseInt(document.getElementById('venda-quantidade-l').value) || 1;
            formData.freteEletrons = parseFloat(document.getElementById('venda-frete-l').value) || 0;
            break;
    }
    
    return formData;
}

function validateFormData(data) {
    if (!window.AppUtils.validateRequired(data.tipoVenda, 'Tipo de venda') || 
        !window.AppUtils.validateRequired(data.dataVenda, 'Data da venda')) {
        return false;
    }
    
    switch (data.tipoVenda) {
        case 'E':
            return window.AppUtils.validateNumber(data.valorExtra, 'Valor extra', 0);
        case 'V':
            return window.AppUtils.validateRequired(data.posteId, 'Poste') && 
                   window.AppUtils.validateNumber(data.valorVenda, 'Valor de venda', 0);
        case 'L':
            return window.AppUtils.validateRequired(data.posteId, 'Poste');
    }
    
    return true;
}

// ================================
// MANIPULAÇÃO DE TIPOS
// ================================
function handleTipoChange(e) {
    const tipo = e.target.value;
    
    hideAllConditionalFields();
    clearAllFields();
    
    if (tipo) {
        const campos = document.getElementById(`campos-tipo-${tipo.toLowerCase()}`);
        if (campos) {
            campos.style.display = 'block';
        }
    }
}

function hideAllConditionalFields() {
    ['e', 'v', 'l'].forEach(tipo => {
        const campo = document.getElementById(`campos-tipo-${tipo}`);
        if (campo) campo.style.display = 'none';
    });
}

function clearAllFields() {
    const fields = [
        'venda-valor-extra', 'venda-poste-v', 'venda-quantidade-v', 
        'venda-valor-total-v', 'venda-poste-l', 'venda-quantidade-l', 'venda-frete-l'
    ];
    
    fields.forEach(id => {
        const field = document.getElementById(id);
        if (field) field.value = '';
    });
}

function calcularValorVenda() {
    const posteSelect = document.getElementById('venda-poste-v');
    const quantidadeInput = document.getElementById('venda-quantidade-v');
    const valorTotalInput = document.getElementById('venda-valor-total-v');
    
    if (!posteSelect || !quantidadeInput || !valorTotalInput) return;
    
    const posteId = parseInt(posteSelect.value);
    const quantidade = parseInt(quantidadeInput.value) || 1;
    
    if (posteId) {
        const poste = vendasData.postes.find(p => p.id === posteId);
        if (poste) {
            const valorCalculado = poste.preco * quantidade;
            valorTotalInput.value = valorCalculado.toFixed(2);
        }
    }
}

// ================================
// POPULATE SELECTS
// ================================
function populatePosteSelects() {
    const selects = ['venda-poste-v', 'venda-poste-l'];
    
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (!select) return;
        
        // Limpar opções existentes exceto a primeira
        while (select.children.length > 1) {
            select.removeChild(select.lastChild);
        }
        
        // Adicionar opções dos postes
        vendasData.postes.forEach(poste => {
            const option = document.createElement('option');
            option.value = poste.id;
            option.textContent = `${poste.codigo} - ${poste.descricao} (${window.AppUtils.formatCurrency(poste.preco)})`;
            select.appendChild(option);
        });
    });
}

// ================================
// DISPLAY VENDAS
// ================================
function displayVendas(vendas) {
    const container = document.getElementById('vendas-list');
    if (!container) return;
    
    if (!vendas || vendas.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📋</div>
                <h3>Nenhuma venda encontrada</h3>
                <p>Comece cadastrando sua primeira venda.</p>
                <button class="btn btn-primary" onclick="scrollToForm()">
                    Cadastrar Primeira Venda
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    vendas.forEach(venda => {
        const item = createVendaItem(venda);
        container.appendChild(item);
    });
}

function createVendaItem(venda) {
    const item = document.createElement('div');
    item.className = `mobile-list-item tipo-${venda.tipoVenda.toLowerCase()}`;
    
    item.innerHTML = `
        <div class="item-header">
            <span class="item-type ${venda.tipoVenda.toLowerCase()}">
                ${window.AppUtils.getTipoLabel(venda.tipoVenda)}
            </span>
            <span class="item-date">${window.AppUtils.formatDateBR(venda.dataVenda, true)}</span>
        </div>
        
        <div class="item-content">
            <div class="item-title">${getPosteDescricao(venda)}</div>
            <div class="item-value">${getValorVenda(venda)}</div>
            ${venda.observacoes ? `<div class="item-details">${venda.observacoes}</div>` : ''}
        </div>
        
        <div class="item-actions">
            <button class="btn btn-small btn-primary" onclick="editVenda(${venda.id})">
                ✏️ Editar
            </button>
            <button class="btn btn-small btn-danger" onclick="deleteVenda(${venda.id})">
                🗑️ Excluir
            </button>
        </div>
    `;
    
    return item;
}

// ================================
// CRUD OPERATIONS
// ================================
async function editVenda(id) {
    try {
        const venda = vendasData.vendas.find(v => v.id === id);
        if (!venda) {
            throw new Error('Venda não encontrada');
        }
        
        populateEditForm(venda);
        vendasData.currentEditId = id;
        window.AppUtils.showModal('edit-modal');
        
    } catch (error) {
        console.error('Erro ao carregar venda para edição:', error);
        window.AppUtils.showAlert('Erro ao carregar dados da venda: ' + error.message, 'error');
    }
}

function populateEditForm(venda) {
    document.getElementById('edit-tipo-venda').value = venda.tipoVenda;
    document.getElementById('edit-observacoes').value = venda.observacoes || '';
    
    // Mostrar/ocultar campos baseado no tipo
    const groups = {
        'edit-frete-group': venda.tipoVenda === 'L',
        'edit-valor-group': venda.tipoVenda === 'V',
        'edit-extra-group': venda.tipoVenda === 'E'
    };
    
    Object.entries(groups).forEach(([groupId, show]) => {
        const group = document.getElementById(groupId);
        if (group) group.style.display = show ? 'block' : 'none';
    });
    
    // Preencher valores
    switch (venda.tipoVenda) {
        case 'E':
            document.getElementById('edit-valor-extra').value = venda.valorExtra || '';
            break;
        case 'V':
            document.getElementById('edit-valor-total').value = venda.valorVenda || '';
            break;
        case 'L':
            document.getElementById('edit-frete-eletrons').value = venda.freteEletrons || '';
            break;
    }
}

async function handleEditSubmit(e) {
    e.preventDefault();
    
    try {
        const formData = buildEditFormData();
        
        window.AppUtils.showLoading(true);
        
        await window.AppUtils.apiRequest(`/vendas/${vendasData.currentEditId}`, {
            method: 'PUT',
            body: JSON.stringify(formData),
            skipCache: true
        });
        
        window.AppUtils.showAlert('Venda atualizada com sucesso!', 'success');
        window.AppUtils.closeModal('edit-modal');
        
        window.AppUtils.clearCache();
        await loadData();
        
    } catch (error) {
        console.error('Erro ao atualizar venda:', error);
        window.AppUtils.showAlert('Erro ao atualizar venda: ' + error.message, 'error');
    } finally {
        window.AppUtils.showLoading(false);
    }
}

function buildEditFormData() {
    const tipo = document.getElementById('edit-tipo-venda').value;
    const observacoes = document.getElementById('edit-observacoes').value.trim();
    
    let formData = {
        observacoes: observacoes || null
    };
    
    switch (tipo) {
        case 'E':
            formData.valorExtra = parseFloat(document.getElementById('edit-valor-extra').value);
            break;
        case 'V':
            formData.valorVenda = parseFloat(document.getElementById('edit-valor-total').value);
            break;
        case 'L':
            formData.freteEletrons = parseFloat(document.getElementById('edit-frete-eletrons').value) || 0;
            break;
    }
    
    return formData;
}

async function deleteVenda(id) {
    if (!confirm('Tem certeza que deseja excluir esta venda?')) {
        return;
    }
    
    try {
        window.AppUtils.showLoading(true);
        
        await window.AppUtils.apiRequest(`/vendas/${id}`, { 
            method: 'DELETE',
            skipCache: true 
        });
        
        window.AppUtils.showAlert('Venda excluída com sucesso!', 'success');
        
        window.AppUtils.clearCache();
        await loadData();
        
    } catch (error) {
        console.error('Erro ao excluir venda:', error);
        window.AppUtils.showAlert('Erro ao excluir venda: ' + error.message, 'error');
    } finally {
        window.AppUtils.showLoading(false);
    }
}

// ================================
// FILTROS E RESUMO
// ================================
function applyFilters() {
    const { tipo, dataInicio, dataFim } = vendasData.filters;
    
    let filtered = [...vendasData.vendas];
    
    if (tipo) {
        filtered = filtered.filter(v => v.tipoVenda === tipo);
    }
    
    if (dataInicio) {
        const dataInicioObj = new Date(dataInicio + 'T00:00:00');
        filtered = filtered.filter(v => new Date(v.dataVenda) >= dataInicioObj);
    }
    
    if (dataFim) {
        const dataFimObj = new Date(dataFim + 'T23:59:59');
        filtered = filtered.filter(v => new Date(v.dataVenda) <= dataFimObj);
    }
    
    displayVendas(filtered);
}

function updateResumo() {
    const vendas = vendasData.vendas;
    
    const resumo = {
        totalE: vendas.filter(v => v.tipoVenda === 'E').length,
        totalV: vendas.filter(v => v.tipoVenda === 'V').length,
        totalL: vendas.filter(v => v.tipoVenda === 'L').length,
        totalGeral: vendas.length
    };
    
    window.AppUtils.updateElement('total-vendas-e', resumo.totalE);
    window.AppUtils.updateElement('total-vendas-v', resumo.totalV);
    window.AppUtils.updateElement('total-vendas-l', resumo.totalL);
    window.AppUtils.updateElement('total-vendas-geral', resumo.totalGeral);
}

// ================================
// HELPER FUNCTIONS
// ================================
function getPosteDescricao(venda) {
    if (venda.tipoVenda === 'E') {
        return 'Venda Extra';
    }
    
    const poste = vendasData.postes.find(p => p.id === venda.posteId);
    if (poste) {
        const quantidade = venda.quantidade || 1;
        return `${poste.codigo} - ${poste.descricao} ${quantidade > 1 ? `(${quantidade}x)` : ''}`;
    }
    
    return venda.codigoPoste || 'Poste não encontrado';
}

function getValorVenda(venda) {
    if (venda.tipoVenda === 'E') {
        return window.AppUtils.formatCurrency(venda.valorExtra || 0);
    } else if (venda.tipoVenda === 'L') {
        return 'Só frete';
    } else {
        return window.AppUtils.formatCurrency(venda.valorVenda || 0);
    }
}

function resetForm() {
    document.getElementById('venda-form').reset();
    hideAllConditionalFields();
    setTimeout(() => setDefaultDateTime(), 100);
}

function scrollToForm() {
    const form = document.getElementById('venda-form');
    if (form) {
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const firstInput = form.querySelector('input, select, textarea');
        if (firstInput) firstInput.focus();
    }
}

// ================================
// FUNÇÕES GLOBAIS
// ================================
function limparFiltros() {
    document.getElementById('filtro-tipo-venda').value = '';
    document.getElementById('filtro-data-inicio').value = '';
    document.getElementById('filtro-data-fim').value = '';
    
    vendasData.filters = { tipo: '', dataInicio: '', dataFim: '' };
    applyFilters();
    window.AppUtils.showAlert('Filtros limpos', 'success');
}

async function exportarVendas() {
    if (!vendasData.vendas || vendasData.vendas.length === 0) {
        window.AppUtils.showAlert('Nenhuma venda para exportar', 'warning');
        return;
    }
    
    const dadosExportar = vendasData.vendas.map(venda => ({
        'Data': window.AppUtils.formatDateBR(venda.dataVenda, true),
        'Tipo': window.AppUtils.getTipoLabel(venda.tipoVenda),
        'Poste': getPosteDescricao(venda),
        'Quantidade': venda.quantidade || 1,
        'Valor': getValorVenda(venda),
        'Observações': venda.observacoes || ''
    }));
    
    window.AppUtils.exportToCSV(dadosExportar, `vendas_${new Date().toISOString().split('T')[0]}`);
}

async function loadVendas() {
    try {
        window.AppUtils.clearCache();
        await loadData();
        window.AppUtils.showAlert('Dados atualizados com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao atualizar vendas:', error);
        window.AppUtils.showAlert('Erro ao atualizar. Verifique sua conexão.', 'error');
    }
}

// Disponibilizar funções globalmente
window.editVenda = editVenda;
window.deleteVenda = deleteVenda;
window.limparFiltros = limparFiltros;
window.exportarVendas = exportarVendas;
window.loadVendas = loadVendas;
window.scrollToForm = scrollToForm;
window.closeModal = () => window.AppUtils.closeModal('edit-modal');

console.log('✅ Vendas leve carregado');