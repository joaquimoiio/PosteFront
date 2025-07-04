// ================================
// ESTOQUE CONSOLIDADO COMPLETO - JEFFERSON
// Sistema Unificado com Histórico de Movimentos
// ================================

// Estado global da aplicação
let estoqueData = {
    estoqueConsolidado: [],
    todosPostes: [],
    historicoMovimentos: [],
    estatisticasMovimento: {},
    filters: { 
        status: '', 
        codigo: '',
        historicoDataInicio: '',
        historicoDataFim: '',
        historicoTipo: '',
        historicoPoste: ''
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
        console.error('AppUtils não carregado! Verifique se utils.js foi incluído.');
        return;
    }
    
    initEstoqueConsolidado();
});

async function initEstoqueConsolidado() {
    console.log('🎯 Inicializando Estoque Consolidado Unificado...');
    
    try {
        setupEventListeners();
        await loadAllData();
        console.log('✅ Estoque Consolidado Unificado carregado');
    } catch (error) {
        console.error('❌ Erro ao carregar:', error);
        window.AppUtils.showAlert('Erro ao carregar dados. Verifique sua conexão.', 'error');
    }
}

// ================================
// EVENT LISTENERS
// ================================

function setupEventListeners() {
    // Form principal
    const estoqueForm = document.getElementById('estoque-form');
    if (estoqueForm) {
        estoqueForm.addEventListener('submit', handleEstoqueSubmit);
        estoqueForm.addEventListener('reset', resetForm);
    }

    // Definir data padrão como hoje
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

    // Definir datas padrão para histórico (últimos 30 dias)
    const hoje = new Date();
    const trintaDiasAtras = new Date(hoje);
    trintaDiasAtras.setDate(hoje.getDate() - 30);
    
    const historicoInicio = document.getElementById('historico-data-inicio');
    const historicoFim = document.getElementById('historico-data-fim');
    
    if (historicoInicio) {
        historicoInicio.value = window.AppUtils.dateToInputValue(trintaDiasAtras);
    }
    if (historicoFim) {
        historicoFim.value = window.AppUtils.dateToInputValue(hoje);
    }
}

// ================================
// CARREGAMENTO DE DADOS
// ================================

async function loadAllData() {
    try {
        window.AppUtils.showLoading(true);
        
        console.log('📊 Carregando dados consolidados unificados...');
        
        // Carregar estoque consolidado e TODOS os postes
        const [estoqueConsolidado, postesVermelho, postesBranco] = await Promise.all([
            fetchEstoqueConsolidado(),
            fetchPostesCaminhao('vermelho'),
            fetchPostesCaminhao('branco')
        ]);

        estoqueData.estoqueConsolidado = estoqueConsolidado || [];
        
        // Unificar todos os postes em uma única lista
        estoqueData.todosPostes = unificarPostes(postesVermelho || [], postesBranco || []);
        
        populatePosteSelect();
        populateHistoricoPosteSelect();
        updateResumo();
        aplicarFiltros();
        
        console.log('✅ Dados consolidados unificados carregados');
        
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        throw error;
    } finally {
        window.AppUtils.showLoading(false);
    }
}

