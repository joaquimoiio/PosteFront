// Despesas JavaScript Mobile-First - Versão Corrigida
const API_BASE = 'https://posteback.onrender.com/api';

// Estado global simplificado
const state = {
    despesas: [],
    currentEditId: null,
    filters: {
        tipo: '',
        dataInicio: '',
        dataFim: '',
        descricao: ''
    }
};

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎯 Inicializando Despesas Mobile...');
    
    try {
        configurarEventos();
        setDefaultDate();
        setDefaultDateFilters();
        await carregarDados();
        console.log('✅ Despesas carregado');
    } catch (error) {
        console.error('❌ Erro ao carregar:', error);
        showAlert('Erro ao carregar dados', 'error');
    }
});

// Configuração de eventos
function configurarEventos() {
    // Form principal
    const despesaForm = document.getElementById('despesa-form');
    if (despesaForm) {
        despesaForm.addEventListener('submit', handleDespesaSubmit);
        despesaForm.addEventListener('reset', resetForm);
    }
    
    // Form de edição
    const editForm = document.getElementById('edit-form');
    if (editForm) {
        editForm.addEventListener('submit', handleEditSubmit);
    }
    
    // Filtros
    setupFilters();
}

function setupFilters() {
    const filters = {
        'filtro-tipo': 'tipo',
        'filtro-data-inicio': 'dataInicio',
        'filtro-data-fim': 'dataFim',
        'filtro-descricao': 'descricao'
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
        
        const despesas = await fetchDespesas();
        state.despesas = despesas;
        
        updateResumo();
        applyFilters();
        
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        throw error;
    } finally {
        showLoading(false);
    }
}

// API calls - CORRIGIDOS
async function apiRequest(endpoint, options = {}) {
    // Construir URL completa
    const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    
    console.log('📡 Fazendo requisição:', options.method || 'GET', url);
    
    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...options.headers
        }
    });
    
    console.log('📡 Resposta recebida:', response.status, response.statusText);
    
    if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erro na API:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('📡 Dados recebidos:', data);
    return data;
}

async function fetchDespesas() {
    const params = new URLSearchParams();
    if (state.filters.dataInicio) params.append('dataInicio', state.filters.dataInicio);
    if (state.filters.dataFim) params.append('dataFim', state.filters.dataFim);
    
    const url = params.toString() ? `/despesas?${params}` : '/despesas';
    return await apiRequest(url);
}

