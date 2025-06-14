// JavaScript da página de Vendas - Versão completa com tipos E, V, L
let vendasData = {
    vendas: [],
    postes: [],
    currentEditId: null,
    filters: {
        tipoVenda: '',
        dataInicio: '',
        dataFim: ''
    }
};

// Função de inicialização da página
window.initVendasPage = async function() {
    console.log('🎯 Inicializando página de Vendas...');
    
    try {
        await loadVendas();
        await loadPostes();
        await loadResumoTipos();
        setupEventListeners();
        setupFilters();
        
        // Definir data atual no campo de data
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        const dataInput = document.getElementById('venda-data');
        if (dataInput) {
            dataInput.value = now.toISOString().slice(0, 16);
        }
        
        console.log('✅ Página de Vendas carregada com sucesso');
    } catch (error) {
        console.error('❌ Erro ao carregar página de Vendas:', error);
        showAlert('Erro ao carregar dados de vendas', 'error');
    }
};

// Configurar event listeners
function setupEventListeners() {
    // Formulário de nova venda
    const vendaForm = document.getElementById('venda-form');
    if (vendaForm) {
        vendaForm.addEventListener('submit', handleVendaSubmit);
        vendaForm.addEventListener('reset', handleFormReset);
    }
    
    // Formulário de edição de venda
    const editVendaForm = document.getElementById('edit-venda-form');
    if (editVendaForm) {
        editVendaForm.addEventListener('submit', handleEditVendaSubmit);
    }
    
    // Select de tipo de venda - mostrar campos condicionais
    const selectTipo = document.getElementById('venda-tipo');
    if (selectTipo) {
        selectTipo.addEventListener('change', handleTipoVendaChange);
    }
    
    // Selects de poste - atualizar preview do preço (apenas para tipo V)
    const selectPosteV = document.getElementById('venda-poste-v');
    const quantidadeV = document.getElementById('venda-quantidade-v');
    if (selectPosteV && quantidadeV) {
        selectPosteV.addEventListener('change', () => updatePreviewValor('v'));
        quantidadeV.addEventListener('input', () => updatePreviewValor('v'));
    }
}

// Configurar filtros
function setupFilters() {
    const filterElements = {
        'filtro-tipo-venda': 'tipoVenda',
        'filtro-data-inicio': 'dataInicio',
        'filtro-data-fim': 'dataFim'
    };
    
    Object.entries(filterElements).forEach(([elementId, filterKey]) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener('input', Utils.debounce(() => {
                vendasData.filters[filterKey] = element.value;
                applyFilters();
            }, 300));
        }
    });
}

// Aplicar filtros
function applyFilters() {
    const { tipoVenda, dataInicio, dataFim } = vendasData.filters;
    
    let filtered = [...vendasData.vendas];
    
    // Filtro por tipo de venda
    if (tipoVenda) {
        filtered = filtered.filter(v => v.tipoVenda === tipoVenda);
    }
    
    // Filtro por data início
    if (dataInicio) {
        const dataInicioObj = new Date(dataInicio);
        filtered = filtered.filter(v => new Date(v.dataVenda) >= dataInicioObj);
    }
    
    // Filtro por data fim
    if (dataFim) {
        const dataFimObj = new Date(dataFim);
        dataFimObj.setHours(23, 59, 59, 999);
        filtered = filtered.filter(v => new Date(v.dataVenda) <= dataFimObj);
    }
    
    displayVendas(filtered);
}

// Carregar vendas
async function loadVendas() {
    try {
        const vendas = await VendaService.getAll();
        vendasData.vendas = vendas;
        displayVendas(vendas);
        console.log('📋 Vendas carregadas:', vendas.length);
    } catch (error) {
        console.error('Erro ao carregar vendas:', error);
        displayVendasError();
    }
}

// Carregar postes para os selects
async function loadPostes() {
    try {
        const postes = await PosteService.getActive();
        vendasData.postes = postes;
        
        // Atualizar selects de postes (V e L)
        const selectsPoste = ['venda-poste-v', 'venda-poste-l'];
        selectsPoste.forEach(selectId => {
            const selectPoste = document.getElementById(selectId);
            if (selectPoste) {
                selectPoste.innerHTML = '<option value="">Selecione um poste</option>';
                postes.forEach(poste => {
                    const option = document.createElement('option');
                    option.value = poste.id;
                    option.textContent = `${poste.codigo} - ${poste.descricao}`;
                    option.dataset.preco = poste.preco;
                    selectPoste.appendChild(option);
                });
            }
        });
        
        console.log('⚡ Postes carregados:', postes.length);
    } catch (error) {
        console.error('Erro ao carregar postes:', error);
    }
}