async function fetchEstoqueConsolidado() {
    try {
        console.log('📦 Buscando estoque consolidado completo...');
        
        const response = await fetch(`https://posteback.onrender.com/api/estoque`, {
            headers: {
                'Content-Type': 'application/json',
                'X-Tenant-ID': 'jefferson'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const estoque = await response.json();
        console.log(`✅ Estoque consolidado carregado: ${estoque.length} itens`);
        
        return estoque;
    } catch (error) {
        console.error('❌ Erro ao buscar estoque consolidado:', error);
        return [];
    }
}

async function fetchPostesCaminhao(caminhao) {
    try {
        const response = await fetch(`https://posteback.onrender.com/api/postes?caminhao=${caminhao}`, {
            headers: {
                'Content-Type': 'application/json',
                'X-Tenant-ID': caminhao
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const postes = await response.json();
        return (postes || []).filter(p => p.ativo);
    } catch (error) {
        console.error(`Erro ao buscar postes do ${caminhao}:`, error);
        return [];
    }
}

// ================================
// UNIFICAÇÃO DE POSTES
// ================================

function unificarPostes(postesVermelho, postesBranco) {
    console.log('🔄 Unificando postes de ambos os caminhões...');
    
    const postesUnificados = new Map();
    
    // Adicionar postes vermelho
    postesVermelho.forEach(poste => {
        const codigoBase = extrairCodigoBase(poste.codigo);
        if (!postesUnificados.has(codigoBase)) {
            postesUnificados.set(codigoBase, {
                ...poste,
                codigoOriginal: poste.codigo,
                origemCaminhao: 'vermelho',
                postesRelacionados: [poste]
            });
        } else {
            postesUnificados.get(codigoBase).postesRelacionados.push(poste);
        }
    });
    
    // Adicionar postes branco
    postesBranco.forEach(poste => {
        const codigoBase = extrairCodigoBase(poste.codigo);
        if (!postesUnificados.has(codigoBase)) {
            postesUnificados.set(codigoBase, {
                ...poste,
                codigoOriginal: poste.codigo,
                origemCaminhao: 'branco',
                postesRelacionados: [poste]
            });
        } else {
            const existente = postesUnificados.get(codigoBase);
            existente.postesRelacionados.push(poste);
            existente.origemCaminhao = 'ambos';
        }
    });
    
    const resultado = Array.from(postesUnificados.values());
    console.log(`✅ Unificados ${resultado.length} tipos de postes únicos`);
    
    return resultado;
}

function extrairCodigoBase(codigo) {
    if (!codigo) return '';
    return codigo.replace(/-[BC]$/, '').trim();
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
            if (poste.postesRelacionados && poste.postesRelacionados.length > 1) {
                origemInfo = ' [🚛🚚 Ambos]';
            } else if (poste.origemCaminhao === 'vermelho') {
                origemInfo = ' [🚛 Vermelho]';
            } else if (poste.origemCaminhao === 'branco') {
                origemInfo = ' [🚚 Branco]';
            }
            
            option.textContent = `${poste.codigo} - ${poste.descricao} (${window.AppUtils.formatCurrency(poste.preco)})${origemInfo}`;
            posteSelect.appendChild(option);
        });
    
    console.log(`📋 Select populado com ${estoqueData.todosPostes.length} postes unificados`);
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
// FORMULÁRIO DE ADIÇÃO
// ================================

async function handleEstoqueSubmit(e) {
    e.preventDefault();
    
    try {
        const formData = buildFormData();
        
        if (!validateFormData(formData)) {
            return;
        }
        
        window.AppUtils.showLoading(true);
        
        const posteSelecionado = encontrarPostePorId(formData.posteId);
        if (!posteSelecionado) {
            throw new Error('Poste não encontrado');
        }
        
        const caminhaoEscolhido = escolherCaminhaoParaEstoque(posteSelecionado);
        
        console.log(`📦 Adicionando estoque via caminhão ${caminhaoEscolhido} para poste ${posteSelecionado.codigo}`);
        
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
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const dataFormatada = window.AppUtils.formatDateBRFixed(formData.dataEstoque);
        window.AppUtils.showAlert(
            `Estoque de ${formData.quantidade} unidades adicionado com sucesso em ${dataFormatada}!`, 
            'success'
        );
        
        resetForm();
        await loadAllData();
        
        // Se o histórico estiver visível, atualizar também
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
    if (!window.AppUtils.validateDate(data.dataEstoque, 'Data do estoque')) {
        return false;
    }
    
    if (!window.AppUtils.validateRequired(data.posteId, 'Poste')) {
        return false;
    }
    
    return window.AppUtils.validateNumber(data.quantidade, 'Quantidade', 0);
}

function encontrarPostePorId(posteId) {
    for (const poste of estoqueData.todosPostes) {
        if (poste.id === posteId) {
            return poste;
        }
        if (poste.postesRelacionados) {
            for (const relacionado of poste.postesRelacionados) {
                if (relacionado.id === posteId) {
                    return relacionado;
                }
            }
        }
    }
    return null;
}

function escolherCaminhaoParaEstoque(poste) {
    if (poste.origemCaminhao === 'vermelho' || poste.origemCaminhao === 'branco') {
        return poste.origemCaminhao;
    }
    
    return 'vermelho'; // Padrão
}

function resetForm() {
    document.getElementById('estoque-form').reset();
    
    const dataInput = document.getElementById('estoque-data');
    if (dataInput) {
        dataInput.value = window.AppUtils.getCurrentDateInput();
    }
}

// ================================
// RESUMO E ESTATÍSTICAS
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

// ================================
// FILTROS DE ESTOQUE
// ================================

function aplicarFiltros() {
    const status = document.getElementById('filtro-status').value;
    const codigo = document.getElementById('filtro-codigo').value.toLowerCase();

    let filtrados = [...estoqueData.estoqueConsolidado];

    // Filtrar por status
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

    // Filtrar por código
    if (codigo) {
        filtrados = filtrados.filter(item => 
            item.codigoPoste.toLowerCase().includes(codigo) ||
            item.descricaoPoste.toLowerCase().includes(codigo)
        );
    }

    displayEstoque(filtrados);
}

function limparFiltros() {
    document.getElementById('filtro-status').value = '';
    document.getElementById('filtro-codigo').value = '';
    aplicarFiltros();
    window.AppUtils.showAlert('Filtros de estoque limpos', 'success');
}

// ================================
// DISPLAY DE ESTOQUE
// ================================

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
        const element = createEstoqueItem(item);
        container.appendChild(element);
    });
}

function createEstoqueItem(item) {
    const element = document.createElement('div');
    const statusClass = getStatusClass(item.quantidadeAtual);
    
    element.className = `mobile-list-item ${statusClass}`;
    
    element.innerHTML = `
        <div class="item-header">
            <span class="item-status ${statusClass}">
                ${getStatusText(item.quantidadeAtual)}
            </span>
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
                ➖ Remover Rápido
            </button>
            <button class="btn btn-small" onclick="adicionarEstoqueRapido(${item.posteId}, '${item.codigoPoste}')">
                ➕ Add Rápido
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
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        let movimentos = await response.json();
        
        // Filtrar por tipo se especificado
        if (tipo) {
            movimentos = movimentos.filter(m => m.tipoMovimento === tipo);
        }
        
        // Filtrar por poste se especificado
        if (posteId) {
            movimentos = movimentos.filter(m => m.posteId == posteId);
        }
        
        estoqueData.historicoMovimentos = movimentos;
        displayHistorico(movimentos);
        
        console.log(`📋 Histórico carregado: ${movimentos.length} movimentos`);
        
    } catch (error) {
        console.error('❌ Erro ao carregar histórico:', error);
        window.AppUtils.showAlert('Erro ao carregar histórico de movimentos', 'error');
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
                <p>Ajuste os filtros para ver mais movimentos.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    movimentos.forEach(movimento => {
        const element = createMovimentoItem(movimento);
        container.appendChild(element);
    });
}

function createMovimentoItem(movimento) {
    const element = document.createElement('div');
    const tipoClass = getTipoMovimentoClass(movimento.tipoMovimento);
    
    element.className = `mobile-list-item ${tipoClass}`;
    
    const iconeMovimento = getTipoMovimentoIcon(movimento.tipoMovimento);
    const dataFormatada = window.AppUtils.formatDateBRFixed(movimento.dataMovimento);
    const dataRegistroFormatada = window.AppUtils.formatDateBR(movimento.dataRegistro, true);
    
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
                    <span class="item-detail-label">Quantidade</span>
                    <span class="item-detail-value">${movimento.quantidade} unidades</span>
                </div>
                <div class="item-detail">
                    <span class="item-detail-label">Valor Unit.</span>
                    <span class="item-detail-value currency">${window.AppUtils.formatCurrency(movimento.precoPoste || 0)}</span>
                </div>
                <div class="item-detail">
                    <span class="item-detail-label">Valor Total</span>
                    <span class="item-detail-value currency">${window.AppUtils.formatCurrency(movimento.valorMovimento || 0)}</span>
                </div>
                <div class="item-detail">
                    <span class="item-detail-label">Caminhão</span>
                    <span class="item-detail-value">${getTenantLabel(movimento.tenantId)}</span>
                </div>
            </div>
            
            ${movimento.quantidadeAnterior !== null && movimento.quantidadeAtual !== null ? `
                <div class="item-details" style="margin-top: 10px;">
                    <small style="color: var(--text-secondary);">
                        Estoque: ${movimento.quantidadeAnterior} → ${movimento.quantidadeAtual}
                        (${movimento.quantidadeAtual - movimento.quantidadeAnterior > 0 ? '+' : ''}${movimento.quantidadeAtual - movimento.quantidadeAnterior})
                    </small>
                </div>
            ` : ''}
            
            ${movimento.observacao ? `
                <div class="item-details" style="margin-top: 10px; padding: 8px; background: var(--bg-primary); border-radius: 4px;">
                    <strong>📝 Observação:</strong><br>
                    <span style="color: var(--text-secondary);">${movimento.observacao}</span>
                </div>
            ` : ''}
            
            <div class="item-details" style="margin-top: 8px;">
                <small style="color: var(--text-muted);">
                    Registrado em: ${dataRegistroFormatada}
                </small>
            </div>
        </div>
        
        <div class="item-actions">
            <button class="btn btn-small" onclick="verDetalhesMovimento(${movimento.id})">
                🔍 Detalhes
            </button>
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
// FILTROS DE HISTÓRICO
// ================================

function aplicarFiltrosHistorico() {
    carregarHistoricoMovimentos();
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

// ================================
// AÇÕES RÁPIDAS
// ================================

function adicionarEstoqueRapido(posteId, codigoPoste) {
    const quantidade = prompt(`Quantidade a adicionar ao poste ${codigoPoste}:`, '1');
    
    if (quantidade === null || quantidade.trim() === '') {
        return;
    }
    
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
    // Verificar se há estoque para remover
    if (quantidadeAtual <= 0) {
        window.AppUtils.showAlert(`Poste ${codigoPoste} não possui estoque para remover`, 'warning');
        return;
    }
    
    const quantidadeMaxima = Math.min(quantidadeAtual, 50); // Limite de segurança
    const quantidade = prompt(
        `Quantidade a remover do poste ${codigoPoste}:\n(Estoque atual: ${quantidadeAtual} unidades)`, 
        '1'
    );
    
    if (quantidade === null || quantidade.trim() === '') {
        return;
    }
    
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
        
        if (!confirmar) {
            return;
        }
    }
    
    // Confirmar remoção
    const motivo = prompt(
        `Motivo da remoção de ${qtd} unidades do poste ${codigoPoste}:`,
        'Remoção rápida via interface'
    );
    
    if (motivo === null) {
        return;
    }
    
    try {
        window.AppUtils.showLoading(true);
        
        // Encontrar o poste para determinar o caminhão
        const posteSelecionado = encontrarPostePorId(posteId);
        if (!posteSelecionado) {
            throw new Error('Poste não encontrado');
        }
        
        const caminhaoEscolhido = escolherCaminhaoParaEstoque(posteSelecionado);
        
        console.log(`📤 Removendo ${qtd} unidades via caminhão ${caminhaoEscolhido} do poste ${codigoPoste}`);
        
        const response = await fetch('https://posteback.onrender.com/api/estoque/remover', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Tenant-ID': caminhaoEscolhido
            },
            body: JSON.stringify({
                posteId: posteId,
                quantidade: qtd,
                dataEstoque: new Date().toISOString().split('T')[0], // Data de hoje
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
        
        // Recarregar dados
        await loadAllData();
        
        // Se o histórico estiver visível, atualizar também
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

async function verHistoricoPoste(posteId, codigoPoste) {
    try {
        // Mostrar seção de histórico
        const historicoSection = document.getElementById('historico-section');
        historicoSection.style.display = 'block';
        
        // Configurar filtro para o poste específico
        document.getElementById('historico-poste').value = posteId;
        
        // Carregar histórico
        await carregarHistoricoMovimentos();
        
        // Scroll para a seção
        window.AppUtils.scrollToElement('historico-section', 80);
        
        window.AppUtils.showAlert(`Histórico do poste ${codigoPoste} carregado`, 'success');
        
    } catch (error) {
        console.error('Erro ao carregar histórico do poste:', error);
        window.AppUtils.showAlert('Erro ao carregar histórico do poste', 'error');
    }
}

async function verDetalhesMovimento(movimentoId) {
    try {
        const movimento = estoqueData.historicoMovimentos.find(m => m.id === movimentoId);
        if (!movimento) {
            window.AppUtils.showAlert('Movimento não encontrado', 'warning');
            return;
        }
        
        const detalhes = document.getElementById('movimento-detalhes');
        detalhes.innerHTML = `
            <div style="display: grid; gap: 15px;">
                <div>
                    <strong>📋 Movimento ID:</strong> ${movimento.id}
                </div>
                
                <div>
                    <strong>📦 Poste:</strong> ${movimento.codigoPoste} - ${movimento.descricaoPoste}
                </div>
                
                <div>
                    <strong>🔄 Tipo:</strong> ${getTipoMovimentoIcon(movimento.tipoMovimento)} ${movimento.tipoMovimentoDescricao}
                </div>
                
                <div>
                    <strong>📊 Quantidade:</strong> ${movimento.quantidade} unidades
                </div>
                
                <div>
                    <strong>📅 Data do Movimento:</strong> ${window.AppUtils.formatDateBRFixed(movimento.dataMovimento)}
                </div>
                
                <div>
                    <strong>🕒 Data de Registro:</strong> ${window.AppUtils.formatDateBR(movimento.dataRegistro, true)}
                </div>
                
                <div>
                    <strong>🚛 Caminhão:</strong> ${getTenantLabel(movimento.tenantId)}
                </div>
                
                ${movimento.quantidadeAnterior !== null ? `
                    <div>
                        <strong>📈 Estoque Anterior:</strong> ${movimento.quantidadeAnterior} unidades
                    </div>
                ` : ''}
                
                ${movimento.quantidadeAtual !== null ? `
                    <div>
                        <strong>📊 Estoque Atual:</strong> ${movimento.quantidadeAtual} unidades
                    </div>
                ` : ''}
                
                <div>
                    <strong>💰 Valor Unitário:</strong> ${window.AppUtils.formatCurrency(movimento.precoPoste || 0)}
                </div>
                
                <div>
                    <strong>💰 Valor Total:</strong> ${window.AppUtils.formatCurrency(movimento.valorMovimento || 0)}
                </div>
                
                ${movimento.observacao ? `
                    <div>
                        <strong>📝 Observação:</strong><br>
                        <div style="background: var(--bg-primary); padding: 10px; border-radius: 4px; margin-top: 5px;">
                            ${movimento.observacao}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
        
        window.AppUtils.showModal('movimento-modal');
        
    } catch (error) {
        console.error('Erro ao exibir detalhes do movimento:', error);
        window.AppUtils.showAlert('Erro ao carregar detalhes do movimento', 'error');
    }
}

// ================================
// TOGGLE E NAVEGAÇÃO
// ================================

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
// ATUALIZAÇÕES E EXPORTS
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
        'Tipo': 'Consolidado Unificado',
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
        'Data Registro': window.AppUtils.formatDateBR(movimento.dataRegistro, true),
        'Código Poste': movimento.codigoPoste,
        'Descrição': movimento.descricaoPoste,
        'Tipo': movimento.tipoMovimentoDescricao,
        'Quantidade': movimento.quantidade,
        'Valor Unitário': movimento.precoPoste || 0,
        'Valor Total': movimento.valorMovimento || 0,
        'Quantidade Anterior': movimento.quantidadeAnterior || '-',
        'Quantidade Atual': movimento.quantidadeAtual || '-',
        'Caminhão': getTenantLabel(movimento.tenantId),
        'Observação': movimento.observacao || '-'
    }));
    
    window.AppUtils.exportToCSV(dadosExportar, `historico_movimentos_${new Date().toISOString().split('T')[0]}`);
}

// ================================
// DISPONIBILIZAR FUNÇÕES GLOBALMENTE
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
window.verHistoricoPoste = verHistoricoPoste;
window.adicionarEstoqueRapido = adicionarEstoqueRapido;
window.verDetalhesMovimento = verDetalhesMovimento;
window.removerEstoqueRapido = removerEstoqueRapido;
window.scrollToElement = window.AppUtils.scrollToElement;

console.log('✅ Estoque Consolidado UNIFICADO COM HISTÓRICO carregado');