// Estado local do Jefferson
let jeffersonData = {
    estoqueVermelho: [],
    estoqueBranco: [],
    estoqueConsolidado: [],
    vendasVermelho: [],
    vendasBranco: [],
    filters: { caminhao: '', status: '', codigo: '' }
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

    initJeffersonDashboard();
});

async function initJeffersonDashboard() {
    console.log('🎯 Inicializando Dashboard Jefferson...');

    try {
        setupFilters();
        await loadAllData();
        console.log('✅ Dashboard Jefferson carregado');
    } catch (error) {
        console.error('❌ Erro ao carregar:', error);
        window.AppUtils.showAlert('Erro ao carregar dados. Verifique sua conexão.', 'error');
    }
}

function setupFilters() {
    const filtros = ['filtro-caminhao', 'filtro-status', 'filtro-codigo'];
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

        console.log('📊 Carregando dados dos dois caminhões...');

        // Carregar estoques dos dois caminhões
        const [estoqueVermelho, estoqueBranco, vendasVermelho, vendasBranco] = await Promise.all([
            fetchEstoqueCaminhao('vermelho'),
            fetchEstoqueCaminhao('branco'),
            fetchVendasCaminhao('vermelho'),
            fetchVendasCaminhao('branco')
        ]);

        jeffersonData.estoqueVermelho = estoqueVermelho || [];
        jeffersonData.estoqueBranco = estoqueBranco || [];
        jeffersonData.vendasVermelho = vendasVermelho || [];
        jeffersonData.vendasBranco = vendasBranco || [];

        // Consolidar estoques
        jeffersonData.estoqueConsolidado = consolidarEstoques(
            jeffersonData.estoqueVermelho,
            jeffersonData.estoqueBranco
        );

        updateResumo();
        updateVendasConsolidadas();
        aplicarFiltros();

        console.log('✅ Dados do Jefferson carregados');

    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        throw error;
    } finally {
        window.AppUtils.showLoading(false);
    }
}

