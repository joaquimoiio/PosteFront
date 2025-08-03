// Estado local específico para o Caminhão Branco
let vendasData = {
    vendas: [],
    postes: [],
    currentEditId: null,
    filters: { tipo: '', dataInicio: '', dataFim: '' }
};

// Verificar autenticação específica do Caminhão Branco
document.addEventListener('DOMContentLoaded', () => {
    const userType = localStorage.getItem('poste-system-user-type');
    if (userType !== 'branco') {
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
    console.log('🎯 Inicializando Vendas Caminhão Branco...');
    
    try {
        setupEventListeners();
        setDefaultDateTime();
        window.AppUtils.setDefaultDateFilters('filtro-data-inicio', 'filtro-data-fim');
        await loadData();
        console.log('✅ Vendas Caminhão Branco carregado');
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
    const tipoSelect = document.getElementById('venda-tipo');
    if (!tipoSelect) {
        console.warn('Elemento venda-tipo não encontrado');
        return;
    }
    
    const tipo = tipoSelect.value;
    
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
    const tipoElement = document.getElementById('venda-tipo');
    const dataElement = document.getElementById('venda-data');
    const observacoesElement = document.getElementById('venda-observacoes');
    
    if (!tipoElement || !dataElement) {
        throw new Error('Elementos essenciais do formulário não encontrados');
    }
    
    const tipo = tipoElement.value;
    const dataVenda = dataElement.value;
    const observacoes = observacoesElement ? observacoesElement.value.trim() : '';
    
    const baseData = {
        tipoVenda: tipo,
        dataVenda: dataVenda,
        observacoes: observacoes || null
    };
    
    switch (tipo) {
        case 'E':
            const valorExtraElement = document.getElementById('venda-valor-extra');
            return {
                ...baseData,
                valorExtra: valorExtraElement ? parseFloat(valorExtraElement.value) : 0
            };
            
        case 'V':
            const posteVElement = document.getElementById('venda-poste-v');
            const quantidadeVElement = document.getElementById('venda-quantidade-v');
            const valorVElement = document.getElementById('venda-valor-total-v');
            
            return {
                ...baseData,
                posteId: posteVElement ? parseInt(posteVElement.value) : null,
                quantidade: quantidadeVElement ? parseInt(quantidadeVElement.value) || 1 : 1,
                valorVenda: valorVElement ? parseFloat(valorVElement.value) : 0
            };
            
        case 'L':
            const posteLElement = document.getElementById('venda-poste-l');
            const quantidadeLElement = document.getElementById('venda-quantidade-l');
            const freteLElement = document.getElementById('venda-frete-l');
            
            return {
                ...baseData,
                posteId: posteLElement ? parseInt(posteLElement.value) : null,
                quantidade: quantidadeLElement ? parseInt(quantidadeLElement.value) || 1 : 1,
                freteEletrons: freteLElement ? parseFloat(freteLElement.value) || 0 : 0
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
                <p>Comece cadastrando sua primeira venda do Caminhão Branco.</p>
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
    const tipoElement = document.getElementById('edit-tipo-venda');
    if (tipoElement) {
        tipoElement.value = venda.tipoVenda;
    }
    
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
    const freteElement = document.getElementById('edit-frete-eletrons');
    const valorElement = document.getElementById('edit-valor-total');
    const extraElement = document.getElementById('edit-valor-extra');
    const obsElement = document.getElementById('edit-observacoes');
    
    if (venda.freteEletrons !== null && freteElement) {
        freteElement.value = venda.freteEletrons;
    }
    if (venda.valorVenda !== null && valorElement) {
        valorElement.value = venda.valorVenda;
    }
    if (venda.valorExtra !== null && extraElement) {
        extraElement.value = venda.valorExtra;
    }
    if (obsElement) {
        obsElement.value = venda.observacoes || '';
    }
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
    const observacoes = document.getElementById('edit-observacoes');
    const dataVenda = document.getElementById('edit-data-venda'); // ✅ INCLUIR DATA
    
    const baseData = {
        observacoes: observacoes ? observacoes.value.trim() || null : null
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
    // Verificar se os elementos existem antes de acessar .value
    const tipoElement = document.getElementById('filtro-tipo-venda');
    const dataInicioElement = document.getElementById('filtro-data-inicio');
    const dataFimElement = document.getElementById('filtro-data-fim');
    
    vendasData.filters = {
        tipo: tipoElement ? tipoElement.value : '',
        dataInicio: dataInicioElement ? dataInicioElement.value : '',
        dataFim: dataFimElement ? dataFimElement.value : ''
    };
}

function getFilteredVendas() {
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
    
    return filtered;
}

function applyFilters() {
    const filtered = getFilteredVendas();
    displayVendas(filtered);
    updateFilterIndicator();
}

function updateFilterIndicator() {
    const { tipo, dataInicio, dataFim } = vendasData.filters;
    const indicator = document.getElementById('filtros-aplicados');
    const text = document.getElementById('filtros-texto');
    
    if (!indicator || !text) return;
    
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
    
    // Verificar se os elementos existem antes de atualizar
    window.AppUtils.updateElement('total-vendas-e', vendasE);
    window.AppUtils.updateElement('total-vendas-v', vendasV);
    window.AppUtils.updateElement('total-vendas-l', vendasL);
    window.AppUtils.updateElement('total-vendas-geral', totalGeral);
}

function resetForm() {
    const form = document.getElementById('venda-form');
    if (form) {
        form.reset();
    }
    
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
    // Verificar se os elementos existem antes de limpar
    const tipoElement = document.getElementById('filtro-tipo-venda');
    const dataInicioElement = document.getElementById('filtro-data-inicio');
    const dataFimElement = document.getElementById('filtro-data-fim');
    
    if (tipoElement) tipoElement.value = '';
    if (dataInicioElement) dataInicioElement.value = '';
    if (dataFimElement) dataFimElement.value = '';
    
    vendasData.filters = { tipo: '', dataInicio: '', dataFim: '' };
    applyFilters();
    window.AppUtils.showAlert('Filtros limpos', 'success');
}

async function exportarVendas() {
    // Obter dados filtrados em vez de todos os dados
    const vendasFiltradas = getFilteredVendas();
    
    if (!vendasFiltradas || vendasFiltradas.length === 0) {
        window.AppUtils.showAlert('Nenhuma venda encontrada para exportar com os filtros aplicados', 'warning');
        return;
    }
    
    const dadosExportar = vendasFiltradas.map(venda => ({
        'Data': window.AppUtils.formatDateBR(venda.dataVenda, true),
        'Tipo': venda.tipoVenda,
        'Poste': venda.codigoPoste || '-',
        'Quantidade': venda.quantidade || '-',
        'Valor Venda': venda.valorVenda || 0,
        'Valor Extra': venda.valorExtra || 0,
        'Frete': venda.freteEletrons || 0,
        'Observações': venda.observacoes || '-'
    }));
    
    // Adicionar informação dos filtros no nome do arquivo
    const { tipo, dataInicio, dataFim } = vendasData.filters;
    let sufixoFiltro = '';
    
    if (tipo) {
        sufixoFiltro += `_${tipo}`;
    }
    
    if (dataInicio && dataFim) {
        sufixoFiltro += `_${dataInicio}_a_${dataFim}`;
    } else if (dataInicio) {
        sufixoFiltro += `_apartir_${dataInicio}`;
    } else if (dataFim) {
        sufixoFiltro += `_ate_${dataFim}`;
    }
    
    const nomeArquivo = `vendas_branco${sufixoFiltro}_${new Date().toISOString().split('T')[0]}`;
    
    window.AppUtils.exportToCSV(dadosExportar, nomeArquivo);
    
    // Mostrar mensagem informativa sobre o que foi exportado
    let mensagem = `${vendasFiltradas.length} venda(s) exportada(s)`;
    if (sufixoFiltro) {
        mensagem += ' com filtros aplicados';
    }
    
    window.AppUtils.showAlert(mensagem, 'success');
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

console.log('✅ Vendas Caminhão Branco com edição de data carregado');