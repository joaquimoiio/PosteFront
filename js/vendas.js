// vendas.js - Caminhão Vermelho Multi-Tenant
// Sistema de Postes com suporte específico para Caminhão Vermelho

// Estado local específico para o Caminhão Vermelho
let vendasData = {
    vendas: [],
    postes: [],
    currentEditId: null,
    filters: { tipo: '', dataInicio: '', dataFim: '' }
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
    
    initVendas();
});

async function initVendas() {
    console.log('🎯 Inicializando Vendas Caminhão Vermelho...');
    
    try {
        setupEventListeners();
        setDefaultDateTime();
        window.AppUtils.setDefaultDateFilters('filtro-data-inicio', 'filtro-data-fim');
        await loadData();
        console.log('✅ Vendas Caminhão Vermelho carregado');
    } catch (error) {
        console.error('❌ Erro ao carregar:', error);
        window.AppUtils.showAlert('Erro ao carregar dados. Verifique sua conexão.', 'error');
    }
}

function setupEventListeners() {
    const vendaForm = document.getElementById('venda-form');
    if (vendaForm) {
        vendaForm.addEventListener('submit', handleVendaSubmit);
        vendaForm.addEventListener('reset', resetForm);
    }
    
    const editForm = document.getElementById('edit-form');
    if (editForm) {
        editForm.addEventListener('submit', handleEditSubmit);
    }
    
    // Listener para mudança de tipo de venda
    const tipoSelect = document.getElementById('venda-tipo');
    if (tipoSelect) {
        tipoSelect.addEventListener('change', handleTipoChange);
    }
}

function setDefaultDateTime() {
    const vendaData = document.getElementById('venda-data');
    if (vendaData) {
        vendaData.value = window.AppUtils.getCurrentDateTime();
    }
}

function handleTipoChange() {
    const tipo = document.getElementById('venda-tipo').value;
    
    // Esconder todos os campos condicionais
    document.querySelectorAll('.conditional-fields').forEach(field => {
        field.style.display = 'none';
    });
    
    // Mostrar campos específicos do tipo
    if (tipo) {
        const camposTipo = document.getElementById(`campos-tipo-${tipo.toLowerCase()}`);
        if (camposTipo) {
            camposTipo.style.display = 'block';
        }
    }
    
    // Limpar campos dos outros tipos
    clearOtherTypeFields(tipo);
}

function clearOtherTypeFields(currentType) {
    const allTypes = ['E', 'V', 'L'];
    
    allTypes.forEach(type => {
        if (type !== currentType) {
            const typeFields = document.getElementById(`campos-tipo-${type.toLowerCase()}`);
            if (typeFields) {
                const inputs = typeFields.querySelectorAll('input, select');
                inputs.forEach(input => {
                    if (input.type === 'number') {
                        input.value = type === 'L' && input.id.includes('frete') ? '0' : '';
                    } else {
                        input.value = '';
                    }
                });
            }
        }
    });
}

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
    return await window.AppUtils.apiRequest('/postes');
}

function populatePosteSelects() {
    const postesAtivos = vendasData.postes.filter(p => p.ativo);
    
    ['venda-poste-v', 'venda-poste-l'].forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            // Limpar opções existentes exceto a primeira
            while (select.children.length > 1) {
                select.removeChild(select.lastChild);
            }
            
            postesAtivos.forEach(poste => {
                const option = document.createElement('option');
                option.value = poste.id;
                option.textContent = `${poste.codigo} - ${poste.descricao} (${window.AppUtils.formatCurrency(poste.preco)})`;
                select.appendChild(option);
            });
        }
    });
}

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
    const dataVenda = document.getElementById('venda-data').value;
    const observacoes = document.getElementById('venda-observacoes').value.trim();
    
    const baseData = {
        tipoVenda: tipo,
        dataVenda: dataVenda,
        observacoes: observacoes || null
    };
    
    switch (tipo) {
        case 'E':
            return {
                ...baseData,
                valorExtra: parseFloat(document.getElementById('venda-valor-extra').value)
            };
            
        case 'V':
            return {
                ...baseData,
                posteId: parseInt(document.getElementById('venda-poste-v').value),
                quantidade: parseInt(document.getElementById('venda-quantidade-v').value) || 1,
                valorVenda: parseFloat(document.getElementById('venda-valor-total-v').value)
            };
            
        case 'L':
            return {
                ...baseData,
                posteId: parseInt(document.getElementById('venda-poste-l').value),
                quantidade: parseInt(document.getElementById('venda-quantidade-l').value) || 1,
                freteEletrons: parseFloat(document.getElementById('venda-frete-l').value) || 0
            };
            
        default:
            throw new Error('Tipo de venda inválido');
    }
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
            if (!window.AppUtils.validateRequired(data.posteId, 'Poste') ||
                !window.AppUtils.validateNumber(data.quantidade, 'Quantidade', 0) ||
                !window.AppUtils.validateNumber(data.valorVenda, 'Valor de venda', 0)) {
                return false;
            }
            break;
            
        case 'L':
            if (!window.AppUtils.validateRequired(data.posteId, 'Poste') ||
                !window.AppUtils.validateNumber(data.quantidade, 'Quantidade', 0)) {
                return false;
            }
            
            if (data.freteEletrons < 0) {
                window.AppUtils.showAlert('Frete não pode ser negativo', 'warning');
                return false;
            }
            break;
    }
    
    return true;
}