async function fetchEstoqueCaminhao(caminhao) {
    try {
        // Temporariamente fazer requisição manual com header específico
        const response = await fetch(`https://posteback.onrender.com/api/estoque?caminhao=${caminhao}`, {
            headers: {
                'Content-Type': 'application/json',
                'X-Tenant-ID': caminhao
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`Erro ao buscar estoque do ${caminhao}:`, error);
        return [];
    }
}

async function fetchVendasCaminhao(caminhao) {
    try {
        // Buscar vendas dos últimos 30 dias
        const dataInicio = new Date();
        dataInicio.setDate(dataInicio.getDate() - 30);
        const dataInicioStr = dataInicio.toISOString().split('T')[0];

        const response = await fetch(`https://posteback.onrender.com/api/vendas?caminhao=${caminhao}&dataInicio=${dataInicioStr}`, {
            headers: {
                'Content-Type': 'application/json',
                'X-Tenant-ID': caminhao
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`Erro ao buscar vendas do ${caminhao}:`, error);
        return [];
    }
}

function consolidarEstoques(estoqueVermelho, estoqueBranco) {
    const consolidado = [];
    const processados = new Set();

    // Processar estoque vermelho
    estoqueVermelho.forEach(item => {
        const chave = item.codigoPoste;
        consolidado.push({
            ...item,
            caminhao: 'vermelho',
            quantidadeVermelho: item.quantidadeAtual || 0,
            quantidadeBranco: 0,
            quantidadeTotal: item.quantidadeAtual || 0
        });
        processados.add(chave);
    });

    // Processar estoque branco
    estoqueBranco.forEach(item => {
        const chave = item.codigoPoste;
        const existente = consolidado.find(c => c.codigoPoste === chave);

        if (existente) {
            // Item já existe, somar quantidades
            existente.quantidadeBranco = item.quantidadeAtual || 0;
            existente.quantidadeTotal = existente.quantidadeVermelho + existente.quantidadeBranco;
            existente.caminhao = 'ambos';
        } else {
            // Item novo apenas no branco
            consolidado.push({
                ...item,
                caminhao: 'branco',
                quantidadeVermelho: 0,
                quantidadeBranco: item.quantidadeAtual || 0,
                quantidadeTotal: item.quantidadeAtual || 0
            });
        }
    });

    return consolidado.sort((a, b) => a.codigoPoste.localeCompare(b.codigoPoste));
}

function updateResumo() {
    const vermelho = jeffersonData.estoqueVermelho.length;
    const branco = jeffersonData.estoqueBranco.length;
    const total = jeffersonData.estoqueConsolidado.length;

    // Calcular estatísticas
    const positivo = jeffersonData.estoqueConsolidado.filter(item => item.quantidadeTotal > 0).length;
    const zero = jeffersonData.estoqueConsolidado.filter(item => item.quantidadeTotal === 0).length;
    const negativo = jeffersonData.estoqueConsolidado.filter(item => item.quantidadeTotal < 0).length;
    const baixo = jeffersonData.estoqueConsolidado.filter(item => item.quantidadeTotal > 0 && item.quantidadeTotal <= 5).length;

    // Calcular valor total do estoque
    const valorTotal = jeffersonData.estoqueConsolidado.reduce((sum, item) => {
        const quantidade = Math.max(0, item.quantidadeTotal); // Só contar positivos
        const preco = item.precoPoste || 0;
        return sum + (quantidade * preco);
    }, 0);

    // Atualizar interface
    window.AppUtils.updateElement('postes-vermelho', vermelho);
    window.AppUtils.updateElement('postes-branco', branco);
    window.AppUtils.updateElement('postes-total', total);
    window.AppUtils.updateElement('estoque-positivo', positivo);
    window.AppUtils.updateElement('estoque-baixo', baixo);
    window.AppUtils.updateElement('estoque-zero', zero);
    window.AppUtils.updateElement('estoque-negativo', negativo);
    window.AppUtils.updateElement('valor-estoque', window.AppUtils.formatCurrency(valorTotal));
}

function updateVendasConsolidadas() {
    const totalVermelho = jeffersonData.vendasVermelho.length;
    const totalBranco = jeffersonData.vendasBranco.length;

    window.AppUtils.updateElement('vendas-vermelho', totalVermelho);
    window.AppUtils.updateElement('vendas-branco', totalBranco);
}

function aplicarFiltros() {
    const caminhao = document.getElementById('filtro-caminhao').value;
    const status = document.getElementById('filtro-status').value;
    const codigo = document.getElementById('filtro-codigo').value.toLowerCase();

    let filtrados = [...jeffersonData.estoqueConsolidado];

    // Filtrar por caminhão
    if (caminhao) {
        filtrados = filtrados.filter(item => {
            if (caminhao === 'vermelho') {
                return item.quantidadeVermelho > 0;
            } else if (caminhao === 'branco') {
                return item.quantidadeBranco > 0;
            }
            return true;
        });
    }

    // Filtrar por status
    if (status) {
        filtrados = filtrados.filter(item => {
            const qtd = item.quantidadeTotal;
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

    // Mostrar apenas os primeiros 20 itens no dashboard
    const limitedEstoque = estoque.slice(0, 20);

    limitedEstoque.forEach(item => {
        const element = createEstoqueItem(item);
        container.appendChild(element);
    });

    // Mostrar indicador se há mais itens
    if (estoque.length > 20) {
        const moreIndicator = document.createElement('div');
        moreIndicator.className = 'mobile-list-item';
        moreIndicator.style.textAlign = 'center';
        moreIndicator.style.background = 'var(--bg-primary)';
        moreIndicator.innerHTML = `
                    <div class="item-content">
                        <p>E mais ${estoque.length - 20} itens...</p>
                        <a href="estoque-consolidado.html" class="btn btn-primary">Ver Todos</a>
                    </div>
                `;
        container.appendChild(moreIndicator);
    }
}

function createEstoqueItem(item) {
    const element = document.createElement('div');
    const statusClass = getStatusClass(item.quantidadeTotal);

    element.className = `mobile-list-item ${statusClass}`;

    // Ícones dos caminhões
    let caminhaoInfo = '';
    if (item.quantidadeVermelho > 0 && item.quantidadeBranco > 0) {
        caminhaoInfo = `🚛 ${item.quantidadeVermelho} | 🚚 ${item.quantidadeBranco}`;
    } else if (item.quantidadeVermelho > 0) {
        caminhaoInfo = `🚛 ${item.quantidadeVermelho}`;
    } else if (item.quantidadeBranco > 0) {
        caminhaoInfo = `🚚 ${item.quantidadeBranco}`;
    } else {
        caminhaoInfo = '📦 Esgotado';
    }

    element.innerHTML = `
                <div class="item-header">
                    <span class="item-status ${statusClass}">
                        ${getStatusText(item.quantidadeTotal)}
                    </span>
                    <span class="item-code">${item.codigoPoste}</span>
                </div>
                
                <div class="item-content">
                    <div class="item-quantidade ${statusClass}">${item.quantidadeTotal}</div>
                    <div class="item-title">${item.descricaoPoste}</div>
                    <div class="item-details">
                        <small style="color: var(--text-secondary);">${caminhaoInfo}</small>
                    </div>
                    <div class="item-details">Preço: ${window.AppUtils.formatCurrency(item.precoPoste || 0)}</div>
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

function limparFiltros() {
    document.getElementById('filtro-caminhao').value = '';
    document.getElementById('filtro-status').value = '';
    document.getElementById('filtro-codigo').value = '';
    aplicarFiltros();
    window.AppUtils.showAlert('Filtros limpos', 'success');
}

async function atualizarEstoque() {
    try {
        window.AppUtils.clearCache();
        await loadAllData();
        window.AppUtils.showAlert('Estoque atualizado com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao atualizar estoque:', error);
        window.AppUtils.showAlert('Erro ao atualizar. Verifique sua conexão.', 'error');
    }
}

function exportarEstoque() {
    if (!jeffersonData.estoqueConsolidado || jeffersonData.estoqueConsolidado.length === 0) {
        window.AppUtils.showAlert('Nenhum estoque para exportar', 'warning');
        return;
    }

    const dadosExportar = jeffersonData.estoqueConsolidado.map(item => ({
        'Código': item.codigoPoste,
        'Descrição': item.descricaoPoste,
        'Preço': item.precoPoste || 0,
        'Qtd. Vermelho': item.quantidadeVermelho,
        'Qtd. Branco': item.quantidadeBranco,
        'Qtd. Total': item.quantidadeTotal,
        'Status': getStatusText(item.quantidadeTotal),
        'Valor Total': (item.quantidadeTotal * (item.precoPoste || 0)).toFixed(2)
    }));

    window.AppUtils.exportToCSV(dadosExportar, `estoque_consolidado_${new Date().toISOString().split('T')[0]}`);
}

// Disponibilizar funções globalmente
window.aplicarFiltros = aplicarFiltros;
window.limparFiltros = limparFiltros;
window.atualizarEstoque = atualizarEstoque;
window.exportarEstoque = exportarEstoque;

console.log('✅ Dashboard Jefferson carregado');