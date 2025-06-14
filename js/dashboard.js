// Dashboard.js - Versão corrigida e completa
let dashboardData = {
    resumo: null,
    despesas: [],
    vendas: [],
    postes: [],
    loading: false
};

// Inicialização da página
window.initDashboardPage = async function() {
    console.log('🎯 Inicializando Dashboard...');
    
    try {
        await loadDashboardData();
        console.log('✅ Dashboard carregado com sucesso');
    } catch (error) {
        console.error('❌ Erro ao carregar dashboard:', error);
        showAlert('Erro ao carregar dados do dashboard', 'error');
    }
};

// Carregar todos os dados do dashboard
async function loadDashboardData() {
    try {
        console.log('📡 Carregando dados do dashboard...');
        
        // Buscar dados em paralelo
        const [resumoBasico, despesas, vendas, postes] = await Promise.all([
            VendaService.getResumo().catch(err => {
                console.warn('Erro ao carregar resumo:', err);
                return {};
            }),
            DespesaService.getAll().catch(err => {
                console.warn('Erro ao carregar despesas:', err);
                return [];
            }),
            VendaService.getAll().catch(err => {
                console.warn('Erro ao carregar vendas:', err);
                return [];
            }),
            PosteService.getAll().catch(err => {
                console.warn('Erro ao carregar postes:', err);
                return [];
            })
        ]);

        dashboardData.resumo = resumoBasico;
        dashboardData.despesas = despesas;
        dashboardData.vendas = vendas;
        dashboardData.postes = postes;

        console.log('📊 Dados carregados:', { 
            resumoBasico, 
            despesas: despesas.length, 
            vendas: vendas.length,
            postes: postes.length
        });

        // CALCULAR LUCROS NO FRONTEND
        const lucrosCalculados = Utils.calcularLucros(resumoBasico, despesas);

        // Atualizar interface
        updateResumoCards(resumoBasico, lucrosCalculados);
        updateEstatisticas(vendas, postes, despesas);
        
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        throw error;
    }
}

// Atualizar cards de resumo
function updateResumoCards(resumoBasico, lucros) {
    console.log('📊 Atualizando cards de resumo...');
    
    // Cards de valores básicos
    const cards = [
        { id: 'total-venda-postes', value: lucros.totalVendaPostes },
        { id: 'valor-total-vendas', value: lucros.valorTotalVendas },
        { id: 'total-contribuicoes-extras', value: lucros.totalContribuicoesExtras },
        { id: 'total-despesas', value: lucros.despesasFuncionario + lucros.outrasDespesas },
        { id: 'lucro-total', value: lucros.lucroTotal },
        { id: 'parte-cicero', value: lucros.parteCicero },
        { id: 'parte-guilherme', value: lucros.parteGuilherme },
        { id: 'parte-jefferson', value: lucros.parteJefferson }
    ];

    cards.forEach(card => {
        const element = document.getElementById(card.id);
        if (element) {
            element.textContent = Utils.formatCurrency(card.value || 0);
            
            // Adicionar cor para valores
            if (card.value < 0) {
                element.style.color = '#dc2626';
            } else if (card.id.includes('lucro') || card.id.includes('parte')) {
                element.style.color = '#059669';
            } else if (card.id.includes('contribuicoes')) {
                element.style.color = '#f59e0b';
            }
        } else {
            console.warn(`Elemento não encontrado: ${card.id}`);
        }
    });

    // Cards específicos por tipo de venda (apenas E e L agora)
    const tipoCards = [
        { id: 'total-extras-e', value: lucros.valorTotalExtras },
        { id: 'total-frete-loja', value: lucros.totalFreteEletrons }
    ];

    tipoCards.forEach(card => {
        const element = document.getElementById(card.id);
        if (element) {
            element.textContent = Utils.formatCurrency(card.value || 0);
        }
    });
    
    // Calcular e mostrar margem de lucro
    const margemLucro = lucros.valorTotalVendas > 0 ? 
        (lucros.lucroTotal / lucros.valorTotalVendas * 100) : 0;
    const margemElement = document.getElementById('margem-lucro');
    if (margemElement) {
        margemElement.textContent = `${margemLucro.toFixed(1)}%`;
        margemElement.style.color = margemLucro >= 0 ? '#059669' : '#dc2626';
    }
    
    console.log('✅ Cards de resumo atualizados');
}

// Atualizar estatísticas
function updateEstatisticas(vendas, postes, despesas) {
    console.log('📈 Atualizando estatísticas...');
    
    // Usar dados do resumo se estiverem disponíveis
    let vendasE, vendasV, vendasL;
    
    if (dashboardData.resumo) {
        vendasE = dashboardData.resumo.totalVendasE || 0;
        vendasV = dashboardData.resumo.totalVendasV || 0;
        vendasL = dashboardData.resumo.totalVendasL || 0;
    } else {
        // Fallback para cálculo manual
        vendasE = vendas.filter(v => v.tipoVenda === 'E').length;
        vendasV = vendas.filter(v => v.tipoVenda === 'V').length;
        vendasL = vendas.filter(v => v.tipoVenda === 'L').length;
    }
    
    // Calcular ticket médio baseado em vendas do tipo V
    const vendasVList = vendas.filter(v => v.tipoVenda === 'V');
    const ticketMedio = vendasVList.length > 0 ? 
        vendasVList.reduce((sum, v) => sum + (v.valorTotalInformado || 0), 0) / vendasVList.length : 0;
    
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
                element.textContent = Utils.formatCurrency(value);
            } else {
                element.textContent = value.toString();
            }
        }
    });
    
    // Atualizar estatísticas específicas por tipo (apenas E, V, L)
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
    
    console.log('✅ Estatísticas atualizadas');
}

