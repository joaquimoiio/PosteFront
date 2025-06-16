// Despesas JavaScript - VERSÃO REFATORADA COM DATAS CORRIGIDAS
const CONFIG = {
    API_BASE: 'http://localhost:8080/api'
};

// Estado global
let despesasData = {
    despesas: [],
    filteredDespesas: [],
    currentEditId: null,
    filters: {
        tipo: '',
        dataInicio: '',
        dataFim: '',
        descricao: ''
    }
};

// Formatação de data brasileira
function formatDateBR(dateString) {
    if (!dateString) return '-';
    
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎯 Inicializando página de Despesas...');
    
    configurarLocaleBrasileiro();
    
    try {
        await loadDespesas();
        await loadResumo();
        setupEventListeners();
        setupFilters();
        setDefaultDate();
        setDefaultDateFilters();
        applyFilters();
        
        console.log('✅ Página de Despesas carregada com sucesso');
    } catch (error) {
        console.error('❌ Erro ao carregar página de Despesas:', error);
        showAlert('Erro ao carregar dados de despesas', 'error');
    }
});

function configurarLocaleBrasileiro() {
    document.documentElement.lang = 'pt-BR';
    
    setTimeout(() => {
        const inputs = document.querySelectorAll('input[type="date"]');
        inputs.forEach(input => {
            input.setAttribute('lang', 'pt-BR');
        });
    }, 100);
}

function setDefaultDate() {
    const despesaData = document.getElementById('despesa-data');
    if (despesaData) {
        const hoje = new Date();
        despesaData.value = dateToInputValue(hoje);
    }
}

function setupEventListeners() {
    const despesaForm = document.getElementById('despesa-form');
    if (despesaForm) {
        despesaForm.addEventListener('submit', handleDespesaSubmit);
        despesaForm.addEventListener('reset', resetFormWithDefaultDate);
    }
    
    const editForm = document.getElementById('edit-despesa-form');
    if (editForm) {
        editForm.addEventListener('submit', handleEditSubmit);
    }
}

function resetFormWithDefaultDate() {
    setTimeout(() => {
        setDefaultDate();
    }, 100);
}

