// Relatórios JavaScript - Versão Leve
// Utiliza AppUtils para funcionalidades compartilhadas

const { 
    apiRequest, clearCache, formatCurrency, formatDateBR, dateToInputValue,
    updateElement, showLoading, showAlert, validateRequired, exportToCSV
} = window.AppUtils;

// Estado local
let relatoriosData = {
    relatorio: [],
    postes: []
};

// ================================
// INICIALIZAÇÃO
// ================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎯 Inicializando Relatórios...');
    
    try {
        setupEventListeners();
        setDefaultDates();
        await loadPostes();
        console.log('✅ Relatórios carregado');
    } catch (error) {
        console.error('❌ Erro ao carregar:', error);
        showAlert('Erro ao carregar dados. Verifique sua conexão.', 'error');
    }
});

// ================================
// EVENT LISTENERS
// ================================
function setupEventListeners() {
    // Form principal
    const relatorioForm = document.getElementById('relatorio-form');
    if (relatorioForm) {
        relatorioForm.addEventListener('submit', handleRelatorioSubmit);
    }
    
    // Atualização do período
    const dataInicio = document.getElementById('data-inicio');
    const dataFim = document.getElementById('data-fim');
    if (dataInicio && dataFim) {
        dataInicio.addEventListener('change', updatePeriodIndicator);
        dataFim.addEventListener('change', updatePeriodIndicator);
    }
}

function setDefaultDates() {
    const hoje = new Date();
    const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    
    const dataInicio = document.getElementById('data-inicio');
    const dataFim = document.getElementById('data-fim');
    
    if (dataInicio && dataFim) {
        dataInicio.value = dateToInputValue(primeiroDiaMes);
        dataFim.value = dateToInputValue(hoje);
        updatePeriodIndicator();
    }
}

function updatePeriodIndicator() {
    const dataInicio = document.getElementById('data-inicio').value;
    const dataFim = document.getElementById('data-fim').value;
    const periodoInfo = document.getElementById('periodo-info');
    const periodoTexto = document.getElementById('periodo-texto');
    
    if (dataInicio && dataFim) {
        const inicio = formatDateBR(dataInicio);
        const fim = formatDateBR(dataFim);
        
        if (dataInicio === dataFim) {
            periodoTexto.textContent = `📊 Relatório para ${inicio}`;
        } else {
            periodoTexto.textContent = `📊 Relatório de ${inicio} até ${fim}`;
        }
        
        periodoInfo.style.display = 'block';
    } else {
        periodoInfo.style.display = 'none';
    }
}

// ================================
// CARREGAMENTO DE DADOS
// ================================
async function loadPostes() {
    try {
        console.log('⚡ Carregando lista de postes...');
        
        const postes = await apiRequest('/postes');
        relatoriosData.postes = (postes || []).filter(p => p.ativo);
        
        console.log('✅ Lista de postes carregada');
        
    } catch (error) {
        console.error('Erro ao carregar postes:', error);
        showAlert('Erro ao carregar lista de postes', 'warning');
    }
}

async function loadVendas(params) {
    const searchParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
        if (params[key]) {
            searchParams.append(key, params[key]);
        }
    });
    
    const endpoint = searchParams.toString() ? `/vendas?${searchParams}` : '/vendas';
    return await apiRequest(endpoint);
}

// ================================
// MANIPULAÇÃO DO FORMULÁRIO
// ================================
async function handleRelatorioSubmit(e) {
    e.preventDefault();
    await gerarRelatorio();
}

