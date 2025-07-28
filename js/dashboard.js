// ================================
// DASHBOARD.JS OTIMIZADO - Caminhão Vermelho
// ================================

let dashboardData = {
    resumo: null,
    despesas: [],
    vendas: [],
    postes: [],
    filters: { dataInicio: null, dataFim: null }
};

// ================================
// INICIALIZAÇÃO
// ================================
document.addEventListener('DOMContentLoaded', () => {
    const userType = localStorage.getItem('poste-system-user-type');
    if (userType !== 'vermelho') {
        window.location.href = 'index.html';
        return;
    }

    if (!window.AppUtils) {
        console.error('AppUtils não carregado!');
        return;
    }

    initDashboard();
});

async function initDashboard() {
    console.log('🎯 Inicializando Dashboard Caminhão Vermelho...');

    try {
        setupFilters();
        setDefaultPeriod();
        await loadData();
        console.log('✅ Dashboard Caminhão Vermelho carregado');
    } catch (error) {
        console.error('❌ Erro ao carregar:', error);
        window.AppUtils.showAlert('Erro ao carregar dados. Verifique sua conexão.', 'error');
    }
}

function setupFilters() {
    const dataInicio = document.getElementById('data-inicio');
    const dataFim = document.getElementById('data-fim');

    if (dataInicio && dataFim) {
        dataInicio.addEventListener('change', updatePeriodIndicator);
        dataFim.addEventListener('change', updatePeriodIndicator);
    }
}

function setDefaultPeriod() {
    window.AppUtils.setDefaultDateFilters('data-inicio', 'data-fim');

    const dataInicio = document.getElementById('data-inicio');
    const dataFim = document.getElementById('data-fim');

    if (dataInicio && dataFim) {
        dashboardData.filters.dataInicio = dataInicio.value;
        dashboardData.filters.dataFim = dataFim.value;
    }
}

// ================================
// DATA LOADING
// ================================
async function loadData() {
    try {
        window.AppUtils.showLoading(true);

        console.log('📊 Carregando dados do Caminhão Vermelho...');

        const [resumoVendas, despesas, vendas, postes] = await Promise.all([
            fetchResumoVendas(),
            fetchDespesas(),
            fetchVendas(),
            fetchPostes()
        ]);

        dashboardData.resumo = resumoVendas;
        dashboardData.despesas = despesas || [];
        dashboardData.vendas = vendas || [];
        dashboardData.postes = postes || [];

        const lucros = calcularLucrosCaminhaoVermelho(resumoVendas, despesas || []);
        updateInterface(lucros);

        console.log('✅ Dados do Caminhão Vermelho carregados');

    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        throw error;
    } finally {
        window.AppUtils.showLoading(false);
    }
}

async function fetchResumoVendas() {
    const params = new URLSearchParams();
    if (dashboardData.filters.dataInicio) params.append('dataInicio', dashboardData.filters.dataInicio);
    if (dashboardData.filters.dataFim) params.append('dataFim', dashboardData.filters.dataFim);
    
    const endpoint = params.toString() ? `/vendas/resumo?${params}` : '/vendas/resumo';
    
    try {
        return await window.AppUtils.apiRequest(endpoint);
    } catch (error) {
        console.error('Erro ao buscar resumo:', error);
        return {
            totalVendaPostes: 0, valorTotalVendas: 0, totalFreteEletrons: 0,
            valorTotalExtras: 0, totalVendasE: 0, totalVendasV: 0, totalVendasL: 0
        };
    }
}

async function fetchDespesas() {
    const params = new URLSearchParams();
    if (dashboardData.filters.dataInicio) params.append('dataInicio', dashboardData.filters.dataInicio);
    if (dashboardData.filters.dataFim) params.append('dataFim', dashboardData.filters.dataFim);
    
    try {
        return await window.AppUtils.apiRequest(params.toString() ? `/despesas?${params}` : '/despesas');
    } catch (error) {
        console.error('Erro ao buscar despesas:', error);
        return [];
    }
}

