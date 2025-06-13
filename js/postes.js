// Funções auxiliares
window.exportarPostes = function() {
    if (!postesData.filteredPostes || postesData.filteredPostes.length === 0) {
        showAlert('Nenhum poste para exportar', 'warning');
        return;
    }
    
    const dadosExportar = postesData.filteredPostes.map(poste => ({
        'Código': poste.codigo,
        'Descrição': poste.descricao,
        'Preço': poste.preco,
        'Status': poste.ativo ? 'Ativo' : 'Inativo'
    }));
    
    Utils.exportToCSV(dadosExportar, `postes_${new Date().toISOString().split('T')[0]}`);
};

window.limparFiltros = function() {
    // Limpar inputs de filtro
    document.getElementById('filtro-status').value = '';
    document.getElementById('filtro-codigo').value = '';
    document.getElementById('filtro-descricao').value = '';
    
    // Resetar filtros
    postesData.filters = {
        status: '',
        codigo: '',
        descricao: ''
    };
    
    // Reaplicar (sem filtros)
    applyFilters();
    
    showAlert('Filtros limpos', 'success');
};

window.scrollToForm = function() {
    const form = document.getElementById('poste-form');
    if (form) {
        Utils.smoothScrollTo(form);
        
        // Focar no primeiro campo
        const firstInput = form.querySelector('input, select, textarea');
        if (firstInput) {
            firstInput.focus();
        }
    }
};

// Recarregar postes
window.loadPostes = loadPostes;// JavaScript da página de Postes - Versão Simplificada
let postesData = {
    postes: [],
    filteredPostes: [],
    currentEditId: null,
    filters: {
        status: '',
        codigo: '',
        descricao: ''
    }
};

// Função de inicialização da página
window.initPostesPage = async function() {
    console.log('🎯 Inicializando página de Postes...');
    
    try {
        await loadPostes();
        await loadEstatisticas();
        setupEventListeners();
        setupFilters();
        
        console.log('✅ Página de Postes carregada com sucesso');
    } catch (error) {
        console.error('❌ Erro ao carregar página de Postes:', error);
        showAlert('Erro ao carregar dados de postes', 'error');
    }
};

// Configurar event listeners
function setupEventListeners() {
    // Formulário de novo poste
    const posteForm = document.getElementById('poste-form');
    if (posteForm) {
        posteForm.addEventListener('submit', handlePosteSubmit);
    }
    
    // Formulário de edição
    const editForm = document.getElementById('edit-poste-form');
    if (editForm) {
        editForm.addEventListener('submit', handleEditSubmit);
    }
}

// Configurar filtros
function setupFilters() {
    const filterElements = {
        'filtro-status': 'status',
        'filtro-codigo': 'codigo',
        'filtro-descricao': 'descricao'
    };
    
    Object.entries(filterElements).forEach(([elementId, filterKey]) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener('input', Utils.debounce(() => {
                postesData.filters[filterKey] = element.value;
                applyFilters();
            }, 300));
        }
    });
}

// Aplicar filtros
function applyFilters() {
    const { status, codigo, descricao } = postesData.filters;
    
    let filtered = [...postesData.postes];
    
    // Filtro por status
    if (status !== '') {
        const isActive = status === 'true';
        filtered = filtered.filter(p => p.ativo === isActive);
    }
    
    // Filtro por código
    if (codigo) {
        const searchTerm = codigo.toLowerCase();
        filtered = filtered.filter(p => p.codigo.toLowerCase().includes(searchTerm));
    }
    
    // Filtro por descrição
    if (descricao) {
        const searchTerm = descricao.toLowerCase();
        filtered = filtered.filter(p => p.descricao.toLowerCase().includes(searchTerm));
    }
    
    postesData.filteredPostes = filtered;
    displayPostes(filtered);
}

// Carregar postes
async function loadPostes() {
    try {
        const postes = await PosteService.getAll();
        postesData.postes = postes;
        postesData.filteredPostes = [...postes];
        displayPostes(postes);
    } catch (error) {
        console.error('Erro ao carregar postes:', error);
        displayPostesError();
    }
}