// Carregar resumo por tipos
async function loadResumoTipos() {
    try {
        const vendas = vendasData.vendas;
        const resumo = {
            E: vendas.filter(v => v.tipoVenda === 'E').length,
            V: vendas.filter(v => v.tipoVenda === 'V').length,
            L: vendas.filter(v => v.tipoVenda === 'L').length,
            total: vendas.length
        };
        
        updateResumoCards(resumo);
        
    } catch (error) {
        console.error('Erro ao calcular resumo:', error);
    }
}

// Atualizar cards de resumo
function updateResumoCards(resumo) {
    const elements = {
        'total-vendas-e': resumo.E.toString(),
        'total-vendas-v': resumo.V.toString(),
        'total-vendas-l': resumo.L.toString(),
        'total-vendas-geral': resumo.total.toString()
    };
    
    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    });
}

// Handler de mudança do tipo de venda
function handleTipoVendaChange(e) {
    const tipoSelecionado = e.target.value;
    
    // Ocultar todos os campos condicionais
    const camposTipos = ['e', 'v', 'l'];
    camposTipos.forEach(tipo => {
        const elemento = document.getElementById(`campos-tipo-${tipo}`);
        if (elemento) {
            elemento.style.display = 'none';
        }
    });
    
    // Mostrar campos apropriados
    if (tipoSelecionado) {
        const campoTipo = document.getElementById(`campos-tipo-${tipoSelecionado.toLowerCase()}`);
        if (campoTipo) {
            campoTipo.style.display = 'block';
        }
    }
    
    // Limpar campos dos outros tipos
    clearFieldsByType(tipoSelecionado);
}

// Limpar campos não relacionados ao tipo selecionado
function clearFieldsByType(tipoSelecionado) {
    const camposLimpar = {
        'E': ['venda-valor-extra'],
        'V': ['venda-poste-v', 'venda-quantidade-v', 'venda-valor-total-v'],
        'L': ['venda-poste-l', 'venda-quantidade-l', 'venda-frete-l']
    };
    
    // Limpar todos os campos exceto do tipo selecionado
    Object.entries(camposLimpar).forEach(([tipo, campos]) => {
        if (tipo !== tipoSelecionado) {
            campos.forEach(campoId => {
                const campo = document.getElementById(campoId);
                if (campo) {
                    if (campo.type === 'number') {
                        campo.value = '';
                    } else if (campo.tagName === 'SELECT') {
                        campo.value = '';
                    } else {
                        campo.value = '';
                    }
                }
            });
        }
    });
    
    // Restaurar valores padrão para alguns campos
    if (tipoSelecionado === 'V') {
        const quantidadeV = document.getElementById('venda-quantidade-v');
        if (quantidadeV && !quantidadeV.value) quantidadeV.value = '1';
    }
    
    if (tipoSelecionado === 'L') {
        const quantidadeL = document.getElementById('venda-quantidade-l');
        const freteL = document.getElementById('venda-frete-l');
        if (quantidadeL && !quantidadeL.value) quantidadeL.value = '1';
        if (freteL && !freteL.value) freteL.value = '0';
    }
}

// Atualizar preview do valor baseado no poste e quantidade (apenas tipo V)
function updatePreviewValor(tipo) {
    if (tipo !== 'v') return;
    
    const selectPoste = document.getElementById('venda-poste-v');
    const quantidade = parseInt(document.getElementById('venda-quantidade-v').value) || 1;
    const valorTotalInput = document.getElementById('venda-valor-total-v');
    
    if (selectPoste && selectPoste.selectedIndex > 0 && valorTotalInput) {
        const selectedOption = selectPoste.options[selectPoste.selectedIndex];
        const precoUnitario = parseFloat(selectedOption.dataset.preco) || 0;
        const valorSugerido = precoUnitario * quantidade;
        
        // Apenas sugerir se o campo estiver vazio
        if (!valorTotalInput.value) {
            valorTotalInput.placeholder = `Sugerido: ${Utils.formatCurrency(valorSugerido)}`;
        }
    }
}