async function fetchVendas() {
    const params = new URLSearchParams();
    if (dashboardData.filters.dataInicio) params.append('dataInicio', dashboardData.filters.dataInicio);
    if (dashboardData.filters.dataFim) params.append('dataFim', dashboardData.filters.dataFim);
    
    try {
        return await window.AppUtils.apiRequest(params.toString() ? `/vendas?${params}` : '/vendas');
    } catch (error) {
        console.error('Erro ao buscar vendas:', error);
        return [];
    }
}

async function fetchPostes() {
    try {
        return await window.AppUtils.apiRequest('/postes');
    } catch (error) {
        console.error('Erro ao buscar postes:', error);
        return [];
    }
}

// ================================
// CÁLCULOS ESPECÍFICOS VERMELHO
// ================================
function calcularLucrosCaminhaoVermelho(resumoVendas, despesas) {
    if (!resumoVendas || !despesas) {
        return {
            totalVendaPostes: 0, valorTotalVendas: 0, custoEletronsL: 0,
            despesasFuncionario: 0, outrasDespesas: 0, lucroTotal: 0,
            parteCicero: 0, parteGilberto: 0, parteJefferson: 0,
            valorTotalExtras: 0, totalFreteEletrons: 0,
            totalVendasE: 0, totalVendasV: 0, totalVendasL: 0, totalArrecadado: 0
        };
    }

    // Separar despesas por tipo
    const despesasFuncionario = despesas
        .filter(d => d.tipo === 'FUNCIONARIO')
        .reduce((sum, d) => sum + (parseFloat(d.valor) || 0), 0);

    const outrasDespesas = despesas
        .filter(d => d.tipo === 'OUTRAS')
        .reduce((sum, d) => sum + (parseFloat(d.valor) || 0), 0);

    // Valores das vendas
    const totalVendaPostes = parseFloat(resumoVendas.totalVendaPostes) || 0;
    const valorTotalVendas = parseFloat(resumoVendas.valorTotalVendas) || 0;
    const totalFreteEletrons = parseFloat(resumoVendas.totalFreteEletrons) || 0;
    const valorTotalExtras = parseFloat(resumoVendas.valorTotalExtras) || 0;

    const lucroTotal = valorTotalVendas + valorTotalExtras + totalFreteEletrons - outrasDespesas - totalVendaPostes;
    const totalArrecadado = valorTotalVendas + valorTotalExtras + totalFreteEletrons;
    

    // Divisão específica do Caminhão Vermelho: 50% Cícero, 25% G&J
    const metadeCicero = lucroTotal / 2;
    const metadeGilbertoJefferson = lucroTotal / 2;

    // Despesas de funcionário afetam apenas G&J
    const parteGilbertoJeffersonLiquida = metadeGilbertoJefferson - despesasFuncionario;

    const parteGilberto = parteGilbertoJeffersonLiquida / 2;
    const parteJefferson = parteGilbertoJeffersonLiquida / 2;

    const custoEletronsL = totalVendaPostes - totalFreteEletrons;

    return {
        totalVendaPostes, valorTotalVendas, custoEletronsL,
        despesasFuncionario, outrasDespesas, lucroTotal,
        parteCicero: metadeCicero, parteGilberto,totalArrecadado, parteJefferson,
        valorTotalExtras, totalFreteEletrons,
        totalVendasE: resumoVendas.totalVendasE || 0,
        totalVendasV: resumoVendas.totalVendasV || 0,
        totalVendasL: resumoVendas.totalVendasL || 0
    };
}

