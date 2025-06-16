// Vendas JavaScript - VERSÃO REFATORADA COM DATAS CORRIGIDAS
const CONFIG = {
    API_BASE: 'http://localhost:8080/api'
};

// Estado global
let vendasData = {
    vendas: [],
    filteredVendas: [],
    postes: [],
    currentEditId: null,
    filters: {
        tipo: '',
        dataInicio: '',
        dataFim: ''
    }
};

// Formatação de data
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

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎯 Inicializando página de Vendas...');
    
    configurarLocaleBrasileiro();
    
    try {
        await loadPostes();
        await loadVendas();
        await loadResumo();
        setupEventListeners();
        setupFilters();
        setDefaultDateFilters();
        applyFilters();
        
        console.log('✅ Página de Vendas carregada com sucesso');
    } catch (error) {
        console.error('❌ Erro ao carregar página de Vendas:', error);
        showAlert('Erro ao carregar dados de vendas', 'error');
    }
});

function configurarLocaleBrasileiro() {
    document.documentElement.lang = 'pt-BR';
    
    setTimeout(() => {
        const inputs = document.querySelectorAll('input[type="date"], input[type="datetime-local"]');
        inputs.forEach(input => {
            input.setAttribute('lang', 'pt-BR');
        });
    }, 100);
}

function setupEventListeners() {
    const vendaForm = document.getElementById('venda-form');
    if (vendaForm) {
        vendaForm.addEventListener('submit', handleVendaSubmit);
        vendaForm.addEventListener('reset', resetForm);
    }
    
    const editForm = document.getElementById('edit-venda-form');
    if (editForm) {
        editForm.addEventListener('submit', handleEditSubmit);
    }
    
    const tipoVenda = document.getElementById('venda-tipo');
    if (tipoVenda) {
        tipoVenda.addEventListener('change', handleTipoVendaChange);
    }
    
    const editTipoVenda = document.getElementById('edit-tipo-venda');
    if (editTipoVenda) {
        editTipoVenda.addEventListener('change', handleEditTipoChange);
    }
    
    const posteVSelect = document.getElementById('venda-poste-v');
    const quantidadeV = document.getElementById('venda-quantidade-v');
    
    if (posteVSelect && quantidadeV) {
        posteVSelect.addEventListener('change', calcularValorVenda);
        quantidadeV.addEventListener('input', calcularValorVenda);
    }
    
    setDefaultDateTime();
}

function setupFilters() {
    const filterElements = {
        'filtro-tipo-venda': 'tipo',
        'filtro-data-inicio': 'dataInicio',
        'filtro-data-fim': 'dataFim'
    };
    
    Object.entries(filterElements).forEach(([elementId, filterKey]) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener('input', debounce(() => {
                vendasData.filters[filterKey] = element.value;
                applyFilters();
            }, 300));
        }
    });
}

function setDefaultDateFilters() {
    const hoje = new Date();
    const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    
    const filtroDataInicio = document.getElementById('filtro-data-inicio');
    if (filtroDataInicio) {
        filtroDataInicio.value = dateToInputValue(primeiroDiaMes);
        vendasData.filters.dataInicio = filtroDataInicio.value;
    }
    
    const filtroDataFim = document.getElementById('filtro-data-fim');
    if (filtroDataFim) {
        filtroDataFim.value = dateToInputValue(hoje);
        vendasData.filters.dataFim = filtroDataFim.value;
    }
}

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

function handleTipoVendaChange(e) {
    const tipo = e.target.value;
    
    document.getElementById('campos-tipo-e').style.display = 'none';
    document.getElementById('campos-tipo-v').style.display = 'none';
    document.getElementById('campos-tipo-l').style.display = 'none';
    
    if (tipo) {
        const camposDiv = document.getElementById(`campos-tipo-${tipo.toLowerCase()}`);
        if (camposDiv) {
            camposDiv.style.display = 'block';
        }
    }
    
    clearOtherTypeFields(tipo);
}

function handleEditTipoChange(e) {
    const tipo = e.target.value;
    
    const freteGroup = document.getElementById('edit-frete-group');
    const valorGroup = document.getElementById('edit-valor-group');
    const extraGroup = document.getElementById('edit-extra-group');
    
    if (freteGroup) freteGroup.style.display = 'block';
    if (valorGroup) valorGroup.style.display = 'block';
    if (extraGroup) extraGroup.style.display = 'none';
    
    if (tipo === 'E') {
        if (freteGroup) freteGroup.style.display = 'none';
        if (valorGroup) valorGroup.style.display = 'none';
        if (extraGroup) extraGroup.style.display = 'block';
    } else if (tipo === 'V') {
        if (freteGroup) freteGroup.style.display = 'none';
    }
}