// Função para mostrar detalhes do cálculo
window.mostrarDetalhesCalculo = function() {
    if (!dashboardData.resumo || !dashboardData.despesas) {
        showAlert('Dados não carregados ainda', 'warning');
        return;
    }

    const lucros = Utils.calcularLucros(dashboardData.resumo, dashboardData.despesas);
    
    const detalhes = `
DETALHES DO CÁLCULO DE LUCROS:

1. Vendas Normais (Tipo V):
   - Custo dos postes: ${Utils.formatCurrency(lucros.totalVendaPostes)}
   - Valor arrecadado: ${Utils.formatCurrency(lucros.valorTotalVendas)}
   - Lucro vendas normais: ${Utils.formatCurrency(lucros.lucroVendasNormais)}

2. Contribuições Extras:
   - Tipo E (Extras): ${Utils.formatCurrency(lucros.valorTotalExtras)}
   - Tipo L (Frete Loja): ${Utils.formatCurrency(lucros.totalFreteEletrons)}
   - Total contribuições: ${Utils.formatCurrency(lucros.totalContribuicoesExtras)}

3. Despesas:
   - Outras despesas: ${Utils.formatCurrency(lucros.outrasDespesas)}
   - Despesas funcionário: ${Utils.formatCurrency(lucros.despesasFuncionario)}

4. Cálculo Final:
   - Lucro bruto: ${Utils.formatCurrency(lucros.lucroBruto)}
   - Parte Cícero (50%): ${Utils.formatCurrency(lucros.parteCicero)}
   - Parte G&J (50% - desp. func.): ${Utils.formatCurrency(lucros.parteGuilherme + lucros.parteJefferson)}
   - Guilherme (25%): ${Utils.formatCurrency(lucros.parteGuilherme)}
   - Jefferson (25%): ${Utils.formatCurrency(lucros.parteJefferson)}
   - Lucro total: ${Utils.formatCurrency(lucros.lucroTotal)}

LÓGICA ATUALIZADA:
- Tipo E: Contribui diretamente para o lucro
- Tipo V: Valor vendido - Custo do poste (SEM frete)
- Tipo L: Apenas o frete contribui para o lucro (SEM valor de venda)
    `;

    alert(detalhes);
};

// Função para atualizar dados em tempo real
async function updateDashboardRealTime() {
    try {
        console.log('🔄 Atualizando dados em tempo real...');
        
        const [resumoBasico, despesas] = await Promise.all([
            VendaService.getResumo().catch(() => ({})),
            DespesaService.getAll().catch(() => [])
        ]);

        dashboardData.resumo = resumoBasico;
        dashboardData.despesas = despesas;

        const lucrosCalculados = Utils.calcularLucros(resumoBasico, despesas);
        updateResumoCards(resumoBasico, lucrosCalculados);
        
        console.log('✅ Dados atualizados em tempo real');
        
    } catch (error) {
        console.error('❌ Erro ao atualizar dados:', error);
    }
}

// Refresh do dashboard
window.refreshDashboard = async function() {
    console.log('🔄 Atualizando dashboard...');
    
    try {
        showLoading(true);
        await loadDashboardData();
        showAlert('Dashboard atualizado!', 'success');
    } catch (error) {
        console.error('Erro ao atualizar dashboard:', error);
        showAlert('Erro ao atualizar dashboard', 'error');
    } finally {
        showLoading(false);
    }
};

// Função para mostrar loading
function showLoading(show) {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = show ? 'flex' : 'none';
    }
}

// Função de cleanup do dashboard
window.cleanupDashboard = function() {
    console.log('🧹 Limpando dashboard...');
    
    // Limpar timers se houver
    clearAllTimers();
    
    // Reset dos dados
    dashboardData = {
        resumo: null,
        despesas: [],
        vendas: [],
        postes: [],
        loading: false
    };
};

// Limpar todos os timers/intervalos
function clearAllTimers() {
    // Limpar intervalos de 1 a 1000 (garantia)
    for (let i = 1; i <= 1000; i++) {
        clearInterval(i);
        clearTimeout(i);
    }
}

