// ================================
// ESTOQUE CONSOLIDADO OTIMIZADO - JEFFERSON
// ================================

let estoqueData = {
    estoqueConsolidado: [],
    todosPostes: [],
    historicoMovimentos: [],
    filters: { 
        status: '', codigo: '',
        historicoDataInicio: '', historicoDataFim: '',
        historicoTipo: '', historicoPoste: ''
    }
};

// ================================
// INICIALIZAÇÃO
// ================================
document.addEventListener('DOMContentLoaded', () => {
    const userType = localStorage.getItem('poste-system-user-type');
    if (userType !== 'jefferson') {
        window.location.href = 'index.html';
        return;
    }

    if (!window.AppUtils) {
        console.error('AppUtils não carregado!');
        return;
    }
    
    initEstoqueConsolidado();
});

async function initEstoqueConsolidado() {
    console.log('🎯 Inicializando Estoque Consolidado...');
    
    try {
        setupEventListeners();
        await loadAllData();
        console.log('✅ Estoque Consolidado carregado');
    } catch (error) {
        console.error('❌ Erro ao carregar:', error);
        window.AppUtils.showAlert('Erro ao carregar dados. Verifique sua conexão.', 'error');
    }
}

// ================================
// EVENT LISTENERS
// ================================
function setupEventListeners() {
    const estoqueForm = document.getElementById('estoque-form');
    if (estoqueForm) {
        estoqueForm.addEventListener('submit', handleEstoqueSubmit);
        estoqueForm.addEventListener('reset', resetForm);
    }

    // Definir data padrão
    const dataInput = document.getElementById('estoque-data');
    if (dataInput) {
        dataInput.value = window.AppUtils.getCurrentDateInput();
    }

    // Filtros de estoque
    const filtrosEstoque = ['filtro-status', 'filtro-codigo'];
    filtrosEstoque.forEach(filtroId => {
        const elemento = document.getElementById(filtroId);
        if (elemento) {
            elemento.addEventListener('change', aplicarFiltros);
            elemento.addEventListener('input', window.AppUtils.debounce(aplicarFiltros, 300));
        }
    });

    // Filtros de histórico
    const filtrosHistorico = ['historico-data-inicio', 'historico-data-fim', 'historico-tipo', 'historico-poste'];
    filtrosHistorico.forEach(filtroId => {
        const elemento = document.getElementById(filtroId);
        if (elemento) {
            elemento.addEventListener('change', aplicarFiltrosHistorico);
        }
    });

    // Datas padrão para histórico (últimos 30 dias)
    const hoje = new Date();
    const trintaDiasAtras = new Date(hoje);
    trintaDiasAtras.setDate(hoje.getDate() - 30);
    
    const historicoInicio = document.getElementById('historico-data-inicio');
    const historicoFim = document.getElementById('historico-data-fim');
    
    if (historicoInicio) historicoInicio.value = window.AppUtils.dateToInputValue(trintaDiasAtras);
    if (historicoFim) historicoFim.value = window.AppUtils.dateToInputValue(hoje);
}

// ================================
// DATA LOADING
// ================================
async function loadAllData() {
    try {
        window.AppUtils.showLoading(true);
        
        console.log('📊 Carregando dados consolidados...');
        
        const [estoqueConsolidado, postesVermelho, postesBranco] = await Promise.all([
            fetchEstoqueConsolidado(),
            fetchPostesCaminhao('vermelho'),
            fetchPostesCaminhao('branco')
        ]);

        estoqueData.estoqueConsolidado = estoqueConsolidado || [];
        estoqueData.todosPostes = unificarPostes(postesVermelho || [], postesBranco || []);
        
        populatePosteSelect();
        populateHistoricoPosteSelect();
        updateResumo();
        aplicarFiltros();
        
        console.log('✅ Dados consolidados carregados');
        
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        throw error;
    } finally {
        window.AppUtils.showLoading(false);
    }
}

