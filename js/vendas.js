// Vendas JavaScript Mobile-First - Versão Completa Refatorada
const API_BASE = 'https://posteback.onrender.com/api';

// Estado global simplificado
const state = {
    vendas: [],
    postes: [],
    currentEditId: null,
    filters: { tipo: '', dataInicio: '', dataFim: '' }
};

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎯 Inicializando Vendas Mobile...');
    
    try {
        configurarEventos();
        setDefaultDateTime();
        setDefaultDateFilters();
        await carregarDados();
        console.log('✅ Vendas carregado');
    } catch (error) {
        console.error('❌ Erro ao carregar:', error);
        showAlert('Erro ao carregar dados', 'error');
    }
});

// Configuração de eventos
function configurarEventos() {
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
        quantidadeV.addEventListener('input', () => {
            calcularValorVenda();
            verificarEstoque();
        });
    }
    
    // Verificação de estoque para tipo L
    const posteL = document.getElementById('venda-poste-l');
    const quantidadeL = document.getElementById('venda-quantidade-l');
    if (posteL && quantidadeL) {
        posteL.addEventListener('change', verificarEstoque);
        quantidadeL.addEventListener('input', verificarEstoque);
    }
    
    // Filtros
    setupFilters();
}

function setupFilters() {
    const filters = {
        'filtro-tipo-venda': 'tipo',
        'filtro-data-inicio': 'dataInicio', 
        'filtro-data-fim': 'dataFim'
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

// Carregamento de dados
async function carregarDados() {
    try {
        showLoading(true);
        
        const [vendas, postes] = await Promise.all([
            fetchVendas(),
            fetchPostes()
        ]);
        
        state.vendas = vendas;
        state.postes = postes;
        
        populatePosteSelects();
        updateResumo();
        applyFilters();
        
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        throw error;
    } finally {
        showLoading(false);
    }
}

// API calls
async function apiRequest(endpoint, options = {}) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        }
    });
    
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
}

async function fetchVendas() {
    const params = new URLSearchParams();
    if (state.filters.dataInicio) params.append('dataInicio', state.filters.dataInicio);
    if (state.filters.dataFim) params.append('dataFim', state.filters.dataFim);
    
    const url = params.toString() ? `/vendas?${params}` : '/vendas';
    return await apiRequest(url);
}

async function fetchPostes() {
    const postes = await apiRequest('/postes');
    return postes.filter(p => p.ativo);
}

