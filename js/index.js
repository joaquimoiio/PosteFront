// Dashboard JavaScript - VERSÃO REFATORADA COM DATAS CORRIGIDAS
const CONFIG = {
    API_BASE: 'http://localhost:8080/api'
};

// Estado global do dashboard
let dashboardData = {
    resumo: null,
    despesas: [],
    vendas: [],
    postes: [],
    loading: false,
    filters: {
        dataInicio: null,
        dataFim: null
    }
};

// Formatação de data brasileira
function formatDateBR(dateString) {
    if (!dateString) return '-';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎯 Inicializando Dashboard...');
    
    configurarLocaleBrasileiro();
    setupPeriodFilters();
    
    try {
        await loadDashboardData();
        console.log('✅ Dashboard carregado com sucesso');
    } catch (error) {
        console.error('❌ Erro ao carregar dashboard:', error);
        showAlert('Erro ao carregar dados do dashboard', 'error');
    }
});

function configurarLocaleBrasileiro() {
    document.documentElement.lang = 'pt-BR';
    
    setTimeout(() => {
        const inputs = document.querySelectorAll('input[type="date"]');
        inputs.forEach(input => {
            input.setAttribute('lang', 'pt-BR');
        });
    }, 100);
}

function setupPeriodFilters() {
    const filtroDataInicio = document.getElementById('filtro-data-inicio');
    const filtroDataFim = document.getElementById('filtro-data-fim');
    
    if (filtroDataInicio && filtroDataFim) {
        setPresetPeriod('month');
        
        filtroDataInicio.addEventListener('change', updatePeriodIndicator);
        filtroDataFim.addEventListener('change', updatePeriodIndicator);
    }
}

function setPresetPeriod(period) {
    const hoje = new Date();
    const filtroDataInicio = document.getElementById('filtro-data-inicio');
    const filtroDataFim = document.getElementById('filtro-data-fim');
    
    let dataInicio, dataFim;
    
    switch (period) {
        case 'today':
            dataInicio = dataFim = hoje;
            break;
            
        case 'week':
            const inicioSemana = new Date(hoje);
            inicioSemana.setDate(hoje.getDate() - hoje.getDay());
            dataInicio = inicioSemana;
            dataFim = hoje;
            break;
            
        case 'month':
            const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
            dataInicio = inicioMes;
            dataFim = hoje;
            break;
            
        case 'all':
        default:
            dataInicio = null;
            dataFim = null;
            break;
    }
    
    if (filtroDataInicio && filtroDataFim) {
        filtroDataInicio.value = dataInicio ? dateToInputValue(dataInicio) : '';
        filtroDataFim.value = dataFim ? dateToInputValue(dataFim) : '';
    }
    
    dashboardData.filters.dataInicio = dataInicio;
    dashboardData.filters.dataFim = dataFim;
    
    updatePeriodIndicator();
    applyPeriodFilter();
}

async function applyPeriodFilter() {
    const filtroDataInicio = document.getElementById('filtro-data-inicio');
    const filtroDataFim = document.getElementById('filtro-data-fim');
    
    if (filtroDataInicio && filtroDataFim) {
        dashboardData.filters.dataInicio = filtroDataInicio.value ? new Date(filtroDataInicio.value) : null;
        dashboardData.filters.dataFim = filtroDataFim.value ? new Date(filtroDataFim.value) : null;
    }
    
    updatePeriodIndicator();
    await loadDashboardData();
}

function clearPeriodFilter() {
    const filtroDataInicio = document.getElementById('filtro-data-inicio');
    const filtroDataFim = document.getElementById('filtro-data-fim');
    
    if (filtroDataInicio && filtroDataFim) {
        filtroDataInicio.value = '';
        filtroDataFim.value = '';
    }
    
    dashboardData.filters.dataInicio = null;
    dashboardData.filters.dataFim = null;
    
    updatePeriodIndicator();
    applyPeriodFilter();
}

function updatePeriodIndicator() {
    const periodText = document.getElementById('current-period-text');
    if (!periodText) return;
    
    const { dataInicio, dataFim } = dashboardData.filters;
    
    if (!dataInicio && !dataFim) {
        periodText.textContent = 'Todos os dados';
    } else if (dataInicio && dataFim) {
        if (isSameDay(dataInicio, dataFim)) {
            periodText.textContent = `${formatDateBR(dateToInputValue(dataInicio))}`;
        } else {
            periodText.textContent = `${formatDateBR(dateToInputValue(dataInicio))} até ${formatDateBR(dateToInputValue(dataFim))}`;
        }
    } else if (dataInicio) {
        periodText.textContent = `A partir de ${formatDateBR(dateToInputValue(dataInicio))}`;
    } else if (dataFim) {
        periodText.textContent = `Até ${formatDateBR(dateToInputValue(dataFim))}`;
    }
}

