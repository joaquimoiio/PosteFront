// Despesas JavaScript - VERSÃO FINAL COM FORMATO BRASILEIRO
const CONFIG = {
    API_BASE: 'http://localhost:8080/api'
};

// Estado global da página de despesas
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

// FUNÇÃO DE FORMATAÇÃO DE DATA BRASILEIRA (SEM HORA)
function formatDateBR(dateString) {
    if (!dateString) return '-';
    
    const date = new Date(dateString + 'T00:00:00'); // Evitar problemas de timezone
    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function formatDate(dateString) {
    return formatDateBR(dateString);
}

// Inicialização quando a página carrega
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎯 Inicializando página de Despesas...');
    
    // Configurar localização brasileira
    configurarLocaleBrasileiro();
    
    try {
        await loadDespesas();
        await loadResumo();
        setupEventListeners();
        setupFilters();
        
        // Definir filtros de data padrão - NOVO
        setDefaultDateFilters();
        
        // Aplicar filtros iniciais
        applyFilters();
        
        console.log('✅ Página de Despesas carregada com sucesso');
    } catch (error) {
        console.error('❌ Erro ao carregar página de Despesas:', error);
        showAlert('Erro ao carregar dados de despesas', 'error');
    }
});

// Configurar localização brasileira
function configurarLocaleBrasileiro() {
    document.documentElement.lang = 'pt-BR';
    
    // Configurar inputs de data
    setTimeout(() => {
        const inputs = document.querySelectorAll('input[type="date"]');
        inputs.forEach(input => {
            input.setAttribute('lang', 'pt-BR');
        });
    }, 100);
}

// Configurar event listeners
function setupEventListeners() {
    // Formulário de nova despesa
    const despesaForm = document.getElementById('despesa-form');
    if (despesaForm) {
        despesaForm.addEventListener('submit', handleDespesaSubmit);
    }
    
    // Formulário de edição
    const editForm = document.getElementById('edit-despesa-form');
    if (editForm) {
        editForm.addEventListener('submit', handleEditSubmit);
    }
}

// Configurar filtros
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

// Função para definir filtros de data padrão - NOVA
function setDefaultDateFilters() {
    const hoje = new Date();
    const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    
    // Definir data início como primeiro dia do mês atual
    const filtroDataInicio = document.getElementById('filtro-data-inicio');
    if (filtroDataInicio) {
        filtroDataInicio.value = dateToInputValue(primeiroDiaMes);
        despesasData.filters.dataInicio = filtroDataInicio.value;
    }
    
    // Definir data fim como hoje
    const filtroDataFim = document.getElementById('filtro-data-fim');
    if (filtroDataFim) {
        filtroDataFim.value = dateToInputValue(hoje);
        despesasData.filters.dataFim = filtroDataFim.value;
    }
}

// Aplicar filtros - VERSÃO CORRIGIDA
function applyFilters() {
    const { tipo, dataInicio, dataFim, descricao } = despesasData.filters;
    
    let filtered = [...despesasData.despesas];
    
    // Filtro por tipo
    if (tipo) {
        filtered = filtered.filter(d => d.tipo === tipo);
    }
    
    // Filtro por data início - CORRIGIDO
    if (dataInicio) {
        const dataInicioObj = new Date(dataInicio + 'T00:00:00'); // Adicionar horário para evitar problemas de timezone
        filtered = filtered.filter(d => {
            const dataDespesa = new Date(d.dataDespesa);
            return dataDespesa >= dataInicioObj;
        });
    }
    
    // Filtro por data fim - CORRIGIDO  
    if (dataFim) {
        const dataFimObj = new Date(dataFim + 'T23:59:59'); // Incluir o dia inteiro
        filtered = filtered.filter(d => {
            const dataDespesa = new Date(d.dataDespesa);
            return dataDespesa <= dataFimObj;
        });
    }
    
    // Filtro por descrição
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

// Carregar despesas
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

// Carregar resumo
async function loadResumo() {
    try {
        const despesasFuncionario = despesasData.despesas
            .filter(d => d.tipo === 'FUNCIONARIO')
            .reduce((sum, d) => sum + (d.valor || 0), 0);
            
        const outrasDespesas = despesasData.despesas
            .filter(d => d.tipo === 'OUTRAS')
            .reduce((sum, d) => sum + (d.valor || 0), 0);
            
        const totalGeral = despesasFuncionario + outrasDespesas;
        
        // Atualizar cards de resumo
        updateResumoCards({
            despesasFuncionario,
            outrasDespesas,
            totalGeral
        });
        
    } catch (error) {
        console.error('Erro ao calcular resumo:', error);
    }
}

// Atualizar cards de resumo
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
        }
    });
}