// Manipulação do formulário
async function handleVendaSubmit(e) {
    e.preventDefault();
    
    try {
        const formData = buildFormData();
        
        if (!validateFormData(formData)) {
            return;
        }
        
        // Verificar estoque antes de submeter
        if (needsStockCheck(formData)) {
            const hasStock = await checkStock(formData.posteId, formData.quantidade || 1);
            if (!hasStock) {
                showAlert('Estoque insuficiente para realizar esta venda', 'error');
                return;
            }
        }
        
        showLoading(true);
        
        await apiRequest('/vendas', {
            method: 'POST',
            body: JSON.stringify(formData)
        });
        
        showAlert('Venda criada com sucesso! Estoque atualizado automaticamente.', 'success');
        resetForm();
        await carregarDados();
        
    } catch (error) {
        console.error('Erro ao criar venda:', error);
        showAlert('Erro ao criar venda', 'error');
    } finally {
        showLoading(false);
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
    if (!data.tipoVenda || !data.dataVenda) {
        showAlert('Tipo de venda e data são obrigatórios', 'warning');
        return false;
    }
    
    switch (data.tipoVenda) {
        case 'E':
            if (!data.valorExtra || data.valorExtra <= 0) {
                showAlert('Valor extra deve ser maior que zero', 'warning');
                return false;
            }
            break;
        case 'V':
            if (!data.posteId) {
                showAlert('Selecione um poste para venda normal', 'warning');
                return false;
            }
            if (!data.valorVenda || data.valorVenda <= 0) {
                showAlert('Valor de venda deve ser maior que zero', 'warning');
                return false;
            }
            break;
        case 'L':
            if (!data.posteId) {
                showAlert('Selecione um poste de referência para venda loja', 'warning');
                return false;
            }
            break;
    }
    
    return true;
}

// Manipulação de tipos
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

// Cálculos e verificações
function calcularValorVenda() {
    const posteSelect = document.getElementById('venda-poste-v');
    const quantidadeInput = document.getElementById('venda-quantidade-v');
    const valorTotalInput = document.getElementById('venda-valor-total-v');
    
    if (!posteSelect || !quantidadeInput || !valorTotalInput) return;
    
    const posteId = parseInt(posteSelect.value);
    const quantidade = parseInt(quantidadeInput.value) || 1;
    
    if (posteId) {
        const poste = state.postes.find(p => p.id === posteId);
        if (poste) {
            const valorCalculado = poste.preco * quantidade;
            valorTotalInput.value = valorCalculado.toFixed(2);
        }
    }
}

async function verificarEstoque() {
    const tipo = document.getElementById('venda-tipo').value;
    
    if (tipo !== 'V' && tipo !== 'L') return;
    
    const posteElement = document.getElementById(tipo === 'V' ? 'venda-poste-v' : 'venda-poste-l');
    const quantidadeElement = document.getElementById(tipo === 'V' ? 'venda-quantidade-v' : 'venda-quantidade-l');
    
    if (!posteElement || !quantidadeElement) return;
    
    const posteId = parseInt(posteElement.value);
    const quantidade = parseInt(quantidadeElement.value) || 1;
    
    if (!posteId || quantidade <= 0) {
        clearStockWarning();
        return;
    }
    
    try {
        const hasStock = await checkStock(posteId, quantidade);
        showStockStatus(posteElement, hasStock, quantidade);
    } catch (error) {
        console.error('Erro ao verificar estoque:', error);
    }
}

async function checkStock(posteId, quantidade) {
    try {
        const response = await apiRequest('/estoque/verificar-disponibilidade', {
            method: 'POST',
            body: JSON.stringify({ posteId, quantidade })
        });
        return response.disponivel;
    } catch (error) {
        console.error('Erro na verificação de estoque:', error);
        return false;
    }
}

function showStockStatus(element, hasStock, quantidade) {
    clearStockWarning();
    
    const warning = document.createElement('div');
    warning.className = `stock-warning ${hasStock ? 'stock-ok' : 'stock-error'}`;
    warning.style.cssText = `
        margin-top: 5px;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 500;
        ${hasStock ? 
            'background: #f0fdf4; color: #059669; border: 1px solid #dcfce7;' : 
            'background: #fef2f2; color: #dc2626; border: 1px solid #fecaca;'
        }
    `;
    
    warning.textContent = hasStock ? 
        `✅ Estoque disponível (${quantidade} unidades)` : 
        `❌ Estoque insuficiente para ${quantidade} unidades`;
    
    element.parentNode.appendChild(warning);
}

function clearStockWarning() {
    document.querySelectorAll('.stock-warning').forEach(w => w.remove());
}

function needsStockCheck(formData) {
    return (formData.tipoVenda === 'V' || formData.tipoVenda === 'L') && formData.posteId;
}

// Populate selects
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
        state.postes.forEach(poste => {
            const option = document.createElement('option');
            option.value = poste.id;
            option.textContent = `${poste.codigo} - ${poste.descricao} (${formatCurrency(poste.preco)})`;
            select.appendChild(option);
        });
    });
}