function clearOtherTypeFields(currentType) {
    const allFields = {
        'E': ['venda-valor-extra'],
        'V': ['venda-poste-v', 'venda-quantidade-v', 'venda-valor-total-v'],
        'L': ['venda-poste-l', 'venda-quantidade-l', 'venda-frete-l']
    };
    
    Object.entries(allFields).forEach(([tipo, campos]) => {
        if (tipo !== currentType) {
            campos.forEach(campo => {
                const element = document.getElementById(campo);
                if (element) {
                    element.value = '';
                }
            });
        }
    });
}

function calcularValorVenda() {
    const posteSelect = document.getElementById('venda-poste-v');
    const quantidadeInput = document.getElementById('venda-quantidade-v');
    const valorInput = document.getElementById('venda-valor-total-v');
    
    if (!posteSelect || !quantidadeInput || !valorInput) return;
    
    const posteId = parseInt(posteSelect.value);
    const quantidade = parseInt(quantidadeInput.value) || 1;
    
    if (posteId) {
        const poste = vendasData.postes.find(p => p.id === posteId);
        if (poste) {
            const valorCalculado = poste.preco * quantidade;
            valorInput.value = valorCalculado.toFixed(2);
        }
    }
}

function applyFilters() {
    const { tipo, dataInicio, dataFim } = vendasData.filters;
    
    let filtered = [...vendasData.vendas];
    
    if (tipo) {
        filtered = filtered.filter(v => v.tipoVenda === tipo);
    }
    
    if (dataInicio) {
        const dataInicioObj = new Date(dataInicio + 'T00:00:00');
        filtered = filtered.filter(v => {
            const dataVenda = new Date(v.dataVenda);
            return dataVenda >= dataInicioObj;
        });
    }
    
    if (dataFim) {
        const dataFimObj = new Date(dataFim + 'T23:59:59');
        filtered = filtered.filter(v => {
            const dataVenda = new Date(v.dataVenda);
            return dataVenda <= dataFimObj;
        });
    }
    
    vendasData.filteredVendas = filtered;
    displayVendas(filtered);
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
        vendasData.postes = postes.filter(p => p.ativo);
        populatePosteSelects();
    } catch (error) {
        console.error('Erro ao carregar postes:', error);
        showAlert('Erro ao carregar lista de postes', 'warning');
    }
}

function populatePosteSelects() {
    const selects = ['venda-poste-v', 'venda-poste-l'];
    
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            while (select.children.length > 1) {
                select.removeChild(select.lastChild);
            }
            
            vendasData.postes.forEach(poste => {
                const option = document.createElement('option');
                option.value = poste.id;
                option.textContent = `${poste.codigo} - ${poste.descricao} (${formatCurrency(poste.preco)})`;
                select.appendChild(option);
            });
        }
    });
}

async function loadVendas() {
    try {
        showLoading(true);
        const vendas = await apiRequest('/vendas');
        vendasData.vendas = vendas;
        vendasData.filteredVendas = [...vendas];
        displayVendas(vendas);
    } catch (error) {
        console.error('Erro ao carregar vendas:', error);
        displayVendasError();
    } finally {
        showLoading(false);
    }
}

async function loadResumo() {
    try {
        const vendas = vendasData.vendas;
        
        const totalE = vendas.filter(v => v.tipoVenda === 'E').length;
        const totalV = vendas.filter(v => v.tipoVenda === 'V').length;
        const totalL = vendas.filter(v => v.tipoVenda === 'L').length;
        const totalGeral = vendas.length;
        
        updateResumoCards({
            totalE,
            totalV,
            totalL,
            totalGeral
        });
        
    } catch (error) {
        console.error('Erro ao calcular resumo:', error);
    }
}

function updateResumoCards(resumo) {
    const elements = {
        'total-vendas-e': resumo.totalE,
        'total-vendas-v': resumo.totalV,
        'total-vendas-l': resumo.totalL,
        'total-vendas-geral': resumo.totalGeral
    };
    
    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value.toString();
        }
    });
}