async function fetchEstoqueConsolidado() {
    try {
        return await window.AppUtils.apiRequest('/estoque', {
            headers: { 'X-Tenant-ID': 'jefferson' }
        });
    } catch (error) {
        console.error('❌ Erro ao buscar estoque consolidado:', error);
        return [];
    }
}

async function fetchPostesCaminhao(caminhao) {
    try {
        return await window.AppUtils.apiRequest(`/postes?caminhao=${caminhao}`, {
            headers: { 'X-Tenant-ID': caminhao }
        });
    } catch (error) {
        console.error(`Erro ao buscar postes do ${caminhao}:`, error);
        return [];
    }
}

// ================================
// UNIFICAÇÃO DE POSTES
// ================================
function unificarPostes(postesVermelho, postesBranco) {
    console.log('🔄 Unificando postes...');
    
    const postesUnificados = new Map();
    
    // Processar postes vermelho e branco
    [...postesVermelho, ...postesBranco].forEach(poste => {
        const codigoBase = extrairCodigoBase(poste.codigo);
        if (!postesUnificados.has(codigoBase)) {
            postesUnificados.set(codigoBase, {
                ...poste,
                codigoOriginal: poste.codigo,
                origemCaminhao: poste.tenantId || 'vermelho',
                postesRelacionados: [poste]
            });
        } else {
            const existente = postesUnificados.get(codigoBase);
            existente.postesRelacionados.push(poste);
            existente.origemCaminhao = 'ambos';
        }
    });
    
    const resultado = Array.from(postesUnificados.values());
    console.log(`✅ Unificados ${resultado.length} tipos únicos`);
    
    return resultado;
}

function extrairCodigoBase(codigo) {
    return codigo ? codigo.replace(/-[BC]$/, '').trim() : '';
}

// ================================
// POPULAÇÃO DE SELECTS
// ================================
function populatePosteSelect() {
    const posteSelect = document.getElementById('estoque-poste');
    if (!posteSelect) return;
    
    posteSelect.innerHTML = '<option value="">Selecione um poste</option>';
    
    estoqueData.todosPostes
        .sort((a, b) => a.codigo.localeCompare(b.codigo))
        .forEach(poste => {
            const option = document.createElement('option');
            option.value = poste.id;
            
            let origemInfo = '';
            if (poste.postesRelacionados?.length > 1) {
                origemInfo = ' [🚛🚚 Ambos]';
            } else if (poste.origemCaminhao === 'vermelho') {
                origemInfo = ' [🚛 Vermelho]';
            } else if (poste.origemCaminhao === 'branco') {
                origemInfo = ' [🚚 Branco]';
            }
            
            option.textContent = `${poste.codigo} - ${poste.descricao} (${window.AppUtils.formatCurrency(poste.preco)})${origemInfo}`;
            posteSelect.appendChild(option);
        });
    
    console.log(`📋 Select populado com ${estoqueData.todosPostes.length} postes`);
}

function populateHistoricoPosteSelect() {
    const posteSelect = document.getElementById('historico-poste');
    if (!posteSelect) return;
    
    posteSelect.innerHTML = '<option value="">Todos os postes</option>';
    
    estoqueData.todosPostes
        .sort((a, b) => a.codigo.localeCompare(b.codigo))
        .forEach(poste => {
            const option = document.createElement('option');
            option.value = poste.id;
            option.textContent = `${poste.codigo} - ${poste.descricao}`;
            posteSelect.appendChild(option);
        });
}