async function gerarRelatorio() {
    try {
        const dataInicio = document.getElementById('data-inicio').value;
        const dataFim = document.getElementById('data-fim').value;
        const tipoVenda = document.getElementById('tipo-venda').value;
        
        if (!validateRequired(dataInicio, 'Data de início') || 
            !validateRequired(dataFim, 'Data fim')) {
            return;
        }
        
        // Validar datas
        if (new Date(dataInicio) > new Date(dataFim)) {
            showAlert('Data de início deve ser anterior à data fim', 'warning');
            return;
        }
        
        showLoading(true);
        
        console.log('📊 Gerando relatório...');
        
        // Carregar vendas do período
        const params = { dataInicio, dataFim };
        const vendas = await loadVendas(params);
        
        // Filtrar por tipo se especificado
        let vendasFiltradas = vendas || [];
        if (tipoVenda) {
            vendasFiltradas = vendasFiltradas.filter(v => v.tipoVenda === tipoVenda);
        }
        
        // Gerar relatório
        const relatorio = gerarRelatorioPorPoste(vendasFiltradas);
        relatoriosData.relatorio = relatorio;
        
        // Atualizar interface
        displayResumo(vendasFiltradas, relatorio);
        displayRelatorio(relatorio);
        displayChart(relatorio);
        
        // Mostrar seções
        document.getElementById('resumo-section').style.display = 'block';
        document.getElementById('relatorio-section').style.display = 'block';
        document.getElementById('charts-section').style.display = 'block';
        
        showAlert('Relatório gerado com sucesso!', 'success');
        console.log('✅ Relatório gerado');
        
    } catch (error) {
        console.error('Erro ao gerar relatório:', error);
        showAlert('Erro ao gerar relatório: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

function gerarRelatorioPorPoste(vendas) {
    // Inicializar com todos os postes ativos
    const relatorioPorPoste = {};
    
    relatoriosData.postes.forEach(poste => {
        relatorioPorPoste[poste.id] = {
            posteId: poste.id,
            codigoPoste: poste.codigo,
            descricaoPoste: poste.descricao,
            precoUnitario: parseFloat(poste.preco),
            quantidadeVendida: 0,
            valorTotal: 0,
            numeroVendas: 0,
            custoEletrons: 0
        };
    });
    
    // Processar vendas (apenas V e L com postes)
    const vendasComPostes = vendas.filter(v => 
        (v.tipoVenda === 'V' || v.tipoVenda === 'L') && v.posteId
    );
    
    vendasComPostes.forEach(venda => {
        const posteId = venda.posteId;
        
        if (relatorioPorPoste[posteId]) {
            const item = relatorioPorPoste[posteId];
            const quantidade = venda.quantidade || 1;
            
            item.quantidadeVendida += quantidade;
            item.numeroVendas++;
            
            // Custo Eletrons = preço × quantidade
            item.custoEletrons += item.precoUnitario * quantidade;
            
            // Valor arrecadado (só para tipo V)
            if (venda.tipoVenda === 'V' && venda.valorVenda) {
                item.valorTotal += parseFloat(venda.valorVenda);
            }
        }
    });
    
    // Converter para array e ordenar
    const relatorio = Object.values(relatorioPorPoste);
    
    // Ordenar: com vendas primeiro (por quantidade), depois sem vendas
    relatorio.sort((a, b) => {
        if (a.quantidadeVendida > 0 && b.quantidadeVendida === 0) return -1;
        if (a.quantidadeVendida === 0 && b.quantidadeVendida > 0) return 1;
        if (a.quantidadeVendida > 0 && b.quantidadeVendida > 0) {
            return b.quantidadeVendida - a.quantidadeVendida;
        }
        return a.codigoPoste.localeCompare(b.codigoPoste);
    });
    
    // Calcular percentuais e rankings
    const quantidadeTotal = relatorio.reduce((sum, item) => sum + item.quantidadeVendida, 0);
    let ranking = 1;
    
    relatorio.forEach((item, index) => {
        if (item.quantidadeVendida > 0) {
            item.ranking = ranking;
            item.percentualDoTotal = quantidadeTotal > 0 ? 
                (item.quantidadeVendida / quantidadeTotal) * 100 : 0;
            
            // Atualizar ranking se próximo item tem quantidade diferente
            if (index + 1 < relatorio.length && 
                relatorio[index + 1].quantidadeVendida !== item.quantidadeVendida) {
                ranking = index + 2;
            }
        } else {
            item.ranking = null;
            item.percentualDoTotal = 0;
        }
    });
    
    return relatorio;
}

// ================================
// DISPLAY RELATÓRIO
// ================================
function displayResumo(vendas, relatorio) {
    const tiposComVenda = relatorio.filter(item => item.quantidadeVendida > 0).length;
    const totalTipos = relatorio.length;
    const totalVendas = vendas.length;
    const quantidadeTotal = relatorio.reduce((sum, item) => sum + item.quantidadeVendida, 0);
    const valorTotal = relatorio.reduce((sum, item) => sum + item.valorTotal, 0);
    
    updateElement('total-tipos-postes', `${tiposComVenda}/${totalTipos}`);
    updateElement('total-vendas-periodo', totalVendas);
    updateElement('quantidade-total', quantidadeTotal);
    updateElement('valor-total', formatCurrency(valorTotal));
}

function displayRelatorio(relatorio) {
    const container = document.getElementById('relatorio-list');
    if (!container) return;
    
    if (!relatorio || relatorio.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📊</div>
                <h3>Nenhum poste encontrado</h3>
                <p>Nenhum poste cadastrado no sistema.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    relatorio.forEach(item => {
        const element = createRelatorioItem(item);
        container.appendChild(element);
    });
}

function createRelatorioItem(item) {
    const element = document.createElement('div');
    const hasVendas = item.quantidadeVendida > 0;
    
    element.className = `mobile-list-item ${hasVendas ? '' : 'sem-vendas'} ${item.ranking && item.ranking <= 3 ? 'top-3' : ''}`;
    
    const rankingDisplay = hasVendas ? 
        `<span class="item-ranking rank-${item.ranking || 'default'}">${getRankingIcon(item.ranking)} ${item.ranking}º</span>` :
        `<span class="item-ranking sem-vendas">Sem vendas</span>`;
    
    element.innerHTML = `
        <div class="item-header">
            ${rankingDisplay}
            <span class="item-code">${item.codigoPoste}</span>
        </div>
        
        <div class="item-content">
            <div class="item-quantidade">${hasVendas ? item.quantidadeVendida : '0'}</div>
            <div class="item-title">${item.descricaoPoste}</div>
            
            <div class="item-details">
                <div class="item-detail">
                    <span class="item-detail-label">Preço Unit.</span>
                    <span class="item-detail-value currency">${formatCurrency(item.precoUnitario)}</span>
                </div>
                <div class="item-detail">
                    <span class="item-detail-label">Custo Eletrons</span>
                    <span class="item-detail-value currency">${formatCurrency(item.custoEletrons)}</span>
                </div>
                <div class="item-detail">
                    <span class="item-detail-label">Arrecadado</span>
                    <span class="item-detail-value currency">${formatCurrency(item.valorTotal)}</span>
                </div>
                <div class="item-detail">
                    <span class="item-detail-label">% do Total</span>
                    <span class="item-detail-value percentage">${item.percentualDoTotal.toFixed(1)}%</span>
                </div>
            </div>
        </div>
    `;
    
    return element;
}

function displayChart(relatorio) {
    const container = document.getElementById('top-chart');
    if (!container) return;
    
    const postesComVendas = relatorio.filter(item => item.quantidadeVendida > 0);
    const top10 = postesComVendas.slice(0, 10);
    
    if (top10.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📊</div>
                <h3>Nenhuma venda no período</h3>
                <p>Não há dados para exibir no gráfico.</p>
            </div>
        `;
        return;
    }
    
    const maxQuantidade = top10[0].quantidadeVendida;
    
    container.innerHTML = '';
    
    top10.forEach((item, index) => {
        const chartItem = document.createElement('div');
        chartItem.className = 'chart-item';
        
        const width = (item.quantidadeVendida / maxQuantidade) * 100;
        
        chartItem.innerHTML = `
            <div class="chart-rank">${index + 1}º</div>
            <div class="chart-bar">
                <div class="chart-fill" style="width: ${width}%"></div>
                <div class="chart-label">${item.codigoPoste} - ${item.quantidadeVendida} unidades</div>
            </div>
        `;
        
        container.appendChild(chartItem);
    });
    
    if (postesComVendas.length > 10) {
        const moreInfo = document.createElement('div');
        moreInfo.style.cssText = `
            text-align: center;
            margin-top: 15px;
            font-size: 12px;
            color: var(--text-secondary);
        `;
        moreInfo.textContent = `+${postesComVendas.length - 10} outros postes com vendas`;
        container.appendChild(moreInfo);
    }
}

function getRankingIcon(ranking) {
    switch (ranking) {
        case 1: return '🥇';
        case 2: return '🥈';
        case 3: return '🥉';
        default: return '📊';
    }
}

// ================================
// HELPER FUNCTIONS
// ================================
function limparRelatorio() {
    document.getElementById('data-inicio').value = '';
    document.getElementById('data-fim').value = '';
    document.getElementById('tipo-venda').value = '';
    
    document.getElementById('periodo-info').style.display = 'none';
    document.getElementById('resumo-section').style.display = 'none';
    document.getElementById('relatorio-section').style.display = 'none';
    document.getElementById('charts-section').style.display = 'none';
    
    showAlert('Relatório limpo', 'success');
}

async function exportarRelatorio() {
    if (!relatoriosData.relatorio || relatoriosData.relatorio.length === 0) {
        showAlert('Nenhum relatório para exportar', 'warning');
        return;
    }
    
    const dataInicio = document.getElementById('data-inicio').value;
    const dataFim = document.getElementById('data-fim').value;
    
    const periodo = `${formatDateBR(dataInicio)}_a_${formatDateBR(dataFim)}`;
    
    const dadosExportar = relatoriosData.relatorio.map(item => ({
        'Ranking': item.ranking || 'Sem vendas',
        'Código': item.codigoPoste,
        'Descrição': item.descricaoPoste,
        'Preço Unitário': item.precoUnitario,
        'Quantidade Vendida': item.quantidadeVendida,
        'Custo Eletrons': item.custoEletrons,
        'Valor Arrecadado': item.valorTotal,
        'Percentual do Total': `${item.percentualDoTotal.toFixed(1)}%`,
        'Número de Vendas': item.numeroVendas
    }));
    
    exportToCSV(dadosExportar, `relatorio_postes_${periodo}`);
}

// Disponibilizar funções globalmente
window.gerarRelatorio = gerarRelatorio;
window.limparRelatorio = limparRelatorio;
window.exportarRelatorio = exportarRelatorio;

console.log('✅ Relatórios leve carregado');