// ================================
// INTERFACE UPDATE
// ================================
function updateInterface(lucros) {
    // Cards de vendas por tipo
    window.AppUtils.updateElement('vendas-tipo-e', lucros.totalVendasE);
    window.AppUtils.updateElement('vendas-tipo-v', lucros.totalVendasV);
    window.AppUtils.updateElement('vendas-tipo-l', lucros.totalVendasL);
    window.AppUtils.updateElement('total-vendas', dashboardData.vendas.length);

    // Cards de valores
    window.AppUtils.updateElement('valor-total-vendas', window.AppUtils.formatCurrency(lucros.totalArrecadado));
    window.AppUtils.updateElement('total-venda-postes', window.AppUtils.formatCurrency(lucros.totalVendaPostes));
    window.AppUtils.updateElement('custo-eletrons-l', window.AppUtils.formatCurrency(lucros.custoEletronsL));
    window.AppUtils.updateElement('total-despesas', window.AppUtils.formatCurrency(lucros.outrasDespesas));

    // Cards de lucros (Cícero + Gilberto + Jefferson)
    window.AppUtils.updateElement('lucro-total', window.AppUtils.formatCurrency(lucros.lucroTotal));
    window.AppUtils.updateElement('parte-cicero', window.AppUtils.formatCurrency(lucros.parteCicero));
    window.AppUtils.updateElement('parte-gilberto', window.AppUtils.formatCurrency(lucros.parteGilberto));
    window.AppUtils.updateElement('parte-jefferson', window.AppUtils.formatCurrency(lucros.parteJefferson));

    // Estatísticas - MODIFICAÇÃO AQUI: trocar ticket médio por valor total de vendas E (extras)
    const valorTotalExtras = lucros.valorTotalExtras || 0;
    
    const margemLucro = lucros.valorTotalVendas > 0 ?
        (lucros.lucroTotal / lucros.valorTotalVendas * 100) : 0;

    window.AppUtils.updateElement('total-postes', dashboardData.postes.filter(p => p.ativo).length);
    window.AppUtils.updateElement('total-despesas-count', dashboardData.despesas.length);
    
    // MUDANÇA: trocar ticket-medio por valor total de vendas E (extras)
    window.AppUtils.updateElement('ticket-medio', window.AppUtils.formatCurrency(valorTotalExtras));
    
    window.AppUtils.updateElement('margem-lucro', `${margemLucro.toFixed(1)}%`);

    console.log('✅ Interface do Caminhão Vermelho atualizada');
}

function updatePeriodIndicator() {
    const dataInicio = document.getElementById('data-inicio').value;
    const dataFim = document.getElementById('data-fim').value;
    const indicator = document.getElementById('current-period');
    const text = document.getElementById('current-period-text');

    if (dataInicio || dataFim) {
        const inicio = dataInicio ? new Date(dataInicio).toLocaleDateString('pt-BR') : 'Início';
        const fim = dataFim ? new Date(dataFim).toLocaleDateString('pt-BR') : 'Fim';

        if (dataInicio && dataFim) {
            text.textContent = `Período: ${inicio} até ${fim}`;
        } else if (dataInicio) {
            text.textContent = `A partir de: ${inicio}`;
        } else {
            text.textContent = `Até: ${fim}`;
        }

        indicator.style.display = 'flex';
    } else {
        indicator.style.display = 'none';
    }
}

// ================================
// GLOBAL FUNCTIONS
// ================================
async function applyPeriodFilter() {
    try {
        const filtroInicio = document.getElementById('data-inicio');
        const filtroFim = document.getElementById('data-fim');

        if (filtroInicio && filtroFim) {
            dashboardData.filters.dataInicio = filtroInicio.value;
            dashboardData.filters.dataFim = filtroFim.value;
        }

        window.AppUtils.clearCache();
        await loadData();
        updatePeriodIndicator();
        window.AppUtils.showAlert('Filtros aplicados com sucesso!', 'success');

    } catch (error) {
        console.error('Erro ao aplicar filtros:', error);
        window.AppUtils.showAlert('Erro ao aplicar filtros. Tente novamente.', 'error');
    }
}

function clearPeriodFilter() {
    const filtroInicio = document.getElementById('data-inicio');
    const filtroFim = document.getElementById('data-fim');

    if (filtroInicio && filtroFim) {
        filtroInicio.value = '';
        filtroFim.value = '';
        dashboardData.filters.dataInicio = null;
        dashboardData.filters.dataFim = null;
    }

    applyPeriodFilter();
}

async function refreshDashboard() {
    try {
        window.AppUtils.clearCache();
        await loadData();
        window.AppUtils.showAlert('Dashboard atualizado com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao atualizar dashboard:', error);
        window.AppUtils.showAlert('Erro ao atualizar. Verifique sua conexão.', 'error');
    }
}

// Export global functions
window.applyPeriodFilter = applyPeriodFilter;
window.clearPeriodFilter = clearPeriodFilter;
window.refreshDashboard = refreshDashboard;

console.log('✅ Dashboard Caminhão Vermelho otimizado carregado');