// Dashboard Mobile-First - JavaScript Otimizado
const API_BASE = 'https://posteback.onrender.com/api';

// Estado global simplificado
const state = {
    resumo: null,
    despesas: [],
    vendas: [],
    postes: [],
    filters: { dataInicio: null, dataFim: null }
};

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎯 Inicializando Dashboard Mobile...');
    
    try {
        configurarFiltrosPadrao();
        await carregarDados();
        console.log('✅ Dashboard carregado');
    } catch (error) {
        console.error('❌ Erro ao carregar:', error);
        showAlert('Erro ao carregar dados', 'error');
    }
});

// Configuração inicial
function configurarFiltrosPadrao() {
    const hoje = new Date();
    const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    
    const filtroInicio = document.getElementById('data-inicio');
    const filtroFim = document.getElementById('data-fim');
    
    if (filtroInicio && filtroFim) {
        filtroInicio.value = dateToInputValue(primeiroDiaMes);
        filtroFim.value = dateToInputValue(hoje);
        
        state.filters.dataInicio = primeiroDiaMes;
        state.filters.dataFim = hoje;
    }
}

// Carregamento de dados
async function carregarDados() {
    try {
        showLoading(true);
        
        const [resumoVendas, despesas, vendas, postes] = await Promise.all([
            fetchResumoVendas(),
            fetchDespesas(),
            fetchVendas(),
            fetchPostes()
        ]);

        state.resumo = resumoVendas;
        state.despesas = despesas;
        state.vendas = vendas;
        state.postes = postes;

        const lucros = calcularLucros(resumoVendas, despesas);
        atualizarInterface(lucros);
        
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        throw error;
    } finally {
        showLoading(false);
    }
}

// Requisições API
async function apiRequest(endpoint, params = {}) {
    const url = new URL(`${API_BASE}${endpoint}`);
    
    Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
            url.searchParams.append(key, params[key]);
        }
    });
    
    const response = await fetch(url.toString(), {
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    });
    
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
}

async function fetchResumoVendas() {
    const params = {};
    if (state.filters.dataInicio) {
        params.dataInicio = dateToISOString(state.filters.dataInicio);
    }
    if (state.filters.dataFim) {
        params.dataFim = dateToISOString(state.filters.dataFim);
    }
    return await apiRequest('/vendas/resumo', params);
}

async function fetchDespesas() {
    const params = {};
    if (state.filters.dataInicio) {
        params.dataInicio = dateToISOString(state.filters.dataInicio);
    }
    if (state.filters.dataFim) {
        params.dataFim = dateToISOString(state.filters.dataFim);
    }
    return await apiRequest('/despesas', params);
}

async function fetchVendas() {
    const params = {};
    if (state.filters.dataInicio) {
        params.dataInicio = dateToISOString(state.filters.dataInicio);
    }
    if (state.filters.dataFim) {
        params.dataFim = dateToISOString(state.filters.dataFim);
    }
    return await apiRequest('/vendas', params);
}

async function fetchPostes() {
    return await apiRequest('/postes');
}

// CORREÇÃO: Cálculos de lucro com nova fórmula
function calcularLucros(resumoVendas, despesas) {
    // Separar despesas por tipo
    const despesasFuncionario = despesas
        .filter(d => d.tipo === 'FUNCIONARIO')
        .reduce((sum, d) => sum + (parseFloat(d.valor) || 0), 0);
        
    const outrasDespesas = despesas
        .filter(d => d.tipo === 'OUTRAS')
        .reduce((sum, d) => sum + (parseFloat(d.valor) || 0), 0);

    // Valores das vendas
    const totalVendaPostes = parseFloat(resumoVendas.totalVendaPostes) || 0; // Custo dos postes
    const valorTotalVendas = parseFloat(resumoVendas.valorTotalVendas) || 0; // Valor arrecadado em vendas V
    const totalFreteEletrons = parseFloat(resumoVendas.totalFreteEletrons) || 0; // Frete das vendas L
    const valorTotalExtras = parseFloat(resumoVendas.valorTotalExtras) || 0; // Valor das vendas E

    // Onde:
    // - Valor Arrecadado = valorTotalVendas (vendas tipo V)
    // - Extras = valorTotalExtras (vendas tipo E)
    // - Loja = totalFreteEletrons (frete das vendas tipo L)
    // - Outras Despesas = outrasDespesas
    // - Custo Eletrons = totalVendaPostes (custo dos postes vendidos)
    
    const lucroTotal = valorTotalVendas + valorTotalExtras + totalFreteEletrons - outrasDespesas - totalVendaPostes;

    // Divisão dos lucros
    const metadeCicero = lucroTotal / 2; // 50% para Cícero
    const metadeGilbertoJefferson = lucroTotal / 2; // 50% para G&J
    
    // Da parte de G&J, subtrair despesas de funcionário
    const parteGilbertoJeffersonLiquida = metadeGilbertoJefferson - despesasFuncionario;
    
    // Dividir igualmente entre Gilberto e Jefferson
    const parteGilberto = parteGilbertoJeffersonLiquida / 2; // 25% do total
    const parteJefferson = parteGilbertoJeffersonLiquida / 2; // 25% do total

    // Cálculo do custo dos Eletrons L (diferença entre custo e frete)
    const custoEletronsL = totalVendaPostes - totalFreteEletrons;

    console.log('💰 Cálculo de Lucros:');
    console.log('   Valor Arrecadado (V):', valorTotalVendas);
    console.log('   Extras (E):', valorTotalExtras);
    console.log('   Loja/Frete (L):', totalFreteEletrons);
    console.log('   Outras Despesas:', outrasDespesas);
    console.log('   Custo Eletrons:', totalVendaPostes);
    console.log('   LUCRO TOTAL:', lucroTotal);
    console.log('   Cícero (50%):', metadeCicero);
    console.log('   Gilberto (25%):', parteGilberto);
    console.log('   Jefferson (25%):', parteJefferson);

    return {
        totalVendaPostes,
        valorTotalVendas,
        custoEletronsL,
        despesasFuncionario,
        outrasDespesas,
        lucroTotal,
        parteCicero: metadeCicero,
        parteGilberto,
        parteJefferson,
        valorTotalExtras,
        totalFreteEletrons,
        totalVendasE: resumoVendas.totalVendasE || 0,
        totalVendasV: resumoVendas.totalVendasV || 0,
        totalVendasL: resumoVendas.totalVendasL || 0
    };
}