// ================================
// FORM SUBMISSION
// ================================
async function handleEstoqueSubmit(e) {
    e.preventDefault();
    
    try {
        const formData = buildFormData();
        
        if (!validateFormData(formData)) return;
        
        window.AppUtils.showLoading(true);
        
        const posteSelecionado = encontrarPostePorId(formData.posteId);
        if (!posteSelecionado) throw new Error('Poste não encontrado');
        
        const caminhaoEscolhido = escolherCaminhaoParaEstoque(posteSelecionado);
        
        const response = await fetch('https://posteback.onrender.com/api/estoque/adicionar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Tenant-ID': caminhaoEscolhido
            },
            body: JSON.stringify({
                posteId: formData.posteId,
                quantidade: formData.quantidade,
                dataEstoque: formData.dataEstoque,
                observacao: formData.observacao
            })
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const dataFormatada = window.AppUtils.formatDateBRFixed(formData.dataEstoque);
        window.AppUtils.showAlert(
            `Estoque de ${formData.quantidade} unidades adicionado em ${dataFormatada}!`, 
            'success'
        );
        
        resetForm();
        await loadAllData();
        
        // Atualizar histórico se visível
        if (document.getElementById('historico-section').style.display !== 'none') {
            await carregarHistoricoMovimentos();
        }
        
    } catch (error) {
        console.error('Erro ao adicionar estoque:', error);
        window.AppUtils.showAlert('Erro ao adicionar estoque: ' + error.message, 'error');
    } finally {
        window.AppUtils.showLoading(false);
    }
}

function buildFormData() {
    return {
        dataEstoque: document.getElementById('estoque-data').value,
        posteId: parseInt(document.getElementById('estoque-poste').value),
        quantidade: parseInt(document.getElementById('estoque-quantidade').value),
        observacao: document.getElementById('estoque-observacao').value.trim() || null
    };
}

function validateFormData(data) {
    return window.AppUtils.validateDate(data.dataEstoque, 'Data do estoque') &&
           window.AppUtils.validateRequired(data.posteId, 'Poste') &&
           window.AppUtils.validateNumber(data.quantidade, 'Quantidade', 0);
}

function encontrarPostePorId(posteId) {
    for (const poste of estoqueData.todosPostes) {
        if (poste.id === posteId) return poste;
        if (poste.postesRelacionados) {
            for (const relacionado of poste.postesRelacionados) {
                if (relacionado.id === posteId) return relacionado;
            }
        }
    }
    return null;
}

function escolherCaminhaoParaEstoque(poste) {
    return ['vermelho', 'branco'].includes(poste.origemCaminhao) ? poste.origemCaminhao : 'vermelho';
}

function resetForm() {
    document.getElementById('estoque-form').reset();
    const dataInput = document.getElementById('estoque-data');
    if (dataInput) dataInput.value = window.AppUtils.getCurrentDateInput();
}

// ================================
// RESUMO E DISPLAY
// ================================
function updateResumo() {
    const total = estoqueData.estoqueConsolidado.length;
    const positivo = estoqueData.estoqueConsolidado.filter(item => item.quantidadeAtual > 5).length;
    const baixo = estoqueData.estoqueConsolidado.filter(item => item.quantidadeAtual > 0 && item.quantidadeAtual <= 5).length;
    const zero = estoqueData.estoqueConsolidado.filter(item => item.quantidadeAtual === 0).length;
    const negativo = estoqueData.estoqueConsolidado.filter(item => item.quantidadeAtual < 0).length;
    
    window.AppUtils.updateElement('total-tipos', total);
    window.AppUtils.updateElement('estoque-positivo', positivo);
    window.AppUtils.updateElement('estoque-baixo', baixo);
    window.AppUtils.updateElement('estoque-negativo', negativo);
    window.AppUtils.updateElement('estoque-zero', zero);
}

function aplicarFiltros() {
    const status = document.getElementById('filtro-status').value;
    const codigo = document.getElementById('filtro-codigo').value.toLowerCase();

    let filtrados = [...estoqueData.estoqueConsolidado];

    if (status) {
        filtrados = filtrados.filter(item => {
            const qtd = item.quantidadeAtual;
            switch (status) {
                case 'positivo': return qtd > 5;
                case 'baixo': return qtd > 0 && qtd <= 5;
                case 'zero': return qtd === 0;
                case 'negativo': return qtd < 0;
                default: return true;
            }
        });
    }

    if (codigo) {
        filtrados = filtrados.filter(item => 
            item.codigoPoste.toLowerCase().includes(codigo) ||
            item.descricaoPoste.toLowerCase().includes(codigo)
        );
    }

    displayEstoque(filtrados);
}