// Manipulação do formulário
async function handleDespesaSubmit(e) {
    e.preventDefault();
    
    try {
        const formData = buildFormData();
        
        if (!validateFormData(formData)) {
            return;
        }
        
        showLoading(true);
        
        await apiRequest('/despesas', {
            method: 'POST',
            body: JSON.stringify(formData)
        });
        
        showAlert('Despesa criada com sucesso!', 'success');
        resetForm();
        await carregarDados();
        
    } catch (error) {
        console.error('Erro ao criar despesa:', error);
        showAlert('Erro ao criar despesa: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

function buildFormData() {
    return {
        dataDespesa: document.getElementById('despesa-data').value,
        descricao: document.getElementById('despesa-descricao').value.trim(),
        valor: parseFloat(document.getElementById('despesa-valor').value),
        tipo: document.getElementById('despesa-tipo').value
    };
}

function validateFormData(data) {
    if (!data.dataDespesa) {
        showAlert('Data da despesa é obrigatória', 'warning');
        return false;
    }
    
    if (!data.descricao || data.descricao.length < 3) {
        showAlert('Descrição deve ter pelo menos 3 caracteres', 'warning');
        return false;
    }
    
    if (!data.valor || data.valor <= 0) {
        showAlert('Valor deve ser maior que zero', 'warning');
        return false;
    }
    
    if (!data.tipo || !['FUNCIONARIO', 'OUTRAS'].includes(data.tipo)) {
        showAlert('Tipo de despesa inválido', 'warning');
        return false;
    }
    
    return true;
}

// Display despesas
function displayDespesas(despesas) {
    const container = document.getElementById('despesas-list');
    if (!container) return;
    
    if (!despesas || despesas.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">💸</div>
                <h3>Nenhuma despesa encontrada</h3>
                <p>Comece cadastrando sua primeira despesa.</p>
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
    
    const tipoLabel = despesa.tipo === 'FUNCIONARIO' ? '👥 Funcionário' : '📋 Outras';
    const tipoClass = despesa.tipo.toLowerCase();
    
    item.innerHTML = `
        <div class="item-header">
            <span class="item-type ${tipoClass}">
                ${tipoLabel}
            </span>
            <span class="item-date">${formatDateBR(despesa.dataDespesa)}</span>
        </div>
        
        <div class="item-content">
            <div class="item-value ${tipoClass}">${formatCurrency(despesa.valor)}</div>
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

// CRUD operations - CORRIGIDOS
async function editDespesa(id) {
    try {
        console.log('📝 Editando despesa ID:', id);
        
        const despesa = state.despesas.find(d => d.id === id);
        if (!despesa) {
            throw new Error('Despesa não encontrada no estado local');
        }
        
        populateEditForm(despesa);
        state.currentEditId = id;
        showModal();
        
    } catch (error) {
        console.error('Erro ao carregar despesa para edição:', error);
        showAlert('Erro ao carregar dados da despesa: ' + error.message, 'error');
    }
}

function populateEditForm(despesa) {
    console.log('📝 Preenchendo formulário de edição:', despesa);
    
    document.getElementById('edit-despesa-data').value = despesa.dataDespesa;
    document.getElementById('edit-despesa-descricao').value = despesa.descricao;
    document.getElementById('edit-despesa-valor').value = despesa.valor;
    document.getElementById('edit-despesa-tipo').value = despesa.tipo;
}

async function handleEditSubmit(e) {
    e.preventDefault();
    
    try {
        if (!state.currentEditId) {
            throw new Error('ID da despesa não encontrado');
        }
        
        const formData = buildEditFormData();
        
        if (!validateFormData(formData)) {
            return;
        }
        
        console.log('📝 Atualizando despesa ID:', state.currentEditId, 'com dados:', formData);
        
        showLoading(true);
        
        // CORREÇÃO: Usar PUT corretamente
        await apiRequest(`/despesas/${state.currentEditId}`, {
            method: 'PUT',
            body: JSON.stringify(formData)
        });
        
        showAlert('Despesa atualizada com sucesso!', 'success');
        closeModal();
        await carregarDados();
        
    } catch (error) {
        console.error('❌ Erro ao atualizar despesa:', error);
        showAlert('Erro ao atualizar despesa: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

function buildEditFormData() {
    const formData = {
        dataDespesa: document.getElementById('edit-despesa-data').value,
        descricao: document.getElementById('edit-despesa-descricao').value.trim(),
        valor: parseFloat(document.getElementById('edit-despesa-valor').value),
        tipo: document.getElementById('edit-despesa-tipo').value
    };
    
    console.log('📝 Dados do formulário de edição:', formData);
    return formData;
}

async function deleteDespesa(id) {
    try {
        console.log('🗑️ Tentando excluir despesa ID:', id);
        
        if (!confirm('Tem certeza que deseja excluir esta despesa?')) {
            return;
        }
        
        showLoading(true);
        
        // CORREÇÃO: Usar DELETE corretamente
        await apiRequest(`/despesas/${id}`, { 
            method: 'DELETE' 
        });
        
        console.log('✅ Despesa excluída com sucesso');
        showAlert('Despesa excluída com sucesso!', 'success');
        await carregarDados();
        
    } catch (error) {
        console.error('❌ Erro ao excluir despesa:', error);
        showAlert('Erro ao excluir despesa: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Filtros e resumo
function applyFilters() {
    const { tipo, dataInicio, dataFim, descricao } = state.filters;
    
    let filtered = [...state.despesas];
    
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
    
    displayDespesas(filtered);
}

function updateResumo() {
    const despesas = state.despesas;
    
    const despesasFuncionario = despesas
        .filter(d => d.tipo === 'FUNCIONARIO')
        .reduce((sum, d) => sum + (d.valor || 0), 0);
        
    const outrasDespesas = despesas
        .filter(d => d.tipo === 'OUTRAS')
        .reduce((sum, d) => sum + (d.valor || 0), 0);
        
    const totalGeral = despesasFuncionario + outrasDespesas;
    
    updateElement('total-despesas-funcionario', formatCurrency(despesasFuncionario));
    updateElement('total-outras-despesas', formatCurrency(outrasDespesas));
    updateElement('total-despesas-geral', formatCurrency(totalGeral));
}

// Utilitários
function setDefaultDate() {
    const despesaData = document.getElementById('despesa-data');
    if (despesaData) {
        const hoje = new Date();
        despesaData.value = dateToInputValue(hoje);
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
    document.getElementById('despesa-form').reset();
    setTimeout(setDefaultDate, 100);
}

function limparFiltros() {
    document.getElementById('filtro-tipo').value = '';
    document.getElementById('filtro-data-inicio').value = '';
    document.getElementById('filtro-data-fim').value = '';
    document.getElementById('filtro-descricao').value = '';
    
    state.filters = { tipo: '', dataInicio: '', dataFim: '', descricao: '' };
    applyFilters();
    showAlert('Filtros limpos', 'success');
}

function scrollToForm() {
    const form = document.getElementById('despesa-form');
    if (form) {
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const firstInput = form.querySelector('input, select, textarea');
        if (firstInput) firstInput.focus();
    }
}

async function exportarDespesas() {
    if (!state.despesas || state.despesas.length === 0) {
        showAlert('Nenhuma despesa para exportar', 'warning');
        return;
    }
    
    const dadosExportar = state.despesas.map(despesa => ({
        'Data': formatDateBR(despesa.dataDespesa),
        'Descrição': despesa.descricao,
        'Valor': despesa.valor,
        'Tipo': despesa.tipo === 'FUNCIONARIO' ? 'Funcionário' : 'Outras'
    }));
    
    exportToCSV(dadosExportar, `despesas_${new Date().toISOString().split('T')[0]}`);
}

async function loadDespesas() {
    await carregarDados();
    showAlert('Dados atualizados!', 'success');
}

// Modal functions - CORRIGIDAS
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
    if (modal) {
        modal.style.display = 'none';
    }
    
    // CORREÇÃO: Limpar o ID atual ao fechar o modal
    state.currentEditId = null;
    
    console.log('✖️ Modal fechado, ID limpo');
}

// Formatters
function formatCurrency(value) {
    if (value == null || isNaN(value)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

function formatDateBR(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function dateToInputValue(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Helper functions
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
    if (!container) {
        console.warn('Container de alertas não encontrado');
        return;
    }
    
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

console.log('✅ Despesas Mobile carregado (versão corrigida)');