// Função para configurar atualização automática (opcional)
function setupAutoRefresh() {
    // Atualizar a cada 30 segundos
    const autoRefreshInterval = setInterval(() => {
        if (document.visibilityState === 'visible') {
            updateDashboardRealTime();
        }
    }, 30000);
    
    // Salvar o ID do intervalo para poder limpar depois
    dashboardData.autoRefreshInterval = autoRefreshInterval;
    
    // Limpar quando a página perder foco
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden' && dashboardData.autoRefreshInterval) {
            clearInterval(dashboardData.autoRefreshInterval);
        } else if (document.visibilityState === 'visible') {
            setupAutoRefresh();
        }
    });
}

// Função para exportar dados do dashboard
window.exportarDashboard = function() {
    if (!dashboardData.resumo || !dashboardData.despesas) {
        showAlert('Dados não carregados para exportar', 'warning');
        return;
    }
    
    console.log('📊 Exportando dados do dashboard...');
    
    const lucros = Utils.calcularLucros(dashboardData.resumo, dashboardData.despesas);
    
    const dadosExportar = [{
        'Data Exportação': new Date().toLocaleString('pt-BR'),
        'Custo Postes (V)': lucros.totalVendaPostes,
        'Valor Vendas (V)': lucros.valorTotalVendas,
        'Lucro Vendas V': lucros.lucroVendasNormais,
        'Valores Extras (E)': lucros.valorTotalExtras,
        'Frete Loja (L)': lucros.totalFreteEletrons,
        'Total Contribuições': lucros.totalContribuicoesExtras,
        'Outras Despesas': lucros.outrasDespesas,
        'Despesas Funcionário': lucros.despesasFuncionario,
        'Lucro Bruto': lucros.lucroBruto,
        'Lucro Total': lucros.lucroTotal,
        'Parte Cícero': lucros.parteCicero,
        'Parte Guilherme': lucros.parteGuilherme,
        'Parte Jefferson': lucros.parteJefferson
    }];
    
    Utils.exportToCSV(dadosExportar, `dashboard_${new Date().toISOString().split('T')[0]}`);
};

// Função para alternar modo de atualização automática
window.toggleAutoRefresh = function() {
    if (dashboardData.autoRefreshInterval) {
        clearInterval(dashboardData.autoRefreshInterval);
        dashboardData.autoRefreshInterval = null;
        showAlert('Atualização automática desativada', 'success');
    } else {
        setupAutoRefresh();
        showAlert('Atualização automática ativada (30s)', 'success');
    }
};

// Função para resetar dados do dashboard
window.resetDashboard = async function() {
    const confirmed = await Utils.confirm(
        'Tem certeza que deseja recarregar todos os dados do dashboard?',
        'Resetar Dashboard'
    );
    
    if (!confirmed) return;
    
    console.log('🔄 Resetando dashboard...');
    
    try {
        cleanupDashboard();
        await initDashboardPage();
        showAlert('Dashboard resetado com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao resetar dashboard:', error);
        showAlert('Erro ao resetar dashboard', 'error');
    }
};

// Função para verificar se há dados carregados
function hasDataLoaded() {
    return dashboardData.resumo && 
           dashboardData.despesas && 
           dashboardData.vendas && 
           dashboardData.postes;
}

// Função para mostrar estado de loading nos elementos
function showElementLoading(elementId, show = true) {
    const element = document.getElementById(elementId);
    if (element) {
        if (show) {
            element.textContent = '...';
            element.style.color = '#6b7280';
        } else {
            element.style.color = '';
        }
    }
}

// Função para inicializar loading em todos os elementos
function initializeLoadingState() {
    const elementIds = [
        'total-venda-postes', 'valor-total-vendas', 'total-contribuicoes-extras',
        'total-despesas', 'lucro-total', 'parte-cicero', 'parte-guilherme',
        'parte-jefferson', 'total-extras-e', 'total-frete-loja',
        'vendas-tipo-e', 'vendas-tipo-v', 'vendas-tipo-l',
        'total-vendas', 'total-postes', 'total-despesas-count', 'ticket-medio', 'margem-lucro'
    ];
    
    elementIds.forEach(id => showElementLoading(id, true));
}

// Função para tentar recarregar dados em caso de erro
async function retryLoadData() {
    try {
        console.log('🔄 Tentando recarregar dados...');
        await loadDashboardData();
        showAlert('Dados recarregados com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao recarregar dados:', error);
        showAlert('Falha ao recarregar dados. Tente novamente.', 'error');
    }
}

// Função para validar dados antes de calcular
function validateDataBeforeCalculation() {
    if (!dashboardData.resumo) {
        console.warn('⚠️ Resumo não carregado');
        return false;
    }
    
    if (!Array.isArray(dashboardData.despesas)) {
        console.warn('⚠️ Despesas não carregadas');
        return false;
    }
    
    return true;
}

// Função para mostrar estado de erro
function showErrorState(message = 'Erro ao carregar dados') {
    const errorElements = [
        'total-venda-postes', 'valor-total-vendas', 'lucro-total'
    ];
    
    errorElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = 'Erro';
            element.style.color = '#dc2626';
        }
    });
    
    showAlert(message, 'error');
}

// Auto-inicialização opcional
// setupAutoRefresh();

console.log('✅ dashboard.js carregado completamente - versão corrigida');