function displayEstoque(estoque) {
    const container = document.getElementById('estoque-list');
    if (!container) return;
    
    if (!estoque || estoque.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📦</div>
                <h3>Nenhum item encontrado</h3>
                <p>Ajuste os filtros para ver mais itens.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    estoque.forEach(item => {
        container.appendChild(createEstoqueItem(item));
    });
}

function createEstoqueItem(item) {
    const element = document.createElement('div');
    const statusClass = getStatusClass(item.quantidadeAtual);
    
    element.className = `mobile-list-item ${statusClass}`;
    
    element.innerHTML = `
        <div class="item-header">
            <span class="item-status ${statusClass}">${getStatusText(item.quantidadeAtual)}</span>
            <span class="item-code">${item.codigoPoste}</span>
        </div>
        <div class="item-content">
            <div class="item-quantidade ${statusClass}">${item.quantidadeAtual}</div>
            <div class="item-title">${item.descricaoPoste}</div>
            <div class="item-details">
                <small style="color: var(--text-secondary);">🚛🚚 Estoque Unificado</small>
            </div>
            <div class="item-details">Preço: ${window.AppUtils.formatCurrency(item.precoPoste || 0)}</div>
            ${item.dataAtualizacao ? `<div class="item-details"><small>Atualizado: ${window.AppUtils.formatDateBR(item.dataAtualizacao, true)}</small></div>` : ''}
        </div>
        <div class="item-actions">
            <button class="btn btn-small btn-danger" onclick="removerEstoqueRapido(${item.posteId}, '${item.codigoPoste}', ${item.quantidadeAtual})" ${item.quantidadeAtual <= 0 ? 'disabled' : ''}>
                ➖ Remover
            </button>
            <button class="btn btn-small" onclick="adicionarEstoqueRapido(${item.posteId}, '${item.codigoPoste}')">
                ➕ Adicionar
            </button>
        </div>
    `;
    
    return element;
}

function getStatusClass(quantidade) {
    if (quantidade > 5) return 'positivo';
    if (quantidade > 0) return 'baixo';
    if (quantidade === 0) return 'zero';
    return 'negativo';
}

function getStatusText(quantidade) {
    if (quantidade > 5) return '✅ Disponível';
    if (quantidade > 0) return '⚠️ Baixo';
    if (quantidade === 0) return '📦 Esgotado';
    return '🔻 Negativo';
}

// ================================
// HISTÓRICO DE MOVIMENTOS
// ================================
async function carregarHistoricoMovimentos() {
    try {
        window.AppUtils.showLoading(true);
        
        const dataInicio = document.getElementById('historico-data-inicio').value;
        const dataFim = document.getElementById('historico-data-fim').value;
        const tipo = document.getElementById('historico-tipo').value;
        const posteId = document.getElementById('historico-poste').value;
        
        let url = 'https://posteback.onrender.com/api/movimento-estoque/consolidado?limite=200';
        
        if (dataInicio) url += `&dataInicio=${dataInicio}`;
        if (dataFim) url += `&dataFim=${dataFim}`;
        
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                'X-Tenant-ID': 'jefferson'
            }
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        let movimentos = await response.json();
        
        if (tipo) movimentos = movimentos.filter(m => m.tipoMovimento === tipo);
        if (posteId) movimentos = movimentos.filter(m => m.posteId == posteId);
        
        estoqueData.historicoMovimentos = movimentos;
        displayHistorico(movimentos);
        
        console.log(`📋 Histórico carregado: ${movimentos.length} movimentos`);
        
    } catch (error) {
        console.error('❌ Erro ao carregar histórico:', error);
        window.AppUtils.showAlert('Erro ao carregar histórico', 'error');
    } finally {
        window.AppUtils.showLoading(false);
    }
}

