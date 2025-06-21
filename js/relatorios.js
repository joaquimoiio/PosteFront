// Relatórios JavaScript Mobile-First - Versão Corrigida
const API_BASE = 'http://localhost:8080/api';

// Estado global simplificado
const state = {
    relatorio: [],
    postes: []
};

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎯 Inicializando Relatórios Mobile...');
    
    try {
        configurarEventos();
        setDefaultDates();
        await loadPostes();
        console.log('✅ Relatórios carregado');
    } catch (error) {
        console.error('❌ Erro ao carregar:', error);
        showAlert('Erro ao carregar dados', 'error');
    }
});

// Configuração de eventos
function configurarEventos() {
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

// Configuração inicial
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

// API calls - CORRIGIDO
async function apiRequest(endpoint, options = {}) {
    // Remove barras duplicadas do endpoint
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${API_BASE}${cleanEndpoint}`;
    
    console.log('Fazendo requisição para:', url);
    
    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...options.headers
        }
    });
    
    if (!response.ok) {
        console.error('Erro na resposta:', response.status, response.statusText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
}

async function loadPostes() {
    try {
        const postes = await apiRequest('/postes');
        state.postes = postes.filter(p => p.ativo);
    } catch (error) {
        console.error('Erro ao carregar postes:', error);
        showAlert('Erro ao carregar lista de postes', 'warning');
    }
}

async function loadVendas(params) {
    // Construir URL com parâmetros
    const searchParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
        if (params[key]) {
            searchParams.append(key, params[key]);
        }
    });
    
    const endpoint = searchParams.toString() ? `/vendas?${searchParams}` : '/vendas';
    return await apiRequest(endpoint);
}

// Manipulação do formulário
async function handleRelatorioSubmit(e) {
    e.preventDefault();
    await gerarRelatorio();
}

async function gerarRelatorio() {
    try {
        const dataInicio = document.getElementById('data-inicio').value;
        const dataFim = document.getElementById('data-fim').value;
        const tipoVenda = document.getElementById('tipo-venda').value;
        
        if (!dataInicio || !dataFim) {
            showAlert('Selecione o período para gerar o relatório', 'warning');
            return;
        }
        
        // Validar datas
        if (new Date(dataInicio) > new Date(dataFim)) {
            showAlert('Data de início deve ser anterior à data fim', 'warning');
            return;
        }
        
        showLoading(true);
        
        // Carregar vendas do período
        const params = { dataInicio, dataFim };
        const vendas = await loadVendas(params);
        
        // Filtrar por tipo se especificado
        let vendasFiltradas = vendas;
        if (tipoVenda) {
            vendasFiltradas = vendas.filter(v => v.tipoVenda === tipoVenda);
        }
        
        // Gerar relatório
        const relatorio = gerarRelatorioPorPoste(vendasFiltradas);
        state.relatorio = relatorio;
        
        // Atualizar interface
        displayResumo(vendasFiltradas, relatorio);
        displayRelatorio(relatorio);
        displayChart(relatorio);
        
        // Mostrar seções
        document.getElementById('resumo-section').style.display = 'block';
        document.getElementById('relatorio-section').style.display = 'block';
        document.getElementById('charts-section').style.display = 'block';
        
        showAlert('Relatório gerado com sucesso!', 'success');
        
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
    
    state.postes.forEach(poste => {
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
            color: var(--gray-500);
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

// Utilitários
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
    if (!state.relatorio || state.relatorio.length === 0) {
        showAlert('Nenhum relatório para exportar', 'warning');
        return;
    }
    
    const dataInicio = document.getElementById('data-inicio').value;
    const dataFim = document.getElementById('data-fim').value;
    
    const periodo = `${formatDateBR(dataInicio)}_a_${formatDateBR(dataFim)}`;
    
    const dadosExportar = state.relatorio.map(item => ({
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

// Formatters
function formatCurrency(value) {
    if (value == null || isNaN(value)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

function formatDateBR(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function dateToInputValue(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Helper functions
function updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value.toString();
}

function showLoading(show) {
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = show ? 'flex' : 'none';
}

function showAlert(message, type = 'success', duration = 3000) {
    const container = document.getElementById('alert-container');
    if (!container) return;
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    
    container.appendChild(alert);
    
    setTimeout(() => {
        if (alert.parentNode) alert.remove();
    }, duration);
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
    
    showAlert('Relatório exportado com sucesso!', 'success');
}

console.log('✅ Relatórios Mobile carregado');