function displayVendas(vendas) {
    const container = document.getElementById('vendas-list');
    if (!container) return;
    
    if (!vendas || vendas.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📋</div>
                <h3>Nenhuma venda encontrada</h3>
                <p>Comece cadastrando sua primeira venda do Caminhão Vermelho.</p>
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
    
    const tipoLabel = window.AppUtils.getTipoLabel(venda.tipoVenda);
    const tipoClass = venda.tipoVenda.toLowerCase();
    
    // Determinar valor principal a exibir
    let valorPrincipal = 'R$ 0,00';
    if (venda.tipoVenda === 'E' && venda.valorExtra) {
        valorPrincipal = window.AppUtils.formatCurrency(venda.valorExtra);
    } else if (venda.tipoVenda === 'V' && venda.valorVenda) {
        valorPrincipal = window.AppUtils.formatCurrency(venda.valorVenda);
    } else if (venda.tipoVenda === 'L' && venda.freteEletrons) {
        valorPrincipal = window.AppUtils.formatCurrency(venda.freteEletrons);
    }
    
    // Informações do poste (se houver)
    let posteInfo = '';
    if (venda.codigoPoste) {
        posteInfo = `
            <div class="item-details">
                <small>${venda.codigoPoste} - ${venda.descricaoPoste}</small>
            </div>
        `;
        if (venda.quantidade > 1) {
            posteInfo += `<div class="item-details"><small>Quantidade: ${venda.quantidade}</small></div>`;
        }
    }
    
    item.innerHTML = `
        <div class="item-header">
            <span class="item-type ${tipoClass}">
                ${tipoLabel}
            </span>
            <span class="item-date">${window.AppUtils.formatDateBR(venda.dataVenda, true)}</span>
        </div>
        
        <div class="item-content">
            <div class="item-value ${tipoClass}">${valorPrincipal}</div>
            ${posteInfo}
            ${venda.observacoes ? `<div class="item-details"><small>${venda.observacoes}</small></div>` : ''}
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

// ✅ FUNÇÃO PARA CONVERTER DATA PARA FORMATO DATETIME-LOCAL
function dateToDateTimeLocalString(dateString) {
    if (!dateString) return '';
    
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        
        // Converter para hora local para datetime-local
        const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
        return localDate.toISOString().slice(0, 16);
    } catch (error) {
        console.error('Erro ao converter data:', error);
        return '';
    }
}

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
    
    // ✅ POPULAR DATA NO FORMATO CORRETO
    const dataElement = document.getElementById('edit-data-venda');
    if (dataElement && venda.dataVenda) {
        dataElement.value = dateToDateTimeLocalString(venda.dataVenda);
    }
    
    // Mostrar/esconder campos baseado no tipo
    const freteGroup = document.getElementById('edit-frete-group');
    const valorGroup = document.getElementById('edit-valor-group');
    const extraGroup = document.getElementById('edit-extra-group');
    
    if (freteGroup) freteGroup.style.display = venda.tipoVenda === 'L' ? 'block' : 'none';
    if (valorGroup) valorGroup.style.display = venda.tipoVenda === 'V' ? 'block' : 'none';
    if (extraGroup) extraGroup.style.display = venda.tipoVenda === 'E' ? 'block' : 'none';
    
    // Preencher valores
    if (venda.freteEletrons !== null) {
        document.getElementById('edit-frete-eletrons').value = venda.freteEletrons;
    }
    if (venda.valorVenda !== null) {
        document.getElementById('edit-valor-total').value = venda.valorVenda;
    }
    if (venda.valorExtra !== null) {
        document.getElementById('edit-valor-extra').value = venda.valorExtra;
    }
    
    document.getElementById('edit-observacoes').value = venda.observacoes || '';
}

async function handleEditSubmit(e) {
    e.preventDefault();
    
    try {
        const formData = buildEditFormData();
        
        if (!validateEditFormData(formData)) {
            return;
        }
        
        window.AppUtils.showLoading(true);
        
        const vendaAtual = vendasData.vendas.find(v => v.id === vendasData.currentEditId);
        
        const updateData = {
            ...vendaAtual,
            ...formData
        };
        
        await window.AppUtils.apiRequest(`/vendas/${vendasData.currentEditId}`, {
            method: 'PUT',
            body: JSON.stringify(updateData),
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
    const observacoes = document.getElementById('edit-observacoes').value.trim();
    const dataVenda = document.getElementById('edit-data-venda'); // ✅ INCLUIR DATA
    
    const baseData = {
        observacoes: observacoes || null
    };
    
    // ✅ INCLUIR DATA DA VENDA NA ATUALIZAÇÃO
    if (dataVenda && dataVenda.value) {
        baseData.dataVenda = dataVenda.value;
    }
    
    const freteInput = document.getElementById('edit-frete-eletrons');
    const valorInput = document.getElementById('edit-valor-total');
    const extraInput = document.getElementById('edit-valor-extra');
    
    if (freteInput && freteInput.offsetParent !== null) {
        baseData.freteEletrons = parseFloat(freteInput.value) || 0;
    }
    
    if (valorInput && valorInput.offsetParent !== null) {
        baseData.valorVenda = parseFloat(valorInput.value);
    }
    
    if (extraInput && extraInput.offsetParent !== null) {
        baseData.valorExtra = parseFloat(extraInput.value);
    }
    
    return baseData;
}

function validateEditFormData(data) {
    // ✅ VALIDAR DATA SE FORNECIDA
    if (data.dataVenda && !window.AppUtils.validateDate(data.dataVenda, 'Data da venda')) {
        return false;
    }
    
    if (data.valorVenda !== undefined && !window.AppUtils.validateNumber(data.valorVenda, 'Valor de venda', 0)) {
        return false;
    }
    
    if (data.valorExtra !== undefined && !window.AppUtils.validateNumber(data.valorExtra, 'Valor extra', 0)) {
        return false;
    }
    
    if (data.freteEletrons !== undefined && data.freteEletrons < 0) {
        window.AppUtils.showAlert('Frete não pode ser negativo', 'warning');
        return false;
    }
    
    return true;
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

function updateFilters() {
    const tipo = document.getElementById('filtro-tipo-venda').value;
    const dataInicio = document.getElementById('filtro-data-inicio').value;
    const dataFim = document.getElementById('filtro-data-fim').value;
    
    vendasData.filters = {
        tipo: tipo,
        dataInicio: dataInicio,
        dataFim: dataFim
    };
}

function applyFilters() {
    updateFilters();
    const { tipo, dataInicio, dataFim } = vendasData.filters;
    
    let filtered = [...vendasData.vendas];
    
    if (tipo) {
        filtered = filtered.filter(v => v.tipoVenda === tipo);
    }
    
    if (dataInicio || dataFim) {
        filtered = filtered.filter(v => {
            const dataVenda = v.dataVenda.split('T')[0]; // Pegar apenas a data
            return window.AppUtils.isDateInRange(dataVenda, dataInicio, dataFim);
        });
    }
    
    displayVendas(filtered);
    updateFilterIndicator();
}

function updateFilterIndicator() {
    const { tipo, dataInicio, dataFim } = vendasData.filters;
    const indicator = document.getElementById('filtros-aplicados');
    const text = document.getElementById('filtros-texto');
    
    let filtros = [];
    
    if (tipo) {
        const tipoLabel = window.AppUtils.getTipoLabel(tipo);
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
    
    if (filtros.length > 0) {
        text.textContent = `Filtros: ${filtros.join(', ')}`;
        indicator.style.display = 'flex';
    } else {
        indicator.style.display = 'none';
    }
}

function updateResumo() {
    const vendas = vendasData.vendas;
    
    const vendasE = vendas.filter(v => v.tipoVenda === 'E').length;
    const vendasV = vendas.filter(v => v.tipoVenda === 'V').length;
    const vendasL = vendas.filter(v => v.tipoVenda === 'L').length;
    const totalGeral = vendas.length;
    
    window.AppUtils.updateElement('total-vendas-e', vendasE);
    window.AppUtils.updateElement('total-vendas-v', vendasV);
    window.AppUtils.updateElement('total-vendas-l', vendasL);
    window.AppUtils.updateElement('total-vendas-geral', totalGeral);
}

function resetForm() {
    document.getElementById('venda-form').reset();
    
    // Esconder todos os campos condicionais
    document.querySelectorAll('.conditional-fields').forEach(field => {
        field.style.display = 'none';
    });
    
    setTimeout(setDefaultDateTime, 100);
}

function scrollToForm() {
    const form = document.getElementById('venda-form');
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
        'Tipo': venda.tipoVenda,
        'Poste': venda.codigoPoste || '-',
        'Quantidade': venda.quantidade || '-',
        'Valor Venda': venda.valorVenda || 0,
        'Valor Extra': venda.valorExtra || 0,
        'Frete': venda.freteEletrons || 0,
        'Observações': venda.observacoes || '-'
    }));
    
    window.AppUtils.exportToCSV(dadosExportar, `vendas_vermelho_${new Date().toISOString().split('T')[0]}`);
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
window.aplicarFiltros = aplicarFiltros;
window.limparFiltros = limparFiltros;
window.exportarVendas = exportarVendas;
window.loadVendas = loadVendas;
window.scrollToForm = scrollToForm;
window.closeModal = () => window.AppUtils.closeModal('edit-modal');

console.log('✅ Vendas Caminhão Vermelho com edição de data carregado');