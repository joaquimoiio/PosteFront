// Estado local específico para o Caminhão Branco
let relatoriosData = {
    vendas: [],
    postes: [],
    relatorioGerado: false,
    filtros: { dataInicio: '', dataFim: '', tipoVenda: '' }
};

// Verificar autenticação específica do Caminhão Branco
document.addEventListener('DOMContentLoaded', () => {
    const userType = localStorage.getItem('poste-system-user-type');
    if (userType !== 'branco') {
        window.location.href = 'index.html';
        return;
    }

    if (!window.AppUtils) {
        console.error('AppUtils não carregado! Verifique se utils.js foi incluído.');
        return;
    }

    initRelatorios();
});

async function initRelatorios() {
    console.log('🎯 Inicializando Relatórios Caminhão Branco...');

    try {
        setupEventListeners();
        setDefaultPeriod();
        await loadPostes();
        console.log('✅ Relatórios Caminhão Branco carregado');
    } catch (error) {
        console.error('❌ Erro ao carregar:', error);
        window.AppUtils.showAlert('Erro ao carregar dados. Verifique sua conexão.', 'error');
    }
}

function setupEventListeners() {
    const relatorioForm = document.getElementById('relatorio-form');
    if (relatorioForm) {
        relatorioForm.addEventListener('submit', handleRelatorioSubmit);
    }
}

function setDefaultPeriod() {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    document.getElementById('data-inicio').value = window.AppUtils.dateToInputValue(firstDayOfMonth);
    document.getElementById('data-fim').value = window.AppUtils.dateToInputValue(today);
}

async function loadPostes() {
    try {
        const postes = await window.AppUtils.apiRequest('/postes');
        relatoriosData.postes = postes || [];
    } catch (error) {
        console.error('Erro ao carregar postes:', error);
        relatoriosData.postes = [];
    }
}

async function handleRelatorioSubmit(e) {
    e.preventDefault();

    try {
        const formData = buildRelatorioFilters();

        if (!validateRelatorioFilters(formData)) {
            return;
        }

        relatoriosData.filtros = formData;
        await gerarRelatorio();

    } catch (error) {
        console.error('Erro ao gerar relatório:', error);
        window.AppUtils.showAlert('Erro ao gerar relatório: ' + error.message, 'error');
    }
}

function buildRelatorioFilters() {
    return {
        dataInicio: document.getElementById('data-inicio').value,
        dataFim: document.getElementById('data-fim').value,
        tipoVenda: document.getElementById('tipo-venda').value
    };
}

function validateRelatorioFilters(data) {
    if (!window.AppUtils.validateRequired(data.dataInicio, 'Data início') ||
        !window.AppUtils.validateRequired(data.dataFim, 'Data fim')) {
        return false;
    }

    const inicio = new Date(data.dataInicio);
    const fim = new Date(data.dataFim);

    if (inicio > fim) {
        window.AppUtils.showAlert('Data início não pode ser maior que data fim', 'warning');
        return false;
    }

    return true;
}

async function gerarRelatorio() {
    try {
        window.AppUtils.showLoading(true);

        const vendas = await fetchVendasPeriodo();
        relatoriosData.vendas = vendas || [];

        const { tipoVenda } = relatoriosData.filtros;

        if (!tipoVenda || tipoVenda === 'V') {
            gerarRelatorioVendasNormais();
        }

        if (!tipoVenda || tipoVenda === 'L') {
            gerarRelatorioVendasLoja();
        }

        updatePeriodoInfo();
        relatoriosData.relatorioGerado = true;

        window.AppUtils.showAlert('Relatório gerado com sucesso!', 'success');

    } catch (error) {
        console.error('Erro ao gerar relatório:', error);
        throw error;
    } finally {
        window.AppUtils.showLoading(false);
    }
}

async function fetchVendasPeriodo() {
    const { dataInicio, dataFim } = relatoriosData.filtros;
    const params = new URLSearchParams();

    if (dataInicio) params.append('dataInicio', dataInicio);
    if (dataFim) params.append('dataFim', dataFim);

    const endpoint = `/vendas?${params}`;
    return await window.AppUtils.apiRequest(endpoint);
}