// Handler do formulário de nova venda
async function handleVendaSubmit(e) {
    e.preventDefault();
    
    const tipoVenda = document.getElementById('venda-tipo').value;
    const dataVenda = document.getElementById('venda-data').value;
    const observacoes = document.getElementById('venda-observacoes').value.trim();
    
    // Validação básica
    if (!tipoVenda) {
        showAlert('Selecione o tipo de venda', 'warning');
        return;
    }
    
    if (!dataVenda) {
        showAlert('Data da venda é obrigatória', 'warning');
        return;
    }
    
    try {
        let vendaCreateDTO = {
            dataVenda: dataVenda,
            tipoVenda: tipoVenda,
            observacoes: observacoes
        };
        
        // Configurar campos específicos por tipo
        switch (tipoVenda) {
            case 'E':
                const valorExtra = parseFloat(document.getElementById('venda-valor-extra').value);
                if (!valorExtra || valorExtra <= 0) {
                    showAlert('Valor extra deve ser maior que zero', 'warning');
                    return;
                }
                vendaCreateDTO.valorExtra = valorExtra;
                break;
                
            case 'V':
                const posteIdV = document.getElementById('venda-poste-v').value;
                const quantidadeV = parseInt(document.getElementById('venda-quantidade-v').value);
                const valorTotalV = parseFloat(document.getElementById('venda-valor-total-v').value);
                
                if (!posteIdV) {
                    showAlert('Selecione um poste', 'warning');
                    return;
                }
                if (!quantidadeV || quantidadeV <= 0) {
                    showAlert('Quantidade deve ser maior que zero', 'warning');
                    return;
                }
                if (!valorTotalV || valorTotalV <= 0) {
                    showAlert('Valor de venda deve ser maior que zero', 'warning');
                    return;
                }
                
                vendaCreateDTO.posteId = parseInt(posteIdV);
                vendaCreateDTO.quantidade = quantidadeV;
                vendaCreateDTO.valorVenda = valorTotalV;
                // SEM frete para tipo V
                break;
                
            case 'L':
                const posteIdL = document.getElementById('venda-poste-l').value;
                const quantidadeL = parseInt(document.getElementById('venda-quantidade-l').value);
                const freteL = parseFloat(document.getElementById('venda-frete-l').value) || 0;
                
                if (!posteIdL) {
                    showAlert('Selecione um poste para referência', 'warning');
                    return;
                }
                if (!quantidadeL || quantidadeL <= 0) {
                    showAlert('Quantidade deve ser maior que zero', 'warning');
                    return;
                }
                if (freteL <= 0) {
                    showAlert('Frete deve ser maior que zero', 'warning');
                    return;
                }
                
                vendaCreateDTO.posteId = parseInt(posteIdL);
                vendaCreateDTO.quantidade = quantidadeL;
                vendaCreateDTO.freteEletrons = freteL;
                // SEM valor de venda para tipo L
                break;
                
            default:
                showAlert('Tipo de venda inválido', 'error');
                return;
        }
        
        console.log('📤 Enviando venda:', vendaCreateDTO);
        
        await VendaService.create(vendaCreateDTO);
        showAlert('Venda criada com sucesso!', 'success');
        
        // Resetar formulário
        e.target.reset();
        handleFormReset();
        
        // Recarregar dados
        await loadVendas();
        await loadResumoTipos();
        
    } catch (error) {
        console.error('Erro ao criar venda:', error);
        showAlert('Erro ao criar venda', 'error');
    }
}

// Handler de reset do formulário
function handleFormReset() {
    // Ocultar todos os campos condicionais
    const camposTipos = ['e', 'v', 'l'];
    camposTipos.forEach(tipo => {
        const elemento = document.getElementById(`campos-tipo-${tipo}`);
        if (elemento) {
            elemento.style.display = 'none';
        }
    });
    
    // Limpar placeholders
    const valorTotalV = document.getElementById('venda-valor-total-v');
    if (valorTotalV) {
        valorTotalV.placeholder = '0,00';
    }
    
    // Redefinir data atual
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    const dataInput = document.getElementById('venda-data');
    if (dataInput) {
        dataInput.value = now.toISOString().slice(0, 16);
    }
}