// Carregar estatísticas
async function loadEstatisticas() {
    try {
        const postes = postesData.postes;
        const ativo = postes.filter(p => p.ativo).length;
        const total = postes.length;
        const precoMedio = postes.length > 0 ? 
            postes.reduce((sum, p) => sum + (p.preco || 0), 0) / postes.length : 0;
        
        updateEstatisticasCards({
            total,
            ativo,
            precoMedio
        });
        
    } catch (error) {
        console.error('Erro ao calcular estatísticas:', error);
    }
}

// Atualizar cards de estatísticas
function updateEstatisticasCards(stats) {
    const elements = {
        'total-postes': stats.total.toString(),
        'postes-ativos': stats.ativo.toString(),
        'preco-medio': Utils.formatCurrency(stats.precoMedio)
    };
    
    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    });
}

// Exibir postes na tabela
function displayPostes(postes) {
    const tbody = document.querySelector('#postes-table tbody');
    if (!tbody) return;
    
    if (!postes || postes.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-table">
                    <div class="empty-table-icon">⚡</div>
                    <p>Nenhum poste encontrado</p>
                    <button class="btn btn-primary" onclick="scrollToForm()">Cadastrar Primeiro Poste</button>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = '';
    
    postes.forEach(poste => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td data-label="Código"><strong>${poste.codigo}</strong></td>
            <td data-label="Descrição">
                <div style="max-width: 300px; overflow: hidden; text-overflow: ellipsis;" title="${poste.descricao}">
                    ${poste.descricao}
                </div>
            </td>
            <td class="currency" data-label="Preço">${Utils.formatCurrency(poste.preco)}</td>
            <td data-label="Status">
                <span class="status ${poste.ativo ? 'ativo' : 'inativo'}">
                    ${poste.ativo ? '✅ Ativo' : '❌ Inativo'}
                </span>
            </td>
            <td data-label="Ações">
                <div class="table-actions">
                    <button class="btn btn-primary btn-small" onclick="editPoste(${poste.id})" title="Editar">
                        <span class="btn-icon">✏️</span>
                        Editar
                    </button>
                    <button class="btn ${poste.ativo ? 'btn-secondary' : 'btn-success'} btn-small" 
                            onclick="togglePosteStatus(${poste.id})" 
                            title="${poste.ativo ? 'Inativar' : 'Ativar'}">
                        <span class="btn-icon">${poste.ativo ? '❌' : '✅'}</span>
                        ${poste.ativo ? 'Inativar' : 'Ativar'}
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Exibir erro ao carregar postes
function displayPostesError() {
    const tbody = document.querySelector('#postes-table tbody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-table">
                    <div class="empty-table-icon">❌</div>
                    <p>Erro ao carregar postes</p>
                    <button class="btn btn-secondary" onclick="loadPostes()">Tentar Novamente</button>
                </td>
            </tr>
        `;
    }
}

// Handler do formulário de novo poste
async function handlePosteSubmit(e) {
    e.preventDefault();
    
    const formData = {
        codigo: document.getElementById('poste-codigo').value.trim(),
        descricao: document.getElementById('poste-descricao').value.trim(),
        preco: parseFloat(document.getElementById('poste-preco').value),
        ativo: true
    };
    
    // Validação
    const erros = validarPoste(formData);
    if (erros.length > 0) {
        showAlert(erros.join(', '), 'warning');
        return;
    }
    
    try {
        await PosteService.create(formData);
        showAlert('Poste criado com sucesso!', 'success');
        
        // Resetar formulário
        e.target.reset();
        
        // Recarregar dados
        await loadPostes();
        await loadEstatisticas();
        
    } catch (error) {
        console.error('Erro ao criar poste:', error);
        showAlert('Erro ao criar poste', 'error');
    }
}

// Handler do formulário de edição
async function handleEditSubmit(e) {
    e.preventDefault();
    
    const formData = {
        codigo: document.getElementById('edit-poste-codigo').value.trim(),
        descricao: document.getElementById('edit-poste-descricao').value.trim(),
        preco: parseFloat(document.getElementById('edit-poste-preco').value),
        ativo: document.getElementById('edit-poste-ativo').value === 'true'
    };
    
    // Validação
    const erros = validarPoste(formData);
    if (erros.length > 0) {
        showAlert(erros.join(', '), 'warning');
        return;
    }
    
    try {
        await PosteService.update(postesData.currentEditId, formData);
        showAlert('Poste atualizado com sucesso!', 'success');
        
        // Fechar modal
        closeModal('edit-poste-modal');
        
        // Recarregar dados
        await loadPostes();
        await loadEstatisticas();
        
    } catch (error) {
        console.error('Erro ao atualizar poste:', error);
        showAlert('Erro ao atualizar poste', 'error');
    }
}

// Função de edição
window.editPoste = async function(id) {
    try {
        const poste = postesData.postes.find(p => p.id === id);
        
        if (!poste) {
            throw new Error('Poste não encontrado');
        }
        
        // Preencher formulário de edição
        document.getElementById('edit-poste-codigo').value = poste.codigo;
        document.getElementById('edit-poste-descricao').value = poste.descricao;
        document.getElementById('edit-poste-preco').value = poste.preco;
        document.getElementById('edit-poste-ativo').value = poste.ativo.toString();
        
        // Definir ID atual
        postesData.currentEditId = id;
        
        // Abrir modal
        document.getElementById('edit-poste-modal').style.display = 'block';
        
    } catch (error) {
        console.error('Erro ao carregar poste para edição:', error);
        showAlert('Erro ao carregar dados do poste', 'error');
    }
};

// Função de alternar status
window.togglePosteStatus = async function(id) {
    try {
        const poste = postesData.postes.find(p => p.id === id);
        if (!poste) {
            throw new Error('Poste não encontrado');
        }
        
        const novoStatus = !poste.ativo;
        const acao = novoStatus ? 'ativar' : 'inativar';
        
        const confirmed = await Utils.confirm(
            `Tem certeza que deseja ${acao} este poste?`,
            `Confirmar ${acao.charAt(0).toUpperCase() + acao.slice(1)}`
        );
        
        if (!confirmed) return;
        
        await PosteService.update(id, { ...poste, ativo: novoStatus });
        showAlert(`Poste ${acao}do com sucesso!`, 'success');
        
        await loadPostes();
        await loadEstatisticas();
        
    } catch (error) {
        console.error('Erro ao alterar status do poste:', error);
        showAlert('Erro ao alterar status do poste', 'error');
    }
};

// Validar dados de poste
function validarPoste(dados) {
    const erros = [];
    
    if (!dados.codigo || dados.codigo.trim().length < 1) {
        erros.push('Código é obrigatório');
    }
    
    if (!dados.descricao || dados.descricao.trim().length < 3) {
        erros.push('Descrição deve ter pelo menos 3 caracteres');
    }
    
    if (!dados.preco || dados.preco <= 0) {
        erros.push('Preço deve ser maior que zero');
    }
    
    // Verificar se código já existe (apenas para novos postes)
    if (!postesData.currentEditId) {
        const codigoExistente = postesData.postes.find(p => 
            p.codigo.toLowerCase() === dados.codigo.toLowerCase()
        );
        if (codigoExistente) {
            erros.push('Código já existe');
        }
    }
    
    return erros;
}

// Funções auxiliares
window.exportarPostes = function() {
    if (!postesData.postes || postesData.postes.length === 0) {
        showAlert('Nenhum poste para exportar', 'warning');
        return;
    }
    
    const dadosExportar = postesData.postes.map(poste => ({
        'Código': poste.codigo,
        'Descrição': poste.descricao,
        'Preço': poste.preco,
        'Status': poste.ativo ? 'Ativo' : 'Inativo'
    }));
    
    Utils.exportToCSV(dadosExportar, `postes_${new Date().toISOString().split('T')[0]}`);
};

window.scrollToForm = function() {
    const form = document.getElementById('poste-form');
    if (form) {
        Utils.smoothScrollTo(form);
        
        // Focar no primeiro campo
        const firstInput = form.querySelector('input, select, textarea');
        if (firstInput) {
            firstInput.focus();
        }
    }
};

// Recarregar postes
window.loadPostes = loadPostes;