function gerarRelatorioVendasNormais() {
    const vendasV = relatoriosData.vendas.filter(v => v.tipoVenda === 'V');

    if (vendasV.length === 0) {
        document.getElementById('resumo-section').style.display = 'none';
        document.getElementById('relatorio-section').style.display = 'none';
        return;
    }

    // Agrupar vendas por poste
    const vendasPorPoste = {};
    vendasV.forEach(venda => {
        const key = venda.posteId;
        if (!vendasPorPoste[key]) {
            vendasPorPoste[key] = {
                posteId: venda.posteId,
                codigoPoste: venda.codigoPoste,
                descricaoPoste: venda.descricaoPoste,
                quantidadeTotal: 0,
                valorTotal: 0,
                vendas: []
            };
        }

        vendasPorPoste[key].quantidadeTotal += venda.quantidade || 0;
        vendasPorPoste[key].valorTotal += venda.valorVenda || 0;
        vendasPorPoste[key].vendas.push(venda);
    });

    const relatorioArray = Object.values(vendasPorPoste)
        .sort((a, b) => b.quantidadeTotal - a.quantidadeTotal);

    // Atualizar resumo
    const totalTipos = relatorioArray.length;
    const totalVendas = vendasV.length;
    const quantidadeTotal = relatorioArray.reduce((sum, item) => sum + item.quantidadeTotal, 0);
    const valorTotal = relatorioArray.reduce((sum, item) => sum + item.valorTotal, 0);

    window.AppUtils.updateElement('total-tipos-postes', totalTipos);
    window.AppUtils.updateElement('total-vendas-periodo', totalVendas);
    window.AppUtils.updateElement('quantidade-total', quantidadeTotal);
    window.AppUtils.updateElement('valor-total', window.AppUtils.formatCurrency(valorTotal));

    // Mostrar seção
    document.getElementById('resumo-section').style.display = 'block';

    // Gerar lista
    displayRelatorioVendasNormais(relatorioArray);
    document.getElementById('relatorio-section').style.display = 'block';
}