// Atualização da interface
function atualizarInterface(lucros) {
    // Cards de vendas por tipo
    updateElement('vendas-tipo-e', lucros.totalVendasE);
    updateElement('vendas-tipo-v', lucros.totalVendasV);
    updateElement('vendas-tipo-l', lucros.totalVendasL);
    updateElement('total-vendas', state.vendas.length);

    // Cards de valores
    updateElement('valor-total-vendas', formatCurrency(lucros.valorTotalVendas));
    updateElement('total-venda-postes', formatCurrency(lucros.totalVendaPostes));
    updateElement('custo-eletrons-l', formatCurrency(lucros.custoEletronsL));
    updateElement('total-despesas', formatCurrency(lucros.outrasDespesas));

    // Cards de lucros
    updateElement('lucro-total', formatCurrency(lucros.lucroTotal));
    updateElement('parte-cicero', formatCurrency(lucros.parteCicero));
    updateElement('parte-gilberto', formatCurrency(lucros.parteGilberto));
    updateElement('parte-jefferson', formatCurrency(lucros.parteJefferson));

    // Estatísticas
    const vendasV = state.vendas.filter(v => v.tipoVenda === 'V');
    const ticketMedio = vendasV.length > 0 ? 
        vendasV.reduce((sum, v) => sum + (v.valorVenda || 0), 0) / vendasV.length : 0;
    const margemLucro = lucros.valorTotalVendas > 0 ? 
        (lucros.lucroTotal / lucros.valorTotalVendas * 100) : 0;

    updateElement('total-postes', state.postes.filter(p => p.ativo).length);
    updateElement('total-despesas-count', state.despesas.length);
    updateElement('ticket-medio', formatCurrency(ticketMedio));
    updateElement('margem-lucro', `${margemLucro.toFixed(1)}%`);

    // Log para debug
    console.log('✅ Interface atualizada com nova fórmula de lucro');
}

// Filtros
async function applyPeriodFilter() {
    const filtroInicio = document.getElementById('data-inicio');
    const filtroFim = document.getElementById('data-fim');
    
    if (filtroInicio && filtroFim) {
        state.filters.dataInicio = filtroInicio.value ? 
            new Date(filtroInicio.value + 'T00:00:00') : null;
        state.filters.dataFim = filtroFim.value ? 
            new Date(filtroFim.value + 'T23:59:59') : null;
    }
    
    await carregarDados();
    showAlert('Filtros aplicados!', 'success');
}

function clearPeriodFilter() {
    const filtroInicio = document.getElementById('data-inicio');
    const filtroFim = document.getElementById('data-fim');
    
    if (filtroInicio && filtroFim) {
        filtroInicio.value = '';
        filtroFim.value = '';
        state.filters.dataInicio = null;
        state.filters.dataFim = null;
    }
    
    applyPeriodFilter();
}

async function refreshDashboard() {
    await carregarDados();
    showAlert('Dashboard atualizado!', 'success');
}

// Utilitários
function updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value.toString();
    }
}

function formatCurrency(value) {
    if (value == null || isNaN(value)) return 'R$ 0,00';
    
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

function dateToInputValue(date) {
    if (!date) return '';
    
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
}

function dateToISOString(date) {
    if (!date) return null;
    
    const d = date instanceof Date ? date : new Date(date);
    return d.toISOString().split('T')[0];
}

function showLoading(show) {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = show ? 'flex' : 'none';
    }
}

function showAlert(message, type = 'success', duration = 3000) {
    const alertContainer = document.getElementById('alert-container');
    
    if (!alertContainer) {
        console.warn('Container de alertas não encontrado');
        return;
    }
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    
    alertContainer.appendChild(alert);
    
    setTimeout(() => {
        if (alert.parentNode) {
            alert.remove();
        }
    }, duration);
}

console.log('✅ Dashboard Mobile-First carregado com nova fórmula de lucro');