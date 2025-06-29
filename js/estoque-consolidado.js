// Estado local do Jefferson para estoque consolidado - UNIFICADO
let estoqueData = {
    estoqueConsolidado: [], // Estoque consolidado
    todosPostes: [], // Todos os postes de ambos os caminhões
    filters: { status: '', codigo: '' }
};

// Verificar autenticação específica do Jefferson
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

function setupEventListeners() {
    // Form principal
    const estoqueForm = document.getElementById('estoque-form');
    if (estoqueForm) {
        estoqueForm.addEventListener('submit', handleEstoqueSubmit);
        estoqueForm.addEventListener('reset', resetForm);
    }

    // Filtros
    const filtros = ['filtro-status', 'filtro-codigo'];
    filtros.forEach(filtroId => {
        const elemento = document.getElementById(filtroId);
        if (elemento) {
            elemento.addEventListener('change', aplicarFiltros);
            elemento.addEventListener('input', aplicarFiltros);
        }
    });
}

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

// Nova função para unificar postes de ambos os caminhões
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
            // Se já existe, adicionar à lista de relacionados
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
            // Se já existe, adicionar à lista de relacionados
            const existente = postesUnificados.get(codigoBase);
            existente.postesRelacionados.push(poste);
            
            // Se não tem origem definida ou é branco, atualizar info principal
            if (existente.origemCaminhao === 'branco' || !existente.origemCaminhao) {
                existente.codigo = poste.codigo;
                existente.descricao = poste.descricao;
                existente.preco = poste.preco;
                existente.id = poste.id;
                existente.origemCaminhao = 'ambos';
            }
        }
    });
    
    const resultado = Array.from(postesUnificados.values());
    console.log(`✅ Unificados ${resultado.length} tipos de postes únicos`);
    
    return resultado;
}

// Função para extrair código base (remove sufixos como -B, -C)
function extrairCodigoBase(codigo) {
    if (!codigo) return '';
    return codigo.replace(/-[BC]$/, '').trim();
}