function setupFilters() {
    const filterElements = {
        'filtro-tipo': 'tipo',
        'filtro-data-inicio': 'dataInicio',
        'filtro-data-fim': 'dataFim',
        'filtro-descricao': 'descricao'
    };
    
    Object.entries(filterElements).forEach(([elementId, filterKey]) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener('input', debounce(() => {
                despesasData.filters[filterKey] = element.value;
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
        despesasData.filters.dataInicio = filtroDataInicio.value;
    }
    
    const filtroDataFim = document.getElementById('filtro-data-fim');
    if (filtroDataFim) {
        filtroDataFim.value = dateToInputValue(hoje);
        despesasData.filters.dataFim = filtroDataFim.value;
    }
}

function applyFilters() {
    const { tipo, dataInicio, dataFim, descricao } = despesasData.filters;
    
    let filtered = [...despesasData.despesas];
    
    if (tipo) {
        filtered = filtered.filter(d => d.tipo === tipo);
    }
    
    if (dataInicio) {
        const dataInicioObj = new Date(dataInicio + 'T00:00:00');
        filtered = filtered.filter(d => {
            const dataDespesa = new Date(d.dataDespesa + 'T00:00:00');
            return dataDespesa >= dataInicioObj;
        });
    }
    
    if (dataFim) {
        const dataFimObj = new Date(dataFim + 'T23:59:59');
        filtered = filtered.filter(d => {
            const dataDespesa = new Date(d.dataDespesa + 'T00:00:00');
            return dataDespesa <= dataFimObj;
        });
    }
    
    if (descricao) {
        const searchTerm = descricao.toLowerCase();
        filtered = filtered.filter(d => 
            d.descricao.toLowerCase().includes(searchTerm)
        );
    }
    
    despesasData.filteredDespesas = filtered;
    displayDespesas(filtered);
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

async function loadDespesas() {
    try {
        showLoading(true);
        const despesas = await apiRequest('/despesas');
        despesasData.despesas = despesas;
        despesasData.filteredDespesas = [...despesas];
        displayDespesas(despesas);
    } catch (error) {
        console.error('Erro ao carregar despesas:', error);
        displayDespesasError();
    } finally {
        showLoading(false);
    }
}

async function loadResumo() {
    try {
        const despesasFuncionario = despesasData.despesas
            .filter(d => d.tipo === 'FUNCIONARIO')
            .reduce((sum, d) => sum + (d.valor || 0), 0);
            
        const outrasDespesas = despesasData.despesas
            .filter(d => d.tipo === 'OUTRAS')
            .reduce((sum, d) => sum + (d.valor || 0), 0);
            
        const totalGeral = despesasFuncionario + outrasDespesas;
        
        updateResumoCards({
            despesasFuncionario,
            outrasDespesas,
            totalGeral
        });
        
    } catch (error) {
        console.error('Erro ao calcular resumo:', error);
    }
}

function updateResumoCards(resumo) {
    const elements = {
        'total-despesas-funcionario': resumo.despesasFuncionario,
        'total-outras-despesas': resumo.outrasDespesas,
        'total-despesas-geral': resumo.totalGeral
    };
    
    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = formatCurrency(value);
            
            if (id.includes('funcionario')) {
                element.style.color = '#f59e0b';
            } else if (id.includes('outras')) {
                element.style.color = '#dc2626';
            } else if (id.includes('geral')) {
                element.style.color = '#6b7280';
            }
        }
    });
}

function displayDespesas(despesas) {
    const tbody = document.querySelector('#despesas-table tbody');
    if (!tbody) return;
    
    if (!despesas || despesas.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-table">
                    <div class="empty-table-icon">💸</div>
                    <p>Nenhuma despesa encontrada</p>
                    <button class="btn btn-primary" onclick="scrollToForm()">Cadastrar Primeira Despesa</button>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = '';
    
    despesas.forEach(despesa => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="date" data-label="Data">${formatDateBR(despesa.dataDespesa)}</td>
            <td data-label="Descrição">
                <div style="max-width: 200px; overflow: hidden; text-overflow: ellipsis;" title="${despesa.descricao}">
                    ${despesa.descricao}
                </div>
            </td>
            <td class="currency" data-label="Valor">${formatCurrency(despesa.valor)}</td>
            <td data-label="Tipo">
                <span class="status ${despesa.tipo.toLowerCase()}">
                    ${despesa.tipo === 'FUNCIONARIO' ? '👥 Funcionário' : '📋 Outras'}
                </span>
            </td>
            <td data-label="Ações">
                <div class="table-actions">
                    <button class="btn btn-primary btn-small" onclick="editDespesa(${despesa.id})" title="Editar">
                        <span class="btn-icon">✏️</span>
                        Editar
                    </button>
                    <button class="btn btn-danger btn-small" onclick="deleteDespesa(${despesa.id})" title="Excluir">
                        <span class="btn-icon">🗑️</span>
                        Excluir
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function displayDespesasError() {
    const tbody = document.querySelector('#despesas-table tbody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-table">
                    <div class="empty-table-icon">❌</div>
                    <p>Erro ao carregar despesas</p>
                    <button class="btn btn-secondary" onclick="loadDespesas()">Tentar Novamente</button>
                </td>
            </tr>
        `;
    }
}

async function handleDespesaSubmit(e) {
    e.preventDefault();
    
    const formData = {
        dataDespesa: document.getElementById('despesa-data').value,
        descricao: document.getElementById('despesa-descricao').value.trim(),
        valor: parseFloat(document.getElementById('despesa-valor').value),
        tipo: document.getElementById('despesa-tipo').value
    };
    
    const erros = validarDespesa(formData);
    if (erros.length > 0) {
        showAlert(erros.join(', '), 'warning');
        return;
    }
    
    try {
        showLoading(true);
        await apiRequest('/despesas', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        showAlert('Despesa criada com sucesso!', 'success');
        
        e.target.reset();
        setDefaultDate();
        
        await loadDespesas();
        await loadResumo();
        
    } catch (error) {
        console.error('Erro ao criar despesa:', error);
        showAlert('Erro ao criar despesa', 'error');
    } finally {
        showLoading(false);
    }
}

async function handleEditSubmit(e) {
    e.preventDefault();
    
    const formData = {
        dataDespesa: document.getElementById('edit-despesa-data').value,
        descricao: document.getElementById('edit-despesa-descricao').value.trim(),
        valor: parseFloat(document.getElementById('edit-despesa-valor').value),
        tipo: document.getElementById('edit-despesa-tipo').value
    };
    
    const erros = validarDespesa(formData);
    if (erros.length > 0) {
        showAlert(erros.join(', '), 'warning');
        return;
    }
    
    try {
        showLoading(true);
        await apiRequest(`/despesas/${despesasData.currentEditId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        showAlert('Despesa atualizada com sucesso!', 'success');
        
        closeModal('edit-despesa-modal');
        
        await loadDespesas();
        await loadResumo();
        
    } catch (error) {
        console.error('Erro ao atualizar despesa:', error);
        showAlert('Erro ao atualizar despesa', 'error');
    } finally {
        showLoading(false);
    }
}

async function editDespesa(id) {
    try {
        const despesa = despesasData.despesas.find(d => d.id === id);
        
        if (!despesa) {
            throw new Error('Despesa não encontrada');
        }
        
        document.getElementById('edit-despesa-data').value = despesa.dataDespesa;
        document.getElementById('edit-despesa-descricao').value = despesa.descricao;
        document.getElementById('edit-despesa-valor').value = despesa.valor;
        document.getElementById('edit-despesa-tipo').value = despesa.tipo;
        
        despesasData.currentEditId = id;
        document.getElementById('edit-despesa-modal').style.display = 'block';
        
    } catch (error) {
        console.error('Erro ao carregar despesa para edição:', error);
        showAlert('Erro ao carregar dados da despesa', 'error');
    }
}

async function deleteDespesa(id) {
    const confirmed = await confirm(
        'Tem certeza que deseja excluir esta despesa?'
    );
    
    if (!confirmed) return;
    
    try {
        showLoading(true);
        await apiRequest(`/despesas/${id}`, {
            method: 'DELETE'
        });
        
        showAlert('Despesa excluída com sucesso!', 'success');
        
        await loadDespesas();
        await loadResumo();
        
    } catch (error) {
        console.error('Erro ao excluir despesa:', error);
        showAlert('Erro ao excluir despesa', 'error');
    } finally {
        showLoading(false);
    }
}

function validarDespesa(dados) {
    const erros = [];
    
    if (!dados.dataDespesa) {
        erros.push('Data da despesa é obrigatória');
    }
    
    if (!dados.descricao || dados.descricao.trim().length < 3) {
        erros.push('Descrição deve ter pelo menos 3 caracteres');
    }
    
    if (!dados.valor || dados.valor <= 0) {
        erros.push('Valor deve ser maior que zero');
    }
    
    if (!dados.tipo || !['FUNCIONARIO', 'OUTRAS'].includes(dados.tipo)) {
        erros.push('Tipo de despesa inválido');
    }
    
    return erros;
}

function exportarDespesas() {
    if (!despesasData.filteredDespesas || despesasData.filteredDespesas.length === 0) {
        showAlert('Nenhuma despesa para exportar', 'warning');
        return;
    }
    
    const dadosExportar = despesasData.filteredDespesas.map(despesa => ({
        'Data': formatDateBR(despesa.dataDespesa),
        'Descrição': despesa.descricao,
        'Valor': despesa.valor,
        'Tipo': despesa.tipo === 'FUNCIONARIO' ? 'Funcionário' : 'Outras'
    }));
    
    exportToCSV(dadosExportar, `despesas_${new Date().toISOString().split('T')[0]}`);
}

function limparFiltros() {
    document.getElementById('filtro-tipo').value = '';
    document.getElementById('filtro-data-inicio').value = '';
    document.getElementById('filtro-data-fim').value = '';
    document.getElementById('filtro-descricao').value = '';
    
    despesasData.filters = {
        tipo: '',
        dataInicio: '',
        dataFim: '',
        descricao: ''
    };
    
    applyFilters();
    showAlert('Filtros limpos', 'success');
}

function scrollToForm() {
    const form = document.getElementById('despesa-form');
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

console.log('✅ Despesas refatorado carregado');