// Exibir vendas na tabela
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
        
        // Determinar informações baseadas no tipo
        let tipoDisplay, posteInfo, freteDisplay, valorDisplay;
        
        switch (venda.tipoVenda) {
            case 'E':
                tipoDisplay = '<span class="status ativo">📈 Extra</span>';
                posteInfo = 'N/A';
                freteDisplay = 'N/A';
                valorDisplay = Utils.formatCurrency(venda.valorExtra || 0);
                break;
            case 'V':
                tipoDisplay = '<span class="status">🛒 Normal</span>';
                posteInfo = venda.itens && venda.itens[0] ? 
                    `${venda.itens[0].codigoPoste} (${venda.itens[0].quantidade}x)` : 'N/A';
                freteDisplay = 'N/A'; // Removido frete do tipo V
                valorDisplay = Utils.formatCurrency(venda.valorTotalInformado || 0);
                break;
            case 'L':
                tipoDisplay = '<span class="status inativo">🏪 Loja</span>';
                posteInfo = venda.itens && venda.itens[0] ? 
                    `${venda.itens[0].codigoPoste} (${venda.itens[0].quantidade}x)` : 'N/A';
                freteDisplay = Utils.formatCurrency(venda.totalFreteEletrons || 0);
                valorDisplay = 'N/A'; // Tipo L não tem valor de venda
                break;
            default:
                tipoDisplay = venda.tipoVenda;
                posteInfo = 'N/A';
                freteDisplay = 'N/A';
                valorDisplay = 'N/A';
        }
        
        row.innerHTML = `
            <td class="date" data-label="Data">${Utils.formatDate(venda.dataVenda)}</td>
            <td data-label="Tipo">${tipoDisplay}</td>
            <td data-label="Poste">${posteInfo}</td>
            <td class="currency" data-label="Frete">${freteDisplay}</td>
            <td class="currency" data-label="Valor">${valorDisplay}</td>
            <td data-label="Observações">${venda.observacoes || '-'}</td>
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
    
    console.log(`📊 Exibindo ${vendas.length} vendas na tabela`);
}

// Exibir erro ao carregar vendas
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

// Função de edição
window.editVenda = async function(id) {
    try {
        console.log(`✏️ Editando venda ID: ${id}`);
        const venda = await VendaService.getById(id);
        
        if (!venda) {
            throw new Error('Venda não encontrada');
        }
        
        // Configurar campos baseados no tipo
        document.getElementById('edit-tipo-venda').value = venda.tipoVenda;
        
        // Mostrar/ocultar campos baseados no tipo
        const freteGroup = document.getElementById('edit-frete-group');
        const valorGroup = document.getElementById('edit-valor-group');
        const extraGroup = document.getElementById('edit-extra-group');
        
        // Ocultar todos primeiro
        if (freteGroup) freteGroup.style.display = 'none';
        if (valorGroup) valorGroup.style.display = 'none';
        if (extraGroup) extraGroup.style.display = 'none';
        
        switch (venda.tipoVenda) {
            case 'E':
                if (extraGroup) extraGroup.style.display = 'block';
                document.getElementById('edit-valor-extra').value = venda.valorExtra || 0;
                break;
            case 'V':
                if (valorGroup) valorGroup.style.display = 'block';
                document.getElementById('edit-valor-total').value = venda.valorTotalInformado || 0;
                break;
            case 'L':
                if (freteGroup) freteGroup.style.display = 'block';
                document.getElementById('edit-frete-eletrons').value = venda.totalFreteEletrons || 0;
                break;
        }
        
        document.getElementById('edit-observacoes').value = venda.observacoes || '';
        
        // Definir ID atual
        vendasData.currentEditId = id;
        
        // Abrir modal
        const modal = document.getElementById('edit-venda-modal');
        if (modal) {
            modal.style.display = 'block';
        }
        
    } catch (error) {
        console.error('Erro ao carregar venda para edição:', error);
        showAlert('Erro ao carregar dados da venda', 'error');
    }
};

// Handler de edição
async function handleEditVendaSubmit(e) {
    e.preventDefault();
    
    const tipoVenda = document.getElementById('edit-tipo-venda').value;
    
    let formData = {
        observacoes: document.getElementById('edit-observacoes').value.trim()
    };
    
    switch (tipoVenda) {
        case 'E':
            formData.valorExtra = parseFloat(document.getElementById('edit-valor-extra').value) || 0;
            formData.totalFreteEletrons = 0;
            formData.valorTotalInformado = 0;
            break;
        case 'V':
            formData.valorTotalInformado = parseFloat(document.getElementById('edit-valor-total').value) || 0;
            formData.totalFreteEletrons = 0;
            formData.valorExtra = 0;
            break;
        case 'L':
            formData.totalFreteEletrons = parseFloat(document.getElementById('edit-frete-eletrons').value) || 0;
            formData.valorTotalInformado = 0;
            formData.valorExtra = 0;
            break;
    }
    
    try {
        console.log('📝 Atualizando venda:', formData);
        
        await VendaService.update(vendasData.currentEditId, formData);
        showAlert('Venda atualizada com sucesso!', 'success');
        
        // Fechar modal
        closeModal('edit-venda-modal');
        
        // Recarregar dados
        await loadVendas();
        await loadResumoTipos();
        
    } catch (error) {
        console.error('Erro ao atualizar venda:', error);
        showAlert('Erro ao atualizar venda', 'error');
    }
}

// Função de exclusão
window.deleteVenda = async function(id) {
    const confirmed = await Utils.confirm(
        'Tem certeza que deseja excluir esta venda?',
        'Confirmar Exclusão'
    );
    
    if (!confirmed) return;
    
    try {
        console.log(`🗑️ Excluindo venda ID: ${id}`);
        
        await VendaService.delete(id);
        showAlert('Venda excluída com sucesso!', 'success');
        
        await loadVendas();
        await loadResumoTipos();
        
    } catch (error) {
        console.error('Erro ao excluir venda:', error);
        showAlert('Erro ao excluir venda', 'error');
    }
};

// Funções auxiliares
window.exportarVendas = function() {
    if (!vendasData.vendas || vendasData.vendas.length === 0) {
        showAlert('Nenhuma venda para exportar', 'warning');
        return;
    }
    
    console.log('📊 Exportando vendas...');
    
    const dadosExportar = vendasData.vendas.map(venda => {
        const base = {
            'ID': venda.id,
            'Data': Utils.formatDate(venda.dataVenda),
            'Tipo': venda.tipoVenda,
            'Observações': venda.observacoes || ''
        };
        
        switch (venda.tipoVenda) {
            case 'E':
                return {
                    ...base,
                    'Valor Extra': venda.valorExtra || 0,
                    'Frete': 'N/A',
                    'Valor Venda': 'N/A',
                    'Poste': 'N/A'
                };
            case 'V':
                return {
                    ...base,
                    'Valor Extra': 'N/A',
                    'Frete': 'N/A',
                    'Valor Venda': venda.valorTotalInformado || 0,
                    'Poste': venda.itens?.[0]?.codigoPoste || 'N/A'
                };
            case 'L':
                return {
                    ...base,
                    'Valor Extra': 'N/A',
                    'Frete': venda.totalFreteEletrons || 0,
                    'Valor Venda': 'N/A',
                    'Poste': venda.itens?.[0]?.codigoPoste || 'N/A'
                };
            default:
                return base;
        }
    });
    
    Utils.exportToCSV(dadosExportar, `vendas_${new Date().toISOString().split('T')[0]}`);
};

window.limparFiltros = function() {
    console.log('🧹 Limpando filtros...');
    
    const filtroTipo = document.getElementById('filtro-tipo-venda');
    const filtroDataInicio = document.getElementById('filtro-data-inicio');
    const filtroDataFim = document.getElementById('filtro-data-fim');
    
    if (filtroTipo) filtroTipo.value = '';
    if (filtroDataInicio) filtroDataInicio.value = '';
    if (filtroDataFim) filtroDataFim.value = '';
    
    vendasData.filters = {
        tipoVenda: '',
        dataInicio: '',
        dataFim: ''
    };
    
    applyFilters();
    showAlert('Filtros limpos', 'success');
};

window.scrollToForm = function() {
    const form = document.getElementById('venda-form');
    if (form) {
        Utils.smoothScrollTo(form);
        const firstInput = form.querySelector('input, select, textarea');
        if (firstInput) {
            firstInput.focus();
        }
    }
};

// Recarregar vendas
window.loadVendas = loadVendas;

// Função de cleanup (se necessária)
window.cleanupVendas = function() {
    console.log('🧹 Limpando dados de vendas...');
    vendasData = {
        vendas: [],
        postes: [],
        currentEditId: null,
        filters: {
            tipoVenda: '',
            dataInicio: '',
            dataFim: ''
        }
    };
};

console.log('✅ vendas.js carregado completamente com tipos E, V, L');