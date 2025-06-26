// despesas.js - Caminhão Vermelho Multi-Tenant
// Sistema de Postes com suporte específico para Caminhão Vermelho

// Estado local específico para o Caminhão Vermelho
let despesasData = {
    despesas: [],
    currentEditId: null,
    filters: { tipo: '', dataInicio: '', dataFim: '', descricao: '' }
};

// Verificar autenticação específica do Caminhão Vermelho
document.addEventListener('DOMContentLoaded', () => {
    const userType = localStorage.getItem('poste-system-user-type');
    if (userType !== 'vermelho') {
        window.location.href = 'index.html';
        return;
    }

    if (!window.AppUtils) {
        console.error('AppUtils não carregado! Verifique se utils.js foi incluído.');
        return;
    }
    
    initDespesas();
});

async function initDespesas() {
    console.log('🎯 Inicializando Despesas Caminhão Vermelho...');
    
    try {
        setupEventListeners();
        setDefaultDate();
        window.AppUtils.setDefaultDateFilters('filtro-data-inicio', 'filtro-data-fim');
        await loadData();
        console.log('✅ Despesas Caminhão Vermelho carregado');
    } catch (error) {
        console.error('❌ Erro ao carregar:', error);
        window.AppUtils.showAlert('Erro ao carregar dados. Verifique sua conexão.', 'error');
    }
}

function setupEventListeners() {
    const despesaForm = document.getElementById('despesa-form');
    if (despesaForm) {
        despesaForm.addEventListener('submit', handleDespesaSubmit);
        despesaForm.addEventListener('reset', resetForm);
    }
    
    const editForm = document.getElementById('edit-form');
    if (editForm) {
        editForm.addEventListener('submit', handleEditSubmit);
    }
}

function setDefaultDate() {
    const despesaData = document.getElementById('despesa-data');
    if (despesaData) {
        despesaData.value = window.AppUtils.getCurrentDateInput();
    }
}

async function loadData() {
    try {
        window.AppUtils.showLoading(true);
        
        const despesas = await fetchDespesas();
        despesasData.despesas = despesas || [];
        
        updateResumo();
        applyFilters();
        
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        throw error;
    } finally {
        window.AppUtils.showLoading(false);
    }
}

async function fetchDespesas() {
    const params = new URLSearchParams();
    if (despesasData.filters.dataInicio) params.append('dataInicio', despesasData.filters.dataInicio);
    if (despesasData.filters.dataFim) params.append('dataFim', despesasData.filters.dataFim);
    
    const endpoint = params.toString() ? `/despesas?${params}` : '/despesas';
    return await window.AppUtils.apiRequest(endpoint);
}

async function handleDespesaSubmit(e) {
    e.preventDefault();
    
    try {
        const formData = buildFormData();
        
        if (!validateFormData(formData)) {
            return;
        }
        
        window.AppUtils.showLoading(true);
        
        await window.AppUtils.apiRequest('/despesas', {
            method: 'POST',
            body: JSON.stringify(formData),
            skipCache: true
        });
        
        window.AppUtils.showAlert('Despesa criada com sucesso!', 'success');
        resetForm();
        
        window.AppUtils.clearCache();
        await loadData();
        
    } catch (error) {
        console.error('Erro ao criar despesa:', error);
        window.AppUtils.showAlert('Erro ao criar despesa: ' + error.message, 'error');
    } finally {
        window.AppUtils.showLoading(false);
    }
}

function buildFormData() {
    const dataInput = document.getElementById('despesa-data');
    return {
        dataDespesa: window.AppUtils.dateInputToString(dataInput.value),
        descricao: document.getElementById('despesa-descricao').value.trim(),
        valor: parseFloat(document.getElementById('despesa-valor').value),
        tipo: document.getElementById('despesa-tipo').value
    };
}

function validateFormData(data) {
    if (!window.AppUtils.validateRequired(data.dataDespesa, 'Data da despesa') ||
        !window.AppUtils.validateRequired(data.descricao, 'Descrição') ||
        !window.AppUtils.validateRequired(data.tipo, 'Tipo de despesa')) {
        return false;
    }
    
    if (data.descricao.length < 3) {
        window.AppUtils.showAlert('Descrição deve ter pelo menos 3 caracteres', 'warning');
        return false;
    }
    
    return window.AppUtils.validateNumber(data.valor, 'Valor', 0);
}