function displayRelatorioVendasNormais(relatorio) {
    const container = document.getElementById('relatorio-list');
    if (!container) return;

    if (!relatorio || relatorio.length === 0) {
        container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">📈</div>
                        <h3>Nenhuma venda normal encontrada</h3>
                        <p>Não há vendas normais (V) no período selecionado.</p>
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
    element.className = 'mobile-list-item relatorio-item';

    const precoUnitario = item.quantidadeTotal > 0 ?
        item.valorTotal / item.quantidadeTotal : 0;

    element.innerHTML = `
                <div class="item-header">
                    <span class="item-code">${item.codigoPoste}</span>
                    <span class="item-quantidade">${item.quantidadeTotal} unidades</span>
                </div>
                
                <div class="item-content">
                    <div class="item-value">${window.AppUtils.formatCurrency(item.valorTotal)}</div>
                    <div class="item-title">${item.descricaoPoste}</div>
                    <div class="item-details">
                        <small>Preço médio: ${window.AppUtils.formatCurrency(precoUnitario)}</small>
                    </div>
                    <div class="item-details">
                        <small>${item.vendas.length} venda(s) realizadas</small>
                    </div>
                </div>
            `;

    return element;
}

function gerarRelatorioVendasLoja() {
    const vendasL = relatoriosData.vendas.filter(v => v.tipoVenda === 'L');

    if (vendasL.length === 0) {
        document.getElementById('resumo-loja-section').style.display = 'none';
        document.getElementById('vendas-loja-section').style.display = 'none';
        return;
    }

    // Ordenar vendas por data (mais recentes primeiro)
    const vendasOrdenadas = vendasL.sort((a, b) => new Date(b.dataVenda) - new Date(a.dataVenda));

    // Atualizar resumo loja
    const totalVendasLoja = vendasL.length;
    const totalPostesLoja = vendasL.reduce((sum, v) => sum + (v.quantidade || 0), 0);
    const totalFreteLoja = vendasL.reduce((sum, v) => sum + (v.freteEletrons || 0), 0);

    window.AppUtils.updateElement('total-vendas-loja', totalVendasLoja);
    window.AppUtils.updateElement('total-postes-loja', totalPostesLoja);
    window.AppUtils.updateElement('total-frete-loja', window.AppUtils.formatCurrency(totalFreteLoja));

    // Mostrar seção
    document.getElementById('resumo-loja-section').style.display = 'block';

    // Gerar lista
    displayRelatorioVendasLoja(vendasOrdenadas);
    document.getElementById('vendas-loja-section').style.display = 'block';
}

function displayRelatorioVendasLoja(vendas) {
    const container = document.getElementById('vendas-loja-list');
    if (!container) return;

    if (!vendas || vendas.length === 0) {
        container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">🏪</div>
                        <h3>Nenhuma venda loja encontrada</h3>
                        <p>Não há vendas loja (L) no período selecionado.</p>
                    </div>
                `;
        return;
    }

    container.innerHTML = '';

    vendas.forEach(venda => {
        const element = createRelatorioLojaItem(venda);
        container.appendChild(element);
    });
}

function createRelatorioLojaItem(venda) {
    const element = document.createElement('div');
    element.className = 'mobile-list-item relatorio-loja-item tipo-l';

    element.innerHTML = `
                <div class="item-header">
                    <span class="item-date">${window.AppUtils.formatDateBR(venda.dataVenda, true)}</span>
                    <span class="item-code">${venda.codigoPoste || 'N/A'}</span>
                </div>
                
                <div class="item-content">
                    <div class="item-value">${window.AppUtils.formatCurrency(venda.freteEletrons || 0)}</div>
                    <div class="item-title">${venda.descricaoPoste || 'Produto não especificado'}</div>
                    <div class="item-details">
                        <small>Quantidade: ${venda.quantidade || 1}</small>
                    </div>
                    ${venda.observacoes ? `
                        <div class="item-details">
                            <small>Obs: ${venda.observacoes}</small>
                        </div>
                    ` : ''}
                </div>
            `;

    return element;
}

function updatePeriodoInfo() {
    const { dataInicio, dataFim, tipoVenda } = relatoriosData.filtros;
    const indicator = document.getElementById('periodo-info');
    const text = document.getElementById('periodo-texto');

    let periodo = '';
    if (dataInicio && dataFim) {
        const inicio = window.AppUtils.formatDateBR(dataInicio);
        const fim = window.AppUtils.formatDateBR(dataFim);
        periodo = `${inicio} até ${fim}`;
    }

    let tipo = '';
    if (tipoVenda === 'V') {
        tipo = ' - Vendas Normais';
    } else if (tipoVenda === 'L') {
        tipo = ' - Vendas Loja';
    }

    text.textContent = `Período: ${periodo}${tipo}`;
    indicator.style.display = 'flex';
}

function limparRelatorio() {
    // Limpar formulário
    document.getElementById('relatorio-form').reset();
    setDefaultPeriod();

    // Esconder seções
    document.getElementById('resumo-section').style.display = 'none';
    document.getElementById('resumo-loja-section').style.display = 'none';
    document.getElementById('relatorio-section').style.display = 'none';
    document.getElementById('vendas-loja-section').style.display = 'none';
    document.getElementById('periodo-info').style.display = 'none';

    // Limpar dados
    relatoriosData.vendas = [];
    relatoriosData.relatorioGerado = false;
    relatoriosData.filtros = { dataInicio: '', dataFim: '', tipoVenda: '' };

    window.AppUtils.showAlert('Relatório limpo', 'success');
}

async function exportarRelatorio() {
    if (!relatoriosData.relatorioGerado || relatoriosData.vendas.length === 0) {
        window.AppUtils.showAlert('Nenhum relatório para exportar', 'warning');
        return;
    }

    const { tipoVenda } = relatoriosData.filtros;

    if (!tipoVenda || tipoVenda === 'V') {
        exportarRelatorioVendasNormais();
    }

    if (!tipoVenda || tipoVenda === 'L') {
        exportarRelatorioVendasLoja();
    }
}

function exportarRelatorioVendasNormais() {
    const vendasV = relatoriosData.vendas.filter(v => v.tipoVenda === 'V');

    if (vendasV.length === 0) return;

    // Agrupar por poste
    const vendasPorPoste = {};
    vendasV.forEach(venda => {
        const key = venda.posteId;
        if (!vendasPorPoste[key]) {
            vendasPorPoste[key] = {
                codigoPoste: venda.codigoPoste,
                descricaoPoste: venda.descricaoPoste,
                quantidadeTotal: 0,
                valorTotal: 0,
                vendas: 0
            };
        }

        vendasPorPoste[key].quantidadeTotal += venda.quantidade || 0;
        vendasPorPoste[key].valorTotal += venda.valorVenda || 0;
        vendasPorPoste[key].vendas += 1;
    });

    const dadosExportar = Object.values(vendasPorPoste).map(item => ({
        'Código': item.codigoPoste,
        'Descrição': item.descricaoPoste,
        'Quantidade Total': item.quantidadeTotal,
        'Valor Total': item.valorTotal,
        'Preço Médio': (item.valorTotal / item.quantidadeTotal).toFixed(2),
        'Número de Vendas': item.vendas
    }));

    const { dataInicio, dataFim } = relatoriosData.filtros;
    const filename = `relatorio_vendas_normais_branco_${dataInicio}_${dataFim}`;

    window.AppUtils.exportToCSV(dadosExportar, filename);
}

function exportarRelatorioVendasLoja() {
    const vendasL = relatoriosData.vendas.filter(v => v.tipoVenda === 'L');

    if (vendasL.length === 0) return;

    const dadosExportar = vendasL.map(venda => ({
        'Data': window.AppUtils.formatDateBR(venda.dataVenda, true),
        'Código Poste': venda.codigoPoste || 'N/A',
        'Descrição': venda.descricaoPoste || 'Produto não especificado',
        'Quantidade': venda.quantidade || 1,
        'Frete Eletrons': venda.freteEletrons || 0,
        'Observações': venda.observacoes || '-'
    }));

    const { dataInicio, dataFim } = relatoriosData.filtros;
    const filename = `relatorio_vendas_loja_branco_${dataInicio}_${dataFim}`;

    window.AppUtils.exportToCSV(dadosExportar, filename);
}

// Disponibilizar funções globalmente
window.gerarRelatorio = gerarRelatorio;
window.limparRelatorio = limparRelatorio;
window.exportarRelatorio = exportarRelatorio;

console.log('✅ Relatórios Caminhão Branco carregado');