function displayHistorico(movimentos) {
    const container = document.getElementById('historico-list');
    if (!container) return;
    
    if (!movimentos || movimentos.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📋</div>
                <h3>Nenhum movimento encontrado</h3>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    movimentos.forEach(movimento => {
        container.appendChild(createMovimentoItem(movimento));
    });
}

function createMovimentoItem(movimento) {
    const element = document.createElement('div');
    const tipoClass = getTipoMovimentoClass(movimento.tipoMovimento);
    
    element.className = `mobile-list-item ${tipoClass}`;
    
    const iconeMovimento = getTipoMovimentoIcon(movimento.tipoMovimento);
    const dataFormatada = window.AppUtils.formatDateBRFixed(movimento.dataMovimento);
    
    element.innerHTML = `
        <div class="item-header">
            <span class="item-type ${tipoClass}">
                ${iconeMovimento} ${movimento.tipoMovimentoDescricao}
            </span>
            <span class="item-date">${dataFormatada}</span>
        </div>
        <div class="item-content">
            <div class="item-title">
                <strong>${movimento.codigoPoste}</strong> - ${movimento.descricaoPoste}
            </div>
            <div class="item-details">
                <div class="item-detail">
                    <span>Quantidade: ${movimento.quantidade} unidades</span>
                </div>
                <div class="item-detail">
                    <span>Caminhão: ${getTenantLabel(movimento.tenantId)}</span>
                </div>
            </div>
            ${movimento.observacao ? `
                <div class="item-details" style="margin-top: 10px; padding: 8px; background: var(--bg-primary); border-radius: 4px;">
                    <strong>📝 Observação:</strong><br>
                    <span style="color: var(--text-secondary);">${movimento.observacao}</span>
                </div>
            ` : ''}
        </div>
    `;
    
    return element;
}

function getTipoMovimentoClass(tipo) {
    const classes = {
        'ENTRADA': 'entrada',
        'SAIDA': 'saida', 
        'VENDA': 'venda',
        'AJUSTE': 'ajuste',
        'TRANSFERENCIA': 'transferencia'
    };
    return classes[tipo] || '';
}

function getTipoMovimentoIcon(tipo) {
    const icons = {
        'ENTRADA': '📥',
        'SAIDA': '📤',
        'VENDA': '🛒',
        'AJUSTE': '⚙️',
        'TRANSFERENCIA': '🔄'
    };
    return icons[tipo] || '📋';
}

function getTenantLabel(tenantId) {
    const labels = {
        'vermelho': '🚛 Vermelho',
        'branco': '🚚 Branco',
        'jefferson': '👨‍💼 Jefferson'
    };
    return labels[tenantId] || tenantId;
}

// ================================
// AÇÕES RÁPIDAS
// ================================
function adicionarEstoqueRapido(posteId, codigoPoste) {
    const quantidade = prompt(`Quantidade a adicionar ao poste ${codigoPoste}:`, '1');
    
    if (quantidade === null || quantidade.trim() === '') return;
    
    const qtd = parseInt(quantidade);
    if (isNaN(qtd) || qtd <= 0) {
        window.AppUtils.showAlert('Quantidade deve ser um número positivo', 'warning');
        return;
    }
    
    // Preencher formulário
    document.getElementById('estoque-poste').value = posteId;
    document.getElementById('estoque-quantidade').value = qtd;
    document.getElementById('estoque-observacao').value = `Adição rápida via interface`;
    
    // Scroll para o formulário
    window.AppUtils.scrollToElement('estoque-form', 80);
    
    window.AppUtils.showAlert(`Formulário preenchido para ${codigoPoste}. Clique em "Adicionar" para confirmar.`, 'info');
}

async function removerEstoqueRapido(posteId, codigoPoste, quantidadeAtual) {
    if (quantidadeAtual <= 0) {
        window.AppUtils.showAlert(`Poste ${codigoPoste} não possui estoque para remover`, 'warning');
        return;
    }
    
    const quantidade = prompt(
        `Quantidade a remover do poste ${codigoPoste}:\n(Estoque atual: ${quantidadeAtual} unidades)`, 
        '1'
    );
    
    if (quantidade === null || quantidade.trim() === '') return;
    
    const qtd = parseInt(quantidade);
    if (isNaN(qtd) || qtd <= 0) {
        window.AppUtils.showAlert('Quantidade deve ser um número positivo', 'warning');
        return;
    }
    
    if (qtd > quantidadeAtual) {
        const confirmar = confirm(
            `⚠️ ATENÇÃO: Você está tentando remover ${qtd} unidades, mas o estoque atual é de apenas ${quantidadeAtual} unidades.\n\n` +
            `Isso criará um estoque NEGATIVO de ${qtd - quantidadeAtual} unidades.\n\n` +
            `Deseja continuar mesmo assim?`
        );
        
        if (!confirmar) return;
    }
    
    const motivo = prompt(
        `Motivo da remoção de ${qtd} unidades do poste ${codigoPoste}:`,
        'Remoção rápida via interface'
    );
    
    if (motivo === null) return;
    
    try {
        window.AppUtils.showLoading(true);
        
        const posteSelecionado = encontrarPostePorId(posteId);
        if (!posteSelecionado) throw new Error('Poste não encontrado');
        
        const caminhaoEscolhido = escolherCaminhaoParaEstoque(posteSelecionado);
        
        const response = await fetch('https://posteback.onrender.com/api/estoque/remover', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Tenant-ID': caminhaoEscolhido
            },
            body: JSON.stringify({
                posteId: posteId,
                quantidade: qtd,
                dataEstoque: new Date().toISOString().split('T')[0],
                observacao: motivo.trim() || 'Remoção rápida via interface'
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const novaQuantidade = quantidadeAtual - qtd;
        const statusMsg = novaQuantidade < 0 ? 
            `(estoque ficou negativo: ${novaQuantidade})` : 
            `(estoque atual: ${novaQuantidade})`;
        
        window.AppUtils.showAlert(
            `${qtd} unidades removidas do poste ${codigoPoste} ${statusMsg}`, 
            novaQuantidade < 0 ? 'warning' : 'success'
        );
        
        await loadAllData();
        
        if (document.getElementById('historico-section').style.display !== 'none') {
            await carregarHistoricoMovimentos();
        }
        
    } catch (error) {
        console.error('Erro ao remover estoque:', error);
        window.AppUtils.showAlert('Erro ao remover estoque: ' + error.message, 'error');
    } finally {
        window.AppUtils.showLoading(false);
    }
}

// ================================
// FILTROS E NAVEGAÇÃO
// ================================
function aplicarFiltrosHistorico() {
    carregarHistoricoMovimentos();
}

function limparFiltros() {
    document.getElementById('filtro-status').value = '';
    document.getElementById('filtro-codigo').value = '';
    aplicarFiltros();
    window.AppUtils.showAlert('Filtros de estoque limpos', 'success');
}

function limparFiltrosHistorico() {
    const hoje = new Date();
    const trintaDiasAtras = new Date(hoje);
    trintaDiasAtras.setDate(hoje.getDate() - 30);
    
    document.getElementById('historico-data-inicio').value = window.AppUtils.dateToInputValue(trintaDiasAtras);
    document.getElementById('historico-data-fim').value = window.AppUtils.dateToInputValue(hoje);
    document.getElementById('historico-tipo').value = '';
    document.getElementById('historico-poste').value = '';
    
    carregarHistoricoMovimentos();
    window.AppUtils.showAlert('Filtros de histórico limpos', 'success');
}

function toggleHistoricoGeral() {
    const historicoSection = document.getElementById('historico-section');
    const isVisible = historicoSection.style.display !== 'none';
    
    if (isVisible) {
        historicoSection.style.display = 'none';
        window.AppUtils.showAlert('Histórico ocultado', 'info');
    } else {
        historicoSection.style.display = 'block';
        carregarHistoricoMovimentos();
        window.AppUtils.scrollToElement('historico-section', 80);
        window.AppUtils.showAlert('Histórico exibido', 'success');
    }
}

// ================================
// EXPORT E ATUALIZAÇÃO
// ================================
async function atualizarEstoque() {
    try {
        await loadAllData();
        window.AppUtils.showAlert('Estoque atualizado com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao atualizar estoque:', error);
        window.AppUtils.showAlert('Erro ao atualizar. Verifique sua conexão.', 'error');
    }
}

async function atualizarHistorico() {
    try {
        await carregarHistoricoMovimentos();
        window.AppUtils.showAlert('Histórico atualizado com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao atualizar histórico:', error);
        window.AppUtils.showAlert('Erro ao atualizar histórico.', 'error');
    }
}

function exportarEstoque() {
    if (!estoqueData.estoqueConsolidado || estoqueData.estoqueConsolidado.length === 0) {
        window.AppUtils.showAlert('Nenhum estoque para exportar', 'warning');
        return;
    }
    
    const dadosExportar = estoqueData.estoqueConsolidado.map(item => ({
        'Código': item.codigoPoste,
        'Descrição': item.descricaoPoste,
        'Preço': item.precoPoste || 0,
        'Quantidade': item.quantidadeAtual,
        'Status': getStatusText(item.quantidadeAtual),
        'Valor Total': (item.quantidadeAtual * (item.precoPoste || 0)).toFixed(2),
        'Última Atualização': item.dataAtualizacao ? window.AppUtils.formatDateBR(item.dataAtualizacao, true) : '-'
    }));
    
    window.AppUtils.exportToCSV(dadosExportar, `estoque_unificado_${new Date().toISOString().split('T')[0]}`);
}

function exportarHistorico() {
    if (!estoqueData.historicoMovimentos || estoqueData.historicoMovimentos.length === 0) {
        window.AppUtils.showAlert('Nenhum histórico para exportar', 'warning');
        return;
    }
    
    const dadosExportar = estoqueData.historicoMovimentos.map(movimento => ({
        'ID': movimento.id,
        'Data Movimento': window.AppUtils.formatDateBRFixed(movimento.dataMovimento),
        'Código Poste': movimento.codigoPoste,
        'Descrição': movimento.descricaoPoste,
        'Tipo': movimento.tipoMovimentoDescricao,
        'Quantidade': movimento.quantidade,
        'Caminhão': getTenantLabel(movimento.tenantId),
        'Observação': movimento.observacao || '-'
    }));
    
    window.AppUtils.exportToCSV(dadosExportar, `historico_movimentos_${new Date().toISOString().split('T')[0]}`);
}

// ================================
// GLOBAL FUNCTIONS
// ================================
window.aplicarFiltros = aplicarFiltros;
window.limparFiltros = limparFiltros;
window.aplicarFiltrosHistorico = aplicarFiltrosHistorico;
window.limparFiltrosHistorico = limparFiltrosHistorico;
window.atualizarEstoque = atualizarEstoque;
window.atualizarHistorico = atualizarHistorico;
window.exportarEstoque = exportarEstoque;
window.exportarHistorico = exportarHistorico;
window.toggleHistoricoGeral = toggleHistoricoGeral;
window.adicionarEstoqueRapido = adicionarEstoqueRapido;
window.removerEstoqueRapido = removerEstoqueRapido;

console.log('✅ Estoque Consolidado otimizado carregado');