function displayDespesas(despesas) {
    const container = document.getElementById('despesas-list');
    if (!container) return;
    
    if (!despesas || despesas.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">💸</div>
                <h3>Nenhuma despesa encontrada</h3>
                <p>Comece cadastrando sua primeira despesa do Caminhão Vermelho.</p>
                <button class="btn btn-primary" onclick="scrollToForm()">
                    Cadastrar Primeira Despesa
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    despesas.forEach(despesa => {
        const item = createDespesaItem(despesa);
        container.appendChild(item);
    });
}

function createDespesaItem(despesa) {
    const item = document.createElement('div');
    item.className = `mobile-list-item ${despesa.tipo.toLowerCase()}`;
    
    const tipoLabel = window.AppUtils.getStatusLabel(despesa.tipo);
    const tipoClass = despesa.tipo.toLowerCase();
    
    item.innerHTML = `
        <div class="item-header">
            <span class="item-type ${tipoClass}">
                ${tipoLabel}
            </span>
            <span class="item-date">${window.AppUtils.formatDateBRFixed(despesa.dataDespesa)}</span>
        </div>
        
        <div class="item-content">
            <div class="item-value ${tipoClass}">${window.AppUtils.formatCurrency(despesa.valor)}</div>
            <div class="item-title">${despesa.descricao}</div>
        </div>
        
        <div class="item-actions">
            <button class="btn btn-small btn-primary" onclick="editDespesa(${despesa.id})">
                ✏️ Editar
            </button>
            <button class="btn btn-small btn-danger" onclick="deleteDespesa(${despesa.id})">
                🗑️ Excluir
            </button>
        </div>
    `;
    
    return item;
}

async function editDespesa(id) {
    try {
        const despesa = despesasData.despesas.find(d => d.id === id);
        if (!despesa) {
            throw new Error('Despesa não encontrada');
        }
        
        populateEditForm(despesa);
        despesasData.currentEditId = id;
        window.AppUtils.showModal('edit-modal');
        
    } catch (error) {
        console.error('Erro ao carregar despesa para edição:', error);
        window.AppUtils.showAlert('Erro ao carregar dados da despesa: ' + error.message, 'error');
    }
}

function populateEditForm(despesa) {
    document.getElementById('edit-despesa-data').value = window.AppUtils.stringToDateInput(despesa.dataDespesa);
    document.getElementById('edit-despesa-descricao').value = despesa.descricao;
    document.getElementById('edit-despesa-valor').value = despesa.valor;
    document.getElementById('edit-despesa-tipo').value = despesa.tipo;
}

async function handleEditSubmit(e) {
    e.preventDefault();
    
    try {
        const formData = buildEditFormData();
        
        if (!validateFormData(formData)) {
            return;
        }
        
        window.AppUtils.showLoading(true);
        
        await window.AppUtils.apiRequest(`/despesas/${despesasData.currentEditId}`, {
            method: 'PUT',
            body: JSON.stringify(formData),
            skipCache: true
        });
        
        window.AppUtils.showAlert('Despesa atualizada com sucesso!', 'success');
        window.AppUtils.closeModal('edit-modal');
        
        window.AppUtils.clearCache();
        await loadData();
        
    } catch (error) {
        console.error('Erro ao atualizar despesa:', error);
        window.AppUtils.showAlert('Erro ao atualizar despesa: ' + error.message, 'error');
    } finally {
        window.AppUtils.showLoading(false);
    }
}

function buildEditFormData() {
    const dataInput = document.getElementById('edit-despesa-data');
    return {
        dataDespesa: window.AppUtils.dateInputToString(dataInput.value),
        descricao: document.getElementById('edit-despesa-descricao').value.trim(),
        valor: parseFloat(document.getElementById('edit-despesa-valor').value),
        tipo: document.getElementById('edit-despesa-tipo').value
    };
}

async function deleteDespesa(id) {
    if (!confirm('Tem certeza que deseja excluir esta despesa?')) {
        return;
    }
    
    try {
        window.AppUtils.showLoading(true);
        
        await window.AppUtils.apiRequest(`/despesas/${id}`, { 
            method: 'DELETE',
            skipCache: true
        });
        
        window.AppUtils.showAlert('Despesa excluída com sucesso!', 'success');
        
        window.AppUtils.clearCache();
        await loadData();
        
    } catch (error) {
        console.error('Erro ao excluir despesa:', error);
        window.AppUtils.showAlert('Erro ao excluir despesa: ' + error.message, 'error');
    } finally {
        window.AppUtils.showLoading(false);
    }
}

function updateFilters() {
    const tipo = document.getElementById('filtro-tipo').value;
    const dataInicio = document.getElementById('filtro-data-inicio').value;
    const dataFim = document.getElementById('filtro-data-fim').value;
    const descricao = document.getElementById('filtro-descricao').value.trim();
    
    despesasData.filters = {
        tipo: tipo,
        dataInicio: dataInicio,
        dataFim: dataFim,
        descricao: descricao
    };
}

function applyFilters() {
    updateFilters();
    const { tipo, dataInicio, dataFim, descricao } = despesasData.filters;
    
    let filtered = [...despesasData.despesas];
    
    if (tipo) {
        filtered = filtered.filter(d => d.tipo === tipo);
    }
    
    if (dataInicio || dataFim) {
        filtered = filtered.filter(d => {
            return window.AppUtils.isDateInRange(d.dataDespesa, dataInicio, dataFim);
        });
    }
    
    if (descricao) {
        const searchTerm = descricao.toLowerCase();
        filtered = filtered.filter(d => 
            d.descricao.toLowerCase().includes(searchTerm)
        );
    }
    
    displayDespesas(filtered);
    updateFilterIndicator();
}

function updateFilterIndicator() {
    const { tipo, dataInicio, dataFim, descricao } = despesasData.filters;
    const indicator = document.getElementById('filtros-aplicados');
    const text = document.getElementById('filtros-texto');
    
    let filtros = [];
    
    if (tipo) {
        const tipoLabel = window.AppUtils.getStatusLabel(tipo);
        filtros.push(`Tipo: ${tipoLabel}`);
    }
    
    if (dataInicio && dataFim) {
        const inicio = window.AppUtils.formatDateBR(dataInicio);
        const fim = window.AppUtils.formatDateBR(dataFim);
        filtros.push(`Período: ${inicio} a ${fim}`);
    } else if (dataInicio) {
        filtros.push(`A partir de: ${window.AppUtils.formatDateBR(dataInicio)}`);
    } else if (dataFim) {
        filtros.push(`Até: ${window.AppUtils.formatDateBR(dataFim)}`);
    }
    
    if (descricao) {
        filtros.push(`Busca: "${descricao}"`);
    }
    
    if (filtros.length > 0) {
        text.textContent = `Filtros: ${filtros.join(', ')}`;
        indicator.style.display = 'flex';
    } else {
        indicator.style.display = 'none';
    }
}

function updateResumo() {
    const despesas = despesasData.despesas;
    
    const despesasFuncionario = despesas
        .filter(d => d.tipo === 'FUNCIONARIO')
        .reduce((sum, d) => sum + (d.valor || 0), 0);
        
    const outrasDespesas = despesas
        .filter(d => d.tipo === 'OUTRAS')
        .reduce((sum, d) => sum + (d.valor || 0), 0);
        
    const totalGeral = despesasFuncionario + outrasDespesas;
    
    window.AppUtils.updateElement('total-despesas-funcionario', window.AppUtils.formatCurrency(despesasFuncionario));
    window.AppUtils.updateElement('total-outras-despesas', window.AppUtils.formatCurrency(outrasDespesas));
    window.AppUtils.updateElement('total-despesas-geral', window.AppUtils.formatCurrency(totalGeral));
}

function resetForm() {
    document.getElementById('despesa-form').reset();
    setTimeout(setDefaultDate, 100);
}

function scrollToForm() {
    const form = document.getElementById('despesa-form');
    if (form) {
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const firstInput = form.querySelector('input, select, textarea');
        if (firstInput) firstInput.focus();
    }
}

function aplicarFiltros() {
    applyFilters();
    window.AppUtils.showAlert('Filtros aplicados com sucesso!', 'success');
}

function limparFiltros() {
    document.getElementById('filtro-tipo').value = '';
    document.getElementById('filtro-data-inicio').value = '';
    document.getElementById('filtro-data-fim').value = '';
    document.getElementById('filtro-descricao').value = '';
    
    despesasData.filters = { tipo: '', dataInicio: '', dataFim: '', descricao: '' };
    applyFilters();
    window.AppUtils.showAlert('Filtros limpos', 'success');
}

async function exportarDespesas() {
    if (!despesasData.despesas || despesasData.despesas.length === 0) {
        window.AppUtils.showAlert('Nenhuma despesa para exportar', 'warning');
        return;
    }
    
    const dadosExportar = despesasData.despesas.map(despesa => ({
        'Data': window.AppUtils.formatDateBRFixed(despesa.dataDespesa),
        'Descrição': despesa.descricao,
        'Valor': despesa.valor,
        'Tipo': despesa.tipo === 'FUNCIONARIO' ? 'Funcionário' : 'Outras'
    }));
    
    window.AppUtils.exportToCSV(dadosExportar, `despesas_vermelho_${new Date().toISOString().split('T')[0]}`);
}

async function loadDespesas() {
    try {
        window.AppUtils.clearCache();
        await loadData();
        window.AppUtils.showAlert('Dados atualizados com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao atualizar despesas:', error);
        window.AppUtils.showAlert('Erro ao atualizar. Verifique sua conexão.', 'error');
    }
}

// Disponibilizar funções globalmente
window.editDespesa = editDespesa;
window.deleteDespesa = deleteDespesa;
window.aplicarFiltros = aplicarFiltros;
window.limparFiltros = limparFiltros;
window.exportarDespesas = exportarDespesas;
window.loadDespesas = loadDespesas;
window.scrollToForm = scrollToForm;
window.closeModal = () => window.AppUtils.closeModal('edit-modal');

console.log('✅ Despesas Caminhão Vermelho carregado');