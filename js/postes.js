// JavaScript da página de Postes
let postesData = {
    postes: [],
    filteredPostes: [],
    selectedIds: new Set(),
    currentEditId: null,
    currentDeleteId: null,
    filters: {
        status: '',
        codigo: '',
        descricao: '',
        precoMin: '',
        precoMax: ''
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
    
    // Select de ação em lote
    const acaoLoteSelect = document.getElementById('acao-lote');
    if (acaoLoteSelect) {
        acaoLoteSelect.addEventListener('change', handleAcaoLoteChange);
    }
    
    // Configurar ordenação da tabela
    setupTableSorting();
    
    // Configurar seleção em massa
    setupMassSelection();
}

// Configurar filtros
function setupFilters() {
    const filterElements = {
        'filtro-status': 'status',
        'filtro-codigo': 'codigo',
        'filtro-descricao': 'descricao',
        'filtro-preco-min': 'precoMin',
        'filtro-preco-max': 'precoMax'
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
        
        // Para "mais vendido", usaríamos dados de vendas reais
        // Por agora, apenas um placeholder
        const maisVendido = 'N/A';
        
        updateEstatisticasCards({
            total,
            ativo,
            precoMedio,
            maisVendido
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
        'preco-medio': Utils.formatCurrency(stats.precoMedio),
        'mais-vendido': stats.maisVendido
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
            <td data-label="Código">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <input type="checkbox" class="poste-checkbox" value="${poste.id}" 
                           onchange="handleCheckboxChange(${poste.id}, this.checked)">
                    <strong>${poste.codigo}</strong>
                </div>
            </td>
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
                    <button class="btn btn-danger btn-small" onclick="deletePoste(${poste.id})" title="Excluir">
                        <span class="btn-icon">🗑️</span>
                        Excluir
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    updateSelectionUI();
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

// Aplicar filtros
function applyFilters() {
    const { status, codigo, descricao, precoMin, precoMax } = postesData.filters;
    
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
    
    // Filtro por preço mínimo
    if (precoMin) {
        const minPrice = parseFloat(precoMin);
        filtered = filtered.filter(p => (p.preco || 0) >= minPrice);
    }
    
    // Filtro por preço máximo
    if (precoMax) {
        const maxPrice = parseFloat(precoMax);
        filtered = filtered.filter(p => (p.preco || 0) <= maxPrice);
    }
    
    postesData.filteredPostes = filtered;
    displayPostes(filtered);
    
    // Limpar seleções se não estiverem mais visíveis
    postesData.selectedIds.forEach(id => {
        if (!filtered.find(p => p.id === id)) {
            postesData.selectedIds.delete(id);
        }
    });
    updateSelectionUI();
}

// Configurar ordenação da tabela
function setupTableSorting() {
    const headers = document.querySelectorAll('#postes-table th.sortable');
    
    headers.forEach(header => {
        header.addEventListener('click', () => {
            const sortKey = header.dataset.sort;
            sortTable(sortKey, header);
        });
    });
}

// Ordenar tabela
function sortTable(key, headerElement) {
    const isAscending = !headerElement.classList.contains('asc');
    
    // Remover classes de ordenação de todos os headers
    document.querySelectorAll('#postes-table th.sortable').forEach(h => {
        h.classList.remove('asc', 'desc');
    });
    
    // Adicionar classe ao header atual
    headerElement.classList.add(isAscending ? 'asc' : 'desc');
    
    // Ordenar dados
    postesData.filteredPostes.sort((a, b) => {
        let valueA = a[key];
        let valueB = b[key];
        
        // Tratar diferentes tipos de dados
        if (key === 'preco') {
            valueA = parseFloat(valueA) || 0;
            valueB = parseFloat(valueB) || 0;
        } else if (key === 'ativo') {
            valueA = valueA ? 1 : 0;
            valueB = valueB ? 1 : 0;
        } else if (typeof valueA === 'string') {
            valueA = valueA.toLowerCase();
            valueB = valueB.toLowerCase();
        }
        
        if (valueA < valueB) return isAscending ? -1 : 1;
        if (valueA > valueB) return isAscending ? 1 : -1;
        return 0;
    });
    
    displayPostes(postesData.filteredPostes);
}

// Configurar seleção em massa
function setupMassSelection() {
    // Header checkbox para selecionar todos
    const headerCheckbox = document.createElement('input');
    headerCheckbox.type = 'checkbox';
    headerCheckbox.onchange = function() {
        if (this.checked) {
            selecionarTodos();
        } else {
            deselecionarTodos();
        }
    };
    
    const firstHeader = document.querySelector('#postes-table th');
    if (firstHeader) {
        firstHeader.insertBefore(headerCheckbox, firstHeader.firstChild);
    }
}

// Gerenciar mudança de checkbox
window.handleCheckboxChange = function(id, checked) {
    if (checked) {
        postesData.selectedIds.add(id);
    } else {
        postesData.selectedIds.delete(id);
    }
    updateSelectionUI();
};

// Atualizar UI de seleção
function updateSelectionUI() {
    const contador = document.getElementById('contador-selecionados');
    const container = document.getElementById('itens-selecionados');
    
    if (contador && container) {
        contador.textContent = postesData.selectedIds.size;
        container.style.display = postesData.selectedIds.size > 0 ? 'block' : 'none';
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
    const erros = PostesUtils.validarPoste(formData);
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
    const erros = PostesUtils.validarPoste(formData);
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

// Função de exclusão
window.deletePoste = function(id) {
    const poste = postesData.postes.find(p => p.id === id);
    
    if (!poste) {
        showAlert('Poste não encontrado', 'error');
        return;
    }
    
    // Preencher modal de confirmação
    document.getElementById('poste-para-excluir').textContent = 
        `${poste.codigo} - ${poste.descricao}`;
    
    postesData.currentDeleteId = id;
    
    // Abrir modal de confirmação
    document.getElementById('delete-poste-modal').style.display = 'block';
};

// Confirmar exclusão
window.confirmarExclusaoPoste = async function() {
    try {
        // Em vez de excluir, apenas inativar
        const poste = postesData.postes.find(p => p.id === postesData.currentDeleteId);
        await PosteService.update(postesData.currentDeleteId, { ...poste, ativo: false });
        
        showAlert('Poste inativado com sucesso!', 'success');
        
        // Fechar modal
        closeModal('delete-poste-modal');
        
        // Recarregar dados
        await loadPostes();
        await loadEstatisticas();
        
    } catch (error) {
        console.error('Erro ao inativar poste:', error);
        showAlert('Erro ao inativar poste', 'error');
    }
};

// Funções de ação em lote
function handleAcaoLoteChange(e) {
    const ajusteContainer = document.getElementById('ajuste-preco-container');
    if (ajusteContainer) {
        ajusteContainer.style.display = e.target.value === 'ajustar-preco' ? 'block' : 'none';
    }
}

window.selecionarTodos = function() {
    postesData.selectedIds.clear();
    postesData.filteredPostes.forEach(poste => {
        postesData.selectedIds.add(poste.id);
    });
    
    // Atualizar checkboxes
    document.querySelectorAll('.poste-checkbox').forEach(cb => {
        cb.checked = true;
    });
    
    updateSelectionUI();
};

window.deselecionarTodos = function() {
    postesData.selectedIds.clear();
    
    // Atualizar checkboxes
    document.querySelectorAll('.poste-checkbox').forEach(cb => {
        cb.checked = false;
    });
    
    updateSelectionUI();
};

window.executarAcaoLote = function() {
    const acao = document.getElementById('acao-lote').value;
    
    if (!acao) {
        showAlert('Selecione uma ação', 'warning');
        return;
    }
    
    if (postesData.selectedIds.size === 0) {
        showAlert('Selecione pelo menos um poste', 'warning');
        return;
    }
    
    // Preparar modal de confirmação
    let descricaoAcao = '';
    let previewHTML = '';
    
    switch (acao) {
        case 'ativar':
            descricaoAcao = 'Ativar postes selecionados';
            break;
        case 'inativar':
            descricaoAcao = 'Inativar postes selecionados';
            break;
        case 'ajustar-preco':
            const percentual = document.getElementById('percentual-ajuste').value;
            if (!percentual) {
                showAlert('Informe o percentual de ajuste', 'warning');
                return;
            }
            descricaoAcao = `Ajustar preços em ${percentual}%`;
            previewHTML = `<strong>Novo preço será calculado como: Preço atual ${percentual > 0 ? '+' : ''}${percentual}%</strong>`;
            break;
        case 'excluir':
            descricaoAcao = 'Inativar postes selecionados (não será possível reverter)';
            break;
    }
    
    // Preencher modal
    document.getElementById('descricao-acao-lote').textContent = descricaoAcao;
    document.getElementById('quantidade-itens-lote').textContent = postesData.selectedIds.size;
    document.getElementById('preview-acao-lote').innerHTML = previewHTML;
    
    // Abrir modal
    document.getElementById('lote-modal').style.display = 'block';
};

window.confirmarAcaoLote = async function() {
    const acao = document.getElementById('acao-lote').value;
    
    try {
        const promises = [];
        
        postesData.selectedIds.forEach(id => {
            const poste = postesData.postes.find(p => p.id === id);
            if (!poste) return;
            
            let updateData = { ...poste };
            
            switch (acao) {
                case 'ativar':
                    updateData.ativo = true;
                    break;
                case 'inativar':
                case 'excluir':
                    updateData.ativo = false;
                    break;
                case 'ajustar-preco':
                    const percentual = parseFloat(document.getElementById('percentual-ajuste').value);
                    updateData.preco = poste.preco * (1 + percentual / 100);
                    break;
            }
            
            promises.push(PosteService.update(id, updateData));
        });
        
        await Promise.all(promises);
        
        showAlert(`Ação executada em ${postesData.selectedIds.size} postes!`, 'success');
        
        // Fechar modal
        closeModal('lote-modal');
        
        // Limpar seleções
        deselecionarTodos();
        
        // Recarregar dados
        await loadPostes();
        await loadEstatisticas();
        
    } catch (error) {
        console.error('Erro ao executar ação em lote:', error);
        showAlert('Erro ao executar ação em lote', 'error');
    }
};

window.ativarTodos = async function() {
    const confirmed = await Utils.confirm(
        'Tem certeza que deseja ativar todos os postes?',
        'Confirmar Ativação'
    );
    
    if (!confirmed) return;
    
    try {
        const promises = postesData.postes.map(poste => 
            PosteService.update(poste.id, { ...poste, ativo: true })
        );
        
        await Promise.all(promises);
        showAlert('Todos os postes foram ativados!', 'success');
        
        await loadPostes();
        await loadEstatisticas();
        
    } catch (error) {
        console.error('Erro ao ativar todos os postes:', error);
        showAlert('Erro ao ativar postes', 'error');
    }
};

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
    document.getElementById('filtro-preco-min').value = '';
    document.getElementById('filtro-preco-max').value = '';
    
    // Resetar filtros
    postesData.filters = {
        status: '',
        codigo: '',
        descricao: '',
        precoMin: '',
        precoMax: ''
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

// Utilitários específicos para postes
const PostesUtils = {
    // Validar dados de poste
    validarPoste(dados) {
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
    },
    
    // Calcular estatísticas de preços
    calcularEstatisticasPrecos(postes) {
        if (!postes || postes.length === 0) {
            return { min: 0, max: 0, media: 0 };
        }
        
        const precos = postes.map(p => p.preco || 0);
        
        return {
            min: Math.min(...precos),
            max: Math.max(...precos),
            media: precos.reduce((sum, p) => sum + p, 0) / precos.length
        };
    },
    
    // Agrupar postes por faixa de preço
    agruparPorFaixaPreco(postes) {
        const faixas = {
            'até R$ 200': [],
            'R$ 200 - R$ 400': [],
            'R$ 400 - R$ 600': [],
            'R$ 600 - R$ 800': [],
            'acima de R$ 800': []
        };
        
        postes.forEach(poste => {
            const preco = poste.preco || 0;
            
            if (preco <= 200) {
                faixas['até R$ 200'].push(poste);
            } else if (preco <= 400) {
                faixas['R$ 200 - R$ 400'].push(poste);
            } else if (preco <= 600) {
                faixas['R$ 400 - R$ 600'].push(poste);
            } else if (preco <= 800) {
                faixas['R$ 600 - R$ 800'].push(poste);
            } else {
                faixas['acima de R$ 800'].push(poste);
            }
        });
        
        return faixas;
    }
};

// Exportar utilitários
window.PostesUtils = PostesUtils;