function displayVendas(vendas) {
    const tbody = document.querySelector('#vendas-table tbody');
    if (!tbody) return;
    
    if (!vendas || vendas.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-table">
                    <div class="empty-table-icon">📋</div>
                    <p>Nenhuma venda encontrada</p>
                    <button class="btn btn-primary" onclick="scrollToForm()">Cadastrar Primeira Venda</button>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = '';
    
    vendas.forEach(venda => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="date" data-label="Data">${formatDateBR(venda.dataVenda)}</td>
            <td data-label="Tipo">
                <span class="status ${venda.tipoVenda.toLowerCase()}">
                    ${getTipoVendaLabel(venda.tipoVenda)}
                </span>
            </td>
            <td data-label="Poste/Descrição">
                ${getPosteDescricao(venda)}
            </td>
            <td class="currency" data-label="Frete">${formatCurrency(venda.freteEletrons || 0)}</td>
            <td class="currency" data-label="Valor">${getValorVenda(venda)}</td>
            <td data-label="Observações">
                <div style="max-width: 150px; overflow: hidden; text-overflow: ellipsis;" title="${venda.observacoes || ''}">
                    ${venda.observacoes || '-'}
                </div>
            </td>
            <td data-label="Ações">
                <div class="table-actions">
                    <button class="btn btn-primary btn-small" onclick="editVenda(${venda.id})" title="Editar">
                        <span class="btn-icon">✏️</span>
                        Editar
                    </button>
                    <button class="btn btn-danger btn-small" onclick="deleteVenda(${venda.id})" title="Excluir">
                        <span class="btn-icon">🗑️</span>
                        Excluir
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function getTipoVendaLabel(tipo) {
    const labels = {
        'E': '📈 Extra',
        'V': '🛒 Normal',
        'L': '🏪 Loja'
    };
    return labels[tipo] || tipo;
}

function getPosteDescricao(venda) {
    if (venda.tipoVenda === 'E') {
        return '<em>Venda Extra</em>';
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
        return '<em>Só frete</em>';
    } else {
        return formatCurrency(venda.valorVenda || 0);
    }
}

function displayVendasError() {
    const tbody = document.querySelector('#vendas-table tbody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-table">
                    <div class="empty-table-icon">❌</div>
                    <p>Erro ao carregar vendas</p>
                    <button class="btn btn-secondary" onclick="loadVendas()">Tentar Novamente</button>
                </td>
            </tr>
        `;
    }
}

async function handleVendaSubmit(e) {
    e.preventDefault();
    
    const tipoVenda = document.getElementById('venda-tipo').value;
    const dataVenda = document.getElementById('venda-data').value;
    const observacoes = document.getElementById('venda-observacoes').value;
    
    if (!tipoVenda || !dataVenda) {
        showAlert('Tipo de venda e data são obrigatórios', 'warning');
        return;
    }
    
    let formData = {
        tipoVenda,
        dataVenda,
        observacoes: observacoes.trim() || null
    };
    
    try {
        if (tipoVenda === 'E') {
            const valorExtra = parseFloat(document.getElementById('venda-valor-extra').value);
            if (!valorExtra || valorExtra <= 0) {
                showAlert('Valor extra deve ser maior que zero', 'warning');
                return;
            }
            formData.valorExtra = valorExtra;
            
        } else if (tipoVenda === 'V') {
            const posteId = parseInt(document.getElementById('venda-poste-v').value);
            const quantidade = parseInt(document.getElementById('venda-quantidade-v').value) || 1;
            const valorTotal = parseFloat(document.getElementById('venda-valor-total-v').value);
            
            if (!posteId) {
                showAlert('Selecione um poste para venda normal', 'warning');
                return;
            }
            
            if (!valorTotal || valorTotal <= 0) {
                showAlert('Valor de venda deve ser maior que zero', 'warning');
                return;
            }
            
            formData.posteId = posteId;
            formData.quantidade = quantidade;
            formData.valorVenda = valorTotal;
            
        } else if (tipoVenda === 'L') {
            const posteId = parseInt(document.getElementById('venda-poste-l').value);
            const quantidade = parseInt(document.getElementById('venda-quantidade-l').value) || 1;
            const frete = parseFloat(document.getElementById('venda-frete-l').value) || 0;
            
            if (!posteId) {
                showAlert('Selecione um poste de referência para venda loja', 'warning');
                return;
            }
            
            formData.posteId = posteId;
            formData.quantidade = quantidade;
            formData.freteEletrons = frete;
        }
        
        showLoading(true);
        await apiRequest('/vendas', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        showAlert('Venda criada com sucesso!', 'success');
        
        resetForm();
        await loadVendas();
        await loadResumo();
        
    } catch (error) {
        console.error('Erro ao criar venda:', error);
        showAlert('Erro ao criar venda', 'error');
    } finally {
        showLoading(false);
    }
}

function resetForm() {
    const form = document.getElementById('venda-form');
    if (form) {
        form.reset();
        
        document.getElementById('campos-tipo-e').style.display = 'none';
        document.getElementById('campos-tipo-v').style.display = 'none';
        document.getElementById('campos-tipo-l').style.display = 'none';
        
        setDefaultDateTime();
    }
}

async function editVenda(id) {
    try {
        const venda = vendasData.vendas.find(v => v.id === id);
        
        if (!venda) {
            throw new Error('Venda não encontrada');
        }
        
        document.getElementById('edit-tipo-venda').value = venda.tipoVenda;
        document.getElementById('edit-observacoes').value = venda.observacoes || '';
        
        if (venda.tipoVenda === 'E') {
            document.getElementById('edit-valor-extra').value = venda.valorExtra || '';
        } else if (venda.tipoVenda === 'V') {
            document.getElementById('edit-valor-total').value = venda.valorVenda || '';
        } else if (venda.tipoVenda === 'L') {
            document.getElementById('edit-frete-eletrons').value = venda.freteEletrons || '';
        }
        
        handleEditTipoChange({ target: { value: venda.tipoVenda } });
        
        vendasData.currentEditId = id;
        document.getElementById('edit-venda-modal').style.display = 'block';
        
    } catch (error) {
        console.error('Erro ao carregar venda para edição:', error);
        showAlert('Erro ao carregar dados da venda', 'error');
    }
}

async function handleEditSubmit(e) {
    e.preventDefault();
    
    const tipoVenda = document.getElementById('edit-tipo-venda').value;
    const observacoes = document.getElementById('edit-observacoes').value;
    
    let formData = {
        observacoes: observacoes.trim() || null
    };
    
    if (tipoVenda === 'E') {
        const valorExtra = parseFloat(document.getElementById('edit-valor-extra').value);
        if (!valorExtra || valorExtra <= 0) {
            showAlert('Valor extra deve ser maior que zero', 'warning');
            return;
        }
        formData.valorExtra = valorExtra;
        
    } else if (tipoVenda === 'V') {
        const valorTotal = parseFloat(document.getElementById('edit-valor-total').value);
        if (!valorTotal || valorTotal <= 0) {
            showAlert('Valor de venda deve ser maior que zero', 'warning');
            return;
        }
        formData.valorVenda = valorTotal;
        
    } else if (tipoVenda === 'L') {
        const frete = parseFloat(document.getElementById('edit-frete-eletrons').value) || 0;
        formData.freteEletrons = frete;
    }
    
    try {
        showLoading(true);
        await apiRequest(`/vendas/${vendasData.currentEditId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        showAlert('Venda atualizada com sucesso!', 'success');
        
        closeModal('edit-venda-modal');
        await loadVendas();
        await loadResumo();
        
    } catch (error) {
        console.error('Erro ao atualizar venda:', error);
        showAlert('Erro ao atualizar venda', 'error');
    } finally {
        showLoading(false);
    }
}

async function deleteVenda(id) {
    const confirmed = await confirm(
        'Tem certeza que deseja excluir esta venda?'
    );
    
    if (!confirmed) return;
    
    try {
        showLoading(true);
        await apiRequest(`/vendas/${id}`, {
            method: 'DELETE'
        });
        
        showAlert('Venda excluída com sucesso!', 'success');
        
        await loadVendas();
        await loadResumo();
        
    } catch (error) {
        console.error('Erro ao excluir venda:', error);
        showAlert('Erro ao excluir venda', 'error');
    } finally {
        showLoading(false);
    }
}

function exportarVendas() {
    if (!vendasData.filteredVendas || vendasData.filteredVendas.length === 0) {
        showAlert('Nenhuma venda para exportar', 'warning');
        return;
    }
    
    const dadosExportar = vendasData.filteredVendas.map(venda => ({
        'Data': formatDateBR(venda.dataVenda),
        'Tipo': getTipoVendaLabel(venda.tipoVenda),
        'Poste': getPosteDescricao(venda),
        'Quantidade': venda.quantidade || 1,
        'Frete': venda.freteEletrons || 0,
        'Valor': venda.tipoVenda === 'E' ? venda.valorExtra : 
                 venda.tipoVenda === 'V' ? venda.valorVenda : 0,
        'Observações': venda.observacoes || ''
    }));
    
    exportToCSV(dadosExportar, `vendas_${new Date().toISOString().split('T')[0]}`);
}

function limparFiltros() {
    document.getElementById('filtro-tipo-venda').value = '';
    document.getElementById('filtro-data-inicio').value = '';
    document.getElementById('filtro-data-fim').value = '';
    
    vendasData.filters = {
        tipo: '',
        dataInicio: '',
        dataFim: ''
    };
    
    applyFilters();
    showAlert('Filtros limpos', 'success');
}

function scrollToForm() {
    const form = document.getElementById('venda-form');
    if (form) {
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        const firstInput = form.querySelector('input, select, textarea');
        if (firstInput) {
            firstInput.focus();
        }
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

function dateToInputValue(date) {
    if (!date) return '';
    
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
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

console.log('✅ Vendas refatorado carregado');