// Nova função para buscar estoque consolidado
async function fetchEstoqueConsolidado() {
    try {
        console.log('📦 Buscando estoque consolidado completo...');
        
        const response = await fetch(`https://posteback.onrender.com/api/estoque`, {
            headers: {
                'Content-Type': 'application/json',
                'X-Tenant-ID': 'jefferson' // Jefferson pode ver tudo consolidado
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

// Função atualizada para popular select sem necessidade de selecionar caminhão
function populatePosteSelect() {
    const posteSelect = document.getElementById('estoque-poste');
    if (!posteSelect) return;
    
    // Limpar opções existentes exceto a primeira
    while (posteSelect.children.length > 1) {
        posteSelect.removeChild(posteSelect.lastChild);
    }
    
    // Adicionar todos os postes unificados
    posteSelect.innerHTML = '<option value="">Selecione um poste</option>';
    
    estoqueData.todosPostes
        .sort((a, b) => a.codigo.localeCompare(b.codigo))
        .forEach(poste => {
            const option = document.createElement('option');
            option.value = poste.id;
            
            // Mostrar informação sobre origem se for de ambos os caminhões
            let origemInfo = '';
            if (poste.postesRelacionados && poste.postesRelacionados.length > 1) {
                origemInfo = ' [Ambos]';
            } else if (poste.origemCaminhao === 'vermelho') {
                origemInfo = ' [🚛]';
            } else if (poste.origemCaminhao === 'branco') {
                origemInfo = ' [🚚]';
            }
            
            option.textContent = `${poste.codigo} - ${poste.descricao} (${window.AppUtils.formatCurrency(poste.preco)})${origemInfo}`;
            posteSelect.appendChild(option);
        });
    
    console.log(`📋 Select populado com ${estoqueData.todosPostes.length} postes unificados`);
}

// Função de submit atualizada - escolhe automaticamente o melhor caminhão
async function handleEstoqueSubmit(e) {
    e.preventDefault();
    
    try {
        const formData = buildFormData();
        
        if (!validateFormData(formData)) {
            return;
        }
        
        window.AppUtils.showLoading(true);
        
        // Encontrar o poste selecionado para determinar qual caminhão usar
        const posteSelecionado = encontrarPostePorId(formData.posteId);
        if (!posteSelecionado) {
            throw new Error('Poste não encontrado');
        }
        
        // Escolher o melhor caminhão para adicionar estoque
        const caminhaoEscolhido = escolherCaminhaoParaEstoque(posteSelecionado);
        
        console.log(`📦 Adicionando estoque via caminhão ${caminhaoEscolhido} para poste ${posteSelecionado.codigo}`);
        
        // Fazer requisição para o caminhão escolhido
        const response = await fetch('https://posteback.onrender.com/api/estoque/adicionar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Tenant-ID': caminhaoEscolhido
            },
            body: JSON.stringify({
                posteId: formData.posteId,
                quantidade: formData.quantidade
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        window.AppUtils.showAlert(`Estoque adicionado com sucesso via caminhão ${caminhaoEscolhido}!`, 'success');
        resetForm();
        
        await loadAllData();
        
    } catch (error) {
        console.error('Erro ao adicionar estoque:', error);
        window.AppUtils.showAlert('Erro ao adicionar estoque: ' + error.message, 'error');
    } finally {
        window.AppUtils.showLoading(false);
    }
}

// Nova função para encontrar poste por ID
function encontrarPostePorId(posteId) {
    for (const poste of estoqueData.todosPostes) {
        if (poste.id === posteId) {
            return poste;
        }
        // Verificar também nos postes relacionados
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

// Nova função para escolher qual caminhão usar para adicionar estoque
function escolherCaminhaoParaEstoque(poste) {
    // Se o poste tem origem específica, usar essa origem
    if (poste.origemCaminhao === 'vermelho' || poste.origemCaminhao === 'branco') {
        return poste.origemCaminhao;
    }
    
    // Se é de ambos os caminhões, verificar qual tem menor estoque atual
    if (poste.postesRelacionados && poste.postesRelacionados.length > 1) {
        // Por padrão, usar vermelho (ou implementar lógica mais sofisticada)
        return 'vermelho';
    }
    
    // Padrão: vermelho
    return 'vermelho';
}

function buildFormData() {
    return {
        posteId: parseInt(document.getElementById('estoque-poste').value),
        quantidade: parseInt(document.getElementById('estoque-quantidade').value),
        observacao: document.getElementById('estoque-observacao').value.trim() || null
    };
}

function validateFormData(data) {
    if (!window.AppUtils.validateRequired(data.posteId, 'Poste')) {
        return false;
    }
    
    return window.AppUtils.validateNumber(data.quantidade, 'Quantidade', 0);
}

function updateResumo() {
    const total = estoqueData.estoqueConsolidado.length;
    const positivo = estoqueData.estoqueConsolidado.filter(item => item.quantidadeAtual > 0).length;
    const zero = estoqueData.estoqueConsolidado.filter(item => item.quantidadeAtual === 0).length;
    const negativo = estoqueData.estoqueConsolidado.filter(item => item.quantidadeAtual < 0).length;
    
    window.AppUtils.updateElement('total-tipos', total);
    window.AppUtils.updateElement('estoque-positivo', positivo);
    window.AppUtils.updateElement('estoque-negativo', negativo);
    window.AppUtils.updateElement('estoque-zero', zero);
}

function aplicarFiltros() {
    const status = document.getElementById('filtro-status').value;
    const codigo = document.getElementById('filtro-codigo').value.toLowerCase();

    let filtrados = [...estoqueData.estoqueConsolidado];

    // Filtrar por status
    if (status) {
        filtrados = filtrados.filter(item => {
            const qtd = item.quantidadeAtual;
            switch (status) {
                case 'positivo': return qtd > 0;
                case 'zero': return qtd === 0;
                case 'negativo': return qtd < 0;
                case 'baixo': return qtd > 0 && qtd <= 5;
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
    
    // Para estoque consolidado unificado
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

function resetForm() {
    document.getElementById('estoque-form').reset();
}

function limparFiltros() {
    document.getElementById('filtro-status').value = '';
    document.getElementById('filtro-codigo').value = '';
    aplicarFiltros();
    window.AppUtils.showAlert('Filtros limpos', 'success');
}

async function atualizarEstoque() {
    try {
        await loadAllData();
        window.AppUtils.showAlert('Estoque atualizado com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao atualizar estoque:', error);
        window.AppUtils.showAlert('Erro ao atualizar. Verifique sua conexão.', 'error');
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

// Disponibilizar funções globalmente
window.aplicarFiltros = aplicarFiltros;
window.limparFiltros = limparFiltros;
window.atualizarEstoque = atualizarEstoque;
window.exportarEstoque = exportarEstoque;

console.log('✅ Estoque Consolidado UNIFICADO carregado');