// Display vendas
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
    
    // Indicador de estoque
    let stockIndicator = '';
    if ((venda.tipoVenda === 'V' || venda.tipoVenda === 'L') && venda.quantidade > 0) {
        stockIndicator = `<div class="item-details">📦 Estoque: -${venda.quantidade}</div>`;
    }
    
    item.innerHTML = `
        <div class="item-header">
            <span class="item-type ${venda.tipoVenda.toLowerCase()}">
                ${getTipoLabel(venda.tipoVenda)}
            </span>
            <span class="item-date">${formatDateBR(venda.dataVenda)}</span>
        </div>
        
        <div class="item-content">
            <div class="item-title">${getPosteDescricao(venda)}</div>
            ${stockIndicator}
            <div class="item-details">Frete: ${formatCurrency(venda.freteEletrons || 0)}</div>
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

// CRUD operations
async function editVenda(id) {
    try {
        const venda = state.vendas.find(v => v.id === id);
        if (!venda) {
            throw new Error('Venda não encontrada');
        }
        
        populateEditForm(venda);
        state.currentEditId = id;
        showModal();
        
    } catch (error) {
        console.error('Erro ao carregar venda para edição:', error);
        showAlert('Erro ao carregar dados da venda', 'error');
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
        
        showLoading(true);
        
        await apiRequest(`/vendas/${state.currentEditId}`, {
            method: 'PUT',
            body: JSON.stringify(formData)
        });
        
        showAlert('Venda atualizada com sucesso!', 'success');
        closeModal();
        await carregarDados();
        
    } catch (error) {
        console.error('Erro ao atualizar venda:', error);
        showAlert('Erro ao atualizar venda', 'error');
    } finally {
        showLoading(false);
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
    if (!confirm('Tem certeza que deseja excluir esta venda? O estoque será devolvido automaticamente.')) {
        return;
    }
    
    try {
        showLoading(true);
        
        await apiRequest(`/vendas/${id}`, { method: 'DELETE' });
        
        showAlert('Venda excluída com sucesso! Estoque devolvido automaticamente.', 'success');
        await carregarDados();
        
    } catch (error) {
        console.error('Erro ao excluir venda:', error);
        showAlert('Erro ao excluir venda', 'error');
    } finally {
        showLoading(false);
    }
}

// Filtros e resumo
function applyFilters() {
    const { tipo, dataInicio, dataFim } = state.filters;
    
    let filtered = [...state.vendas];
    
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
    const vendas = state.vendas;
    
    const resumo = {
        totalE: vendas.filter(v => v.tipoVenda === 'E').length,
        totalV: vendas.filter(v => v.tipoVenda === 'V').length,
        totalL: vendas.filter(v => v.tipoVenda === 'L').length,
        totalGeral: vendas.length
    };
    
    updateElement('total-vendas-e', resumo.totalE);
    updateElement('total-vendas-v', resumo.totalV);
    updateElement('total-vendas-l', resumo.totalL);
    updateElement('total-vendas-geral', resumo.totalGeral);
}

// Utilitários
function setDefaultDateTime() {
    const vendaData = document.getElementById('venda-data');
    if (vendaData) {
        const agora = new Date();
        const dataFormatada = agora.getFullYear() + '-' + 
            String(agora.getMonth() + 1).padStart(2, '0') + '-' + 
            String(agora.getDate()).padStart(2, '0') + 'T' + 
            String(agora.getHours()).padStart(2, '0') + ':' + 
            String(agora.getMinutes()).padStart(2, '0');
        vendaData.value = dataFormatada;
    }
}

function setDefaultDateFilters() {
    const hoje = new Date();
    const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    
    const filtroInicio = document.getElementById('filtro-data-inicio');
    const filtroFim = document.getElementById('filtro-data-fim');
    
    if (filtroInicio && filtroFim) {
        filtroInicio.value = dateToInputValue(primeiroDiaMes);
        filtroFim.value = dateToInputValue(hoje);
        
        state.filters.dataInicio = filtroInicio.value;
        state.filters.dataFim = filtroFim.value;
    }
}

function resetForm() {
    document.getElementById('venda-form').reset();
    hideAllConditionalFields();
    clearStockWarning();
    setTimeout(setDefaultDateTime, 100);
}

function limparFiltros() {
    document.getElementById('filtro-tipo-venda').value = '';
    document.getElementById('filtro-data-inicio').value = '';
    document.getElementById('filtro-data-fim').value = '';
    
    state.filters = { tipo: '', dataInicio: '', dataFim: '' };
    applyFilters();
    showAlert('Filtros limpos', 'success');
}

function scrollToForm() {
    const form = document.getElementById('venda-form');
    if (form) {
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const firstInput = form.querySelector('input, select, textarea');
        if (firstInput) firstInput.focus();
    }
}

async function exportarVendas() {
    if (!state.vendas || state.vendas.length === 0) {
        showAlert('Nenhuma venda para exportar', 'warning');
        return;
    }
    
    const dadosExportar = state.vendas.map(venda => ({
        'Data': formatDateBR(venda.dataVenda),
        'Tipo': getTipoLabel(venda.tipoVenda),
        'Poste': getPosteDescricao(venda),
        'Quantidade': venda.quantidade || 1,
        'Frete': venda.freteEletrons || 0,
        'Valor': getValorVendaNum(venda),
        'Observações': venda.observacoes || ''
    }));
    
    exportToCSV(dadosExportar, `vendas_${new Date().toISOString().split('T')[0]}`);
}

async function loadVendas() {
    await carregarDados();
    showAlert('Dados atualizados!', 'success');
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
}

// Formatters e Helper functions
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

function dateToInputValue(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getTipoLabel(tipo) {
    const labels = {
        'E': '📈 Extra',
        'V': '🛒 Normal',
        'L': '🏪 Loja'
    };
    return labels[tipo] || tipo;
}

function getPosteDescricao(venda) {
    if (venda.tipoVenda === 'E') {
        return 'Venda Extra';
    }
    
    if (venda.codigoPoste) {
        const quantidade = venda.quantidade || 1;
        return `${venda.codigoPoste} ${quantidade > 1 ? `(${quantidade}x)` : ''}`;
    }
    
    return 'Poste não encontrado';
}

function getValorVenda(venda) {
    if (venda.tipoVenda === 'E') {
        return formatCurrency(venda.valorExtra || 0);
    } else if (venda.tipoVenda === 'L') {
        return 'Só frete';
    } else {
        return formatCurrency(venda.valorVenda || 0);
    }
}

function getValorVendaNum(venda) {
    if (venda.tipoVenda === 'E') {
        return venda.valorExtra || 0;
    } else if (venda.tipoVenda === 'L') {
        return 0;
    } else {
        return venda.valorVenda || 0;
    }
}

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

console.log('✅ Vendas Mobile carregado');