function isSameDay(date1, date2) {
    return date1.toDateString() === date2.toDateString();
}

async function loadDashboardData() {
    try {
        showLoading(true);
        console.log('📡 Carregando dados do dashboard...');
        
        const [resumoVendas, despesas, vendas, postes] = await Promise.all([
            fetchResumoVendas().catch(err => {
                console.warn('Erro ao carregar resumo:', err);
                return {};
            }),
            fetchDespesas().catch(err => {
                console.warn('Erro ao carregar despesas:', err);
                return [];
            }),
            fetchVendas().catch(err => {
                console.warn('Erro ao carregar vendas:', err);
                return [];
            }),
            fetchPostes().catch(err => {
                console.warn('Erro ao carregar postes:', err);
                return [];
            })
        ]);

        dashboardData.resumo = resumoVendas;
        dashboardData.despesas = despesas;
        dashboardData.vendas = vendas;
        dashboardData.postes = postes;

        console.log('📊 Dados carregados:', { 
            resumoVendas, 
            despesas: despesas.length, 
            vendas: vendas.length,
            postes: postes.length
        });

        // Calcular lucros no frontend
        const lucrosCalculados = calcularLucros(resumoVendas, despesas);

        // Atualizar interface
        updateResumoCards(lucrosCalculados);
        updateEstatisticas(vendas, postes, despesas);
        
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        throw error;
    } finally {
        showLoading(false);
    }
}

function calcularLucros(resumoVendas, despesas) {
    console.log('🔢 Calculando lucros...');
    
    // Separar despesas por tipo
    const despesasFuncionario = despesas
        .filter(d => d.tipo === 'FUNCIONARIO')
        .reduce((sum, d) => sum + (parseFloat(d.valor) || 0), 0);
        
    const outrasDespesas = despesas
        .filter(d => d.tipo === 'OUTRAS')
        .reduce((sum, d) => sum + (parseFloat(d.valor) || 0), 0);

    // Usar dados do resumo de vendas
    const totalVendaPostes = parseFloat(resumoVendas.totalVendaPostes) || 0;
    const valorTotalVendas = parseFloat(resumoVendas.valorTotalVendas) || 0;
    const totalContribuicoesExtras = parseFloat(resumoVendas.totalContribuicoesExtras) || 0;

    // Cálculo principal
    const lucroVendasNormais = valorTotalVendas - totalVendaPostes;
    const lucroTotal = lucroVendasNormais + totalContribuicoesExtras - outrasDespesas;

    // Distribuição
    const metadeCicero = lucroTotal / 2;
    const metadeGilbertoJefferson = lucroTotal / 2;
    const parteGilbertoJeffersonLiquida = metadeGilbertoJefferson - despesasFuncionario;
    const parteGilberto = parteGilbertoJeffersonLiquida / 2;
    const parteJefferson = parteGilbertoJeffersonLiquida / 2;

    return {
        totalVendaPostes,
        valorTotalVendas,
        totalContribuicoesExtras,
        despesasFuncionario,
        outrasDespesas,
        lucroVendasNormais,
        lucroTotal,
        parteCicero: metadeCicero,
        parteGilberto,
        parteJefferson,
        valorTotalExtras: parseFloat(resumoVendas.valorTotalExtras) || 0,
        totalFreteEletrons: parseFloat(resumoVendas.totalFreteEletrons) || 0,
        totalVendasE: resumoVendas.totalVendasE || 0,
        totalVendasV: resumoVendas.totalVendasV || 0,
        totalVendasL: resumoVendas.totalVendasL || 0
    };
}

