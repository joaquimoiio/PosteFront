// JavaScript da página de Despesas - Versão Simplificada
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

// Função de inicialização da página
window.initDespesasPage = async function() {
    console.log('🎯 Inicializando página de Despesas...');
    
    try {
        await loadDespesas();
        await loadResumo();
        setupEventListeners();
        setupFilters();
        
        console.log('✅ Página de Despesas carregada com sucesso');
    } catch (error) {
        console.error('❌ Erro ao carregar página de Despesas:', error);
        showAlert('Erro ao carregar dados de despesas', 'error');
    }
};

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
            element.addEventListener('input', Utils.debounce(() => {
                despesasData.filters[filterKey] = element.value;
                applyFilters();
            }, 300));
        }
    });
}

// Aplicar filtros
function applyFilters() {
    const { tipo, dataInicio, dataFim, descricao } = despesasData.filters;
    
    let filtered = [...despesasData.despesas];
    
    // Filtro por tipo
    if (tipo) {
        filtered = filtered.filter(d => d.tipo === tipo);
    }
    
    // Filtro por data início
    if (dataInicio) {
        const dataInicioObj = new Date(dataInicio);
        filtered = filtered.filter(d => new Date(d.dataDespesa) >= dataInicioObj);
    }
    
    // Filtro por data fim
    if (dataFim) {
        const dataFimObj = new Date(dataFim);
        dataFimObj.setHours(23, 59, 59, 999); // Incluir o dia inteiro
        filtered = filtered.filter(d => new Date(d.dataDespesa) <= dataFimObj);
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

// Carregar despesas
async function loadDespesas() {
    try {
        const despesas = await DespesaService.getAll();
        despesasData.despesas = despesas;
        despesasData.filteredDespesas = [...despesas];
        displayDespesas(despesas);
    } catch (error) {
        console.error('Erro ao carregar despesas:', error);
        displayDespesasError();
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
            element.textContent = Utils.formatCurrency(value);
        }
    });
}

// Exibir despesas na tabela
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
            <td class="date" data-label="Data">${Utils.formatDate(despesa.dataDespesa)}</td>
            <td data-label="Descrição">
                <div style="max-width: 200px; overflow: hidden; text-overflow: ellipsis;" title="${despesa.descricao}">
                    ${despesa.descricao}
                </div>
            </td>
            <td class="currency" data-label="Valor">${Utils.formatCurrency(despesa.valor)}</td>
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
        await DespesaService.create(formData);
        showAlert('Despesa criada com sucesso!', 'success');
        
        // Resetar formulário
        e.target.reset();
        
        // Recarregar dados
        await loadDespesas();
        await loadResumo();
        
    } catch (error) {
        console.error('Erro ao criar despesa:', error);
        showAlert('Erro ao criar despesa', 'error');
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
        await DespesaService.update(despesasData.currentEditId, formData);
        showAlert('Despesa atualizada com sucesso!', 'success');
        
        // Fechar modal
        closeModal('edit-despesa-modal');
        
        // Recarregar dados
        await loadDespesas();
        await loadResumo();
        
    } catch (error) {
        console.error('Erro ao atualizar despesa:', error);
        showAlert('Erro ao atualizar despesa', 'error');
    }
}

// Função de edição
window.editDespesa = async function(id) {
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
};

// Função de exclusão
window.deleteDespesa = async function(id) {
    const confirmed = await Utils.confirm(
        'Tem certeza que deseja excluir esta despesa?',
        'Confirmar Exclusão'
    );
    
    if (!confirmed) return;
    
    try {
        await DespesaService.delete(id);
        showAlert('Despesa excluída com sucesso!', 'success');
        
        // Recarregar dados
        await loadDespesas();
        await loadResumo();
        
    } catch (error) {
        console.error('Erro ao excluir despesa:', error);
        showAlert('Erro ao excluir despesa', 'error');
    }
};

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
window.exportarDespesas = function() {
    if (!despesasData.filteredDespesas || despesasData.filteredDespesas.length === 0) {
        showAlert('Nenhuma despesa para exportar', 'warning');
        return;
    }
    
    const dadosExportar = despesasData.filteredDespesas.map(despesa => ({
        'ID': despesa.id,
        'Data': Utils.formatDate(despesa.dataDespesa),
        'Descrição': despesa.descricao,
        'Valor': despesa.valor,
        'Tipo': despesa.tipo === 'FUNCIONARIO' ? 'Funcionário' : 'Outras'
    }));
    
    Utils.exportToCSV(dadosExportar, `despesas_${new Date().toISOString().split('T')[0]}`);
};

window.limparFiltros = function() {
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
};

window.scrollToForm = function() {
    const form = document.getElementById('despesa-form');
    if (form) {
        Utils.smoothScrollTo(form);
        
        // Focar no primeiro campo
        const firstInput = form.querySelector('input, select, textarea');
        if (firstInput) {
            firstInput.focus();
        }
    }
};

// Recarregar despesas
window.loadDespesas = loadDespesas;