// Exibir despesas na tabela - FORMATAÇÃO BRASILEIRA SEM HORA
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

// Exibir erro ao carregar despesas
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

// Handler do formulário de nova despesa
async function handleDespesaSubmit(e) {
    e.preventDefault();
    
    const formData = {
        descricao: document.getElementById('despesa-descricao').value.trim(),
        valor: parseFloat(document.getElementById('despesa-valor').value),
        tipo: document.getElementById('despesa-tipo').value
    };
    
    // Validação
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
        
        // Resetar formulário
        e.target.reset();
        
        // Recarregar dados
        await loadDespesas();
        await loadResumo();
        
    } catch (error) {
        console.error('Erro ao criar despesa:', error);
        showAlert('Erro ao criar despesa', 'error');
    } finally {
        showLoading(false);
    }
}

// Handler do formulário de edição
async function handleEditSubmit(e) {
    e.preventDefault();
    
    const formData = {
        descricao: document.getElementById('edit-despesa-descricao').value.trim(),
        valor: parseFloat(document.getElementById('edit-despesa-valor').value),
        tipo: document.getElementById('edit-despesa-tipo').value
    };
    
    // Validação
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
        
        // Fechar modal
        closeModal('edit-despesa-modal');
        
        // Recarregar dados
        await loadDespesas();
        await loadResumo();
        
    } catch (error) {
        console.error('Erro ao atualizar despesa:', error);
        showAlert('Erro ao atualizar despesa', 'error');
    } finally {
        showLoading(false);
    }
}

// Função de edição
async function editDespesa(id) {
    try {
        const despesa = despesasData.despesas.find(d => d.id === id);
        
        if (!despesa) {
            throw new Error('Despesa não encontrada');
        }
        
        // Preencher formulário de edição
        document.getElementById('edit-despesa-descricao').value = despesa.descricao;
        document.getElementById('edit-despesa-valor').value = despesa.valor;
        document.getElementById('edit-despesa-tipo').value = despesa.tipo;
        
        // Definir ID atual
        despesasData.currentEditId = id;
        
        // Abrir modal
        document.getElementById('edit-despesa-modal').style.display = 'block';
        
    } catch (error) {
        console.error('Erro ao carregar despesa para edição:', error);
        showAlert('Erro ao carregar dados da despesa', 'error');
    }
}

// Função de exclusão
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
        
        // Recarregar dados
        await loadDespesas();
        await loadResumo();
        
    } catch (error) {
        console.error('Erro ao excluir despesa:', error);
        showAlert('Erro ao excluir despesa', 'error');
    } finally {
        showLoading(false);
    }
}

// Validar dados de despesa
function validarDespesa(dados) {
    const erros = [];
    
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

// Funções auxiliares
function exportarDespesas() {
    if (!despesasData.filteredDespesas || despesasData.filteredDespesas.length === 0) {
        showAlert('Nenhuma despesa para exportar', 'warning');
        return;
    }
    
    const dadosExportar = despesasData.filteredDespesas.map(despesa => ({
        'ID': despesa.id,
        'Data': formatDateBR(despesa.dataDespesa),
        'Descrição': despesa.descricao,
        'Valor': despesa.valor,
        'Tipo': despesa.tipo === 'FUNCIONARIO' ? 'Funcionário' : 'Outras'
    }));
    
    exportToCSV(dadosExportar, `despesas_${new Date().toISOString().split('T')[0]}`);
}

function limparFiltros() {
    // Limpar inputs de filtro
    document.getElementById('filtro-tipo').value = '';
    document.getElementById('filtro-data-inicio').value = '';
    document.getElementById('filtro-data-fim').value = '';
    document.getElementById('filtro-descricao').value = '';
    
    // Resetar filtros
    despesasData.filters = {
        tipo: '',
        dataInicio: '',
        dataFim: '',
        descricao: ''
    };
    
    // Reaplicar (sem filtros)
    applyFilters();
    
    showAlert('Filtros limpos', 'success');
}

function scrollToForm() {
    const form = document.getElementById('despesa-form');
    if (form) {
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // Focar no primeiro campo
        const firstInput = form.querySelector('input, select, textarea');
        if (firstInput) {
            firstInput.focus();
        }
    }
}

// Utilitários - FORMATAÇÃO BRASILEIRA
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

console.log('✅ Despesas carregado com formato brasileiro');