// Funções de API
async function apiRequest(endpoint, params = {}) {
    try {
        const url = new URL(`${CONFIG.API_BASE}${endpoint}`);
        
        Object.keys(params).forEach(key => {
            if (params[key] !== null && params[key] !== undefined) {
                url.searchParams.append(key, params[key]);
            }
        });
        
        const response = await fetch(url.toString());
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Erro na requisição ${endpoint}:`, error);
        throw error;
    }
}

async function fetchResumoVendas() {
    const params = {};
    
    if (dashboardData.filters.dataInicio) {
        params.dataInicio = dateToInputValue(dashboardData.filters.dataInicio);
    }
    
    if (dashboardData.filters.dataFim) {
        params.dataFim = dateToInputValue(dashboardData.filters.dataFim);
    }
    
    return await apiRequest('/vendas/resumo', params);
}

async function fetchDespesas() {
    const params = {};
    
    if (dashboardData.filters.dataInicio) {
        params.dataInicio = dateToInputValue(dashboardData.filters.dataInicio);
    }
    
    if (dashboardData.filters.dataFim) {
        params.dataFim = dateToInputValue(dashboardData.filters.dataFim);
    }
    
    return await apiRequest('/despesas', params);
}

async function fetchVendas() {
    const params = {};
    
    if (dashboardData.filters.dataInicio) {
        params.dataInicio = dateToInputValue(dashboardData.filters.dataInicio);
    }
    
    if (dashboardData.filters.dataFim) {
        params.dataFim = dateToInputValue(dashboardData.filters.dataFim);
    }
    
    return await apiRequest('/vendas', params);
}

async function fetchPostes() {
    return await apiRequest('/postes');
}

function updateResumoCards(lucros) {
    console.log('📊 Atualizando cards de resumo...');
    
    const cards = [
        { id: 'total-venda-postes', value: lucros.totalVendaPostes },
        { id: 'valor-total-vendas', value: lucros.valorTotalVendas },
        { id: 'total-contribuicoes-extras', value: lucros.totalContribuicoesExtras },
        { id: 'total-despesas', value: lucros.outrasDespesas },
        { id: 'lucro-total', value: lucros.lucroTotal },
        { id: 'parte-cicero', value: lucros.parteCicero },
        { id: 'parte-gilberto', value: lucros.parteGilberto },
        { id: 'parte-jefferson', value: lucros.parteJefferson }
    ];

    const despesasCards = [
        { id: 'total-outras-despesas-detalhado', value: lucros.outrasDespesas },
        { id: 'total-despesas-funcionario-detalhado', value: lucros.despesasFuncionario },
        { id: 'total-geral-despesas', value: lucros.outrasDespesas + lucros.despesasFuncionario }
    ];

    cards.forEach(card => {
        const element = document.getElementById(card.id);
        if (element) {
            element.textContent = formatCurrency(card.value || 0);
            
            if (card.value < 0) {
                element.style.color = '#dc2626';
            } else if (card.id.includes('lucro') || card.id.includes('parte')) {
                element.style.color = '#059669';
            } else if (card.id.includes('contribuicoes')) {
                element.style.color = '#f59e0b';
            }
        }
    });

    despesasCards.forEach(card => {
        const element = document.getElementById(card.id);
        if (element) {
            element.textContent = formatCurrency(card.value || 0);
            
            if (card.id.includes('funcionario')) {
                element.style.color = '#f59e0b';
            } else if (card.id.includes('outras') || card.id.includes('geral')) {
                element.style.color = '#dc2626';
            }
        }
    });

    const tipoCards = [
        { id: 'total-extras-e', value: lucros.valorTotalExtras },
        { id: 'total-frete-loja', value: lucros.totalFreteEletrons }
    ];

    tipoCards.forEach(card => {
        const element = document.getElementById(card.id);
        if (element) {
            element.textContent = formatCurrency(card.value || 0);
        }
    });
    
    const margemLucro = lucros.valorTotalVendas > 0 ? 
        (lucros.lucroTotal / lucros.valorTotalVendas * 100) : 0;
    const margemElement = document.getElementById('margem-lucro');
    if (margemElement) {
        margemElement.textContent = `${margemLucro.toFixed(1)}%`;
        margemElement.style.color = margemLucro >= 0 ? '#059669' : '#dc2626';
    }
}

function updateEstatisticas(vendas, postes, despesas) {
    console.log('📈 Atualizando estatísticas...');
    
    const vendasE = vendas.filter(v => v.tipoVenda === 'E').length;
    const vendasV = vendas.filter(v => v.tipoVenda === 'V').length;
    const vendasL = vendas.filter(v => v.tipoVenda === 'L').length;
    
    const vendasVList = vendas.filter(v => v.tipoVenda === 'V');
    const ticketMedio = vendasVList.length > 0 ? 
        vendasVList.reduce((sum, v) => sum + (v.valorVenda || 0), 0) / vendasVList.length : 0;
    
    const stats = {
        'total-vendas': vendas.length,
        'total-postes': postes.filter(p => p.ativo).length,
        'total-despesas-count': despesas.length,
        'ticket-medio': ticketMedio
    };

    Object.entries(stats).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            if (id === 'ticket-medio') {
                element.textContent = formatCurrency(value);
            } else {
                element.textContent = value.toString();
            }
        }
    });
    
    const estatisticasTipo = {
        'vendas-tipo-e': vendasE,
        'vendas-tipo-v': vendasV,
        'vendas-tipo-l': vendasL
    };
    
    Object.entries(estatisticasTipo).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value.toString();
        }
    });
}

function mostrarDetalhesCalculo() {
    if (!dashboardData.vendas || !dashboardData.despesas) {
        showAlert('Dados não carregados ainda', 'warning');
        return;
    }

    const lucros = calcularLucros(dashboardData.resumo, dashboardData.despesas);
    
    const { dataInicio, dataFim } = dashboardData.filters;
    let periodoTexto = '';
    
    if (dataInicio && dataFim) {
        if (isSameDay(dataInicio, dataFim)) {
            periodoTexto = `\nPeríodo: ${formatDateBR(dateToInputValue(dataInicio))}\n`;
        } else {
            periodoTexto = `\nPeríodo: ${formatDateBR(dateToInputValue(dataInicio))} até ${formatDateBR(dateToInputValue(dataFim))}\n`;
        }
    } else if (dataInicio) {
        periodoTexto = `\nPeríodo: A partir de ${formatDateBR(dateToInputValue(dataInicio))}\n`;
    } else if (dataFim) {
        periodoTexto = `\nPeríodo: Até ${formatDateBR(dateToInputValue(dataFim))}\n`;
    } else {
        periodoTexto = '\nPeríodo: Todos os dados\n';
    }
    
    const detalhes = `
DETALHES DO CÁLCULO DE LUCROS:${periodoTexto}
1. Vendas Normais (Tipo V):
   - Custo dos postes: ${formatCurrency(lucros.totalVendaPostes)}
   - Valor arrecadado: ${formatCurrency(lucros.valorTotalVendas)}
   - Lucro vendas normais: ${formatCurrency(lucros.lucroVendasNormais)}

2. Contribuições Extras:
   - Tipo E (Extras): ${formatCurrency(lucros.valorTotalExtras)}
   - Tipo L (Frete Loja): ${formatCurrency(lucros.totalFreteEletrons)}
   - Total contribuições: ${formatCurrency(lucros.totalContribuicoesExtras)}

3. Despesas:
   - Outras despesas: ${formatCurrency(lucros.outrasDespesas)}
   - Despesas funcionário: ${formatCurrency(lucros.despesasFuncionario)}

4. Cálculo do Lucro Total:
   - Fórmula: (Lucro V + Contribuições E+L) - APENAS Outras Despesas
   - Lucro total: ${formatCurrency(lucros.lucroTotal)}

5. Distribuição:
   - Parte Cícero (50%): ${formatCurrency(lucros.parteCicero)}
   - Parte G&J antes funcionário: ${formatCurrency(lucros.lucroTotal / 2)}
   - Desconto funcionário: ${formatCurrency(lucros.despesasFuncionario)}
   - Gilberto (25%): ${formatCurrency(lucros.parteGilberto)}
   - Jefferson (25%): ${formatCurrency(lucros.parteJefferson)}

6. Estatísticas do Período:
   - Vendas E: ${lucros.totalVendasE}
   - Vendas V: ${lucros.totalVendasV}
   - Vendas L: ${lucros.totalVendasL}

OBSERVAÇÃO: Despesas de funcionário só afetam a divisão G&J, não o lucro total.
    `;

    alert(detalhes);
}

async function refreshDashboard() {
    console.log('🔄 Atualizando dashboard...');
    
    try {
        await loadDashboardData();
        showAlert('Dashboard atualizado!', 'success');
    } catch (error) {
        console.error('Erro ao atualizar dashboard:', error);
        showAlert('Erro ao atualizar dashboard', 'error');
    }
}

// Utilitários
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

function showLoading(show) {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = show ? 'flex' : 'none';
    }
}

function showAlert(message, type = 'success', duration = 5000) {
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
    
    console.log(`📢 Alerta: ${message} (${type})`);
}

console.log('✅ Dashboard refatorado carregado');