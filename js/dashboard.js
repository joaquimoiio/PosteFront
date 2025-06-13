// JavaScript do Dashboard
let dashboardData = {
    resumo: null,
    estatisticas: null
};

// Função de inicialização da página
window.initDashboardPage = async function() {
    console.log('🎯 Inicializando Dashboard...');
    
    try {
        await loadDashboard();
        await loadEstatisticas();
        console.log('✅ Dashboard carregado com sucesso');
    } catch (error) {
        console.error('❌ Erro ao carregar dashboard:', error);
        showAlert('Erro ao carregar dados do dashboard', 'error');
    }
};

// Carregar dados do dashboard
async function loadDashboard() {
    const resumoLoading = document.getElementById('resumo-loading');
    const resumoContent = document.getElementById('resumo-content');
    const lucroContent = document.getElementById('lucro-content');
    
    if (!resumoLoading || !resumoContent || !lucroContent) {
        console.warn('Elementos do dashboard não encontrados');
        return;
    }
    
    try {
        resumoLoading.style.display = 'flex';
        resumoContent.style.display = 'none';
        lucroContent.style.display = 'none';
        
        // Buscar resumo das vendas
        const resumo = await VendaService.getResumo();
        dashboardData.resumo = resumo;
        
        // Atualizar interface
        updateResumoCards(resumo);
        updateLucroCards(resumo);
        
        // Mostrar conteúdo
        resumoLoading.style.display = 'none';
        resumoContent.style.display = 'grid';
        lucroContent.style.display = 'grid';
        
    } catch (error) {
        console.error('Erro ao carregar resumo:', error);
        resumoLoading.innerHTML = `
            <div style="text-align: center; color: #dc2626;">
                ❌ Erro ao carregar dados<br>
                <button class="btn btn-secondary btn-small" onclick="loadDashboard()" style="margin-top: 10px;">
                    Tentar Novamente
                </button>
            </div>
        `;
        throw error;
    }
}

// Atualizar cards do resumo
function updateResumoCards(resumo) {
    const elements = {
        'total-venda-postes': resumo.totalVendaPostes,
        'total-frete': resumo.totalFreteEletrons,
        'total-comissao': resumo.totalComissao,
        'valor-total-informado': resumo.valorTotalInformado,
        'despesas-funcionario': resumo.despesasFuncionario,
        'outras-despesas': resumo.outrasDespesas
    };
    
    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = Utils.formatCurrency(value);
            
            // Animação de contagem
            animateValue(element, 0, value || 0, 1000);
        }
    });
}

// Atualizar cards do lucro
function updateLucroCards(resumo) {
    const elements = {
        'lucro-total': resumo.lucro,
        'parte-cicero': resumo.parteCicero,
        'parte-guilherme': resumo.parteGuilherme,
        'parte-jefferson': resumo.parteJefferson
    };
    
    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = Utils.formatCurrency(value);
            
            // Cor baseada no valor
            const card = element.closest('.profit-card');
            if (card && value < 0) {
                card.style.borderColor = '#dc2626';
                element.style.color = '#dc2626';
            } else if (card) {
                card.style.borderColor = '#059669';
                element.style.color = '#059669';
            }
            
            // Animação de contagem
            animateValue(element, 0, value || 0, 1000);
        }
    });
}

// Carregar estatísticas
async function loadEstatisticas() {
    try {
        // Carregar dados paralelos
        const [vendas, postes, despesas, itens] = await Promise.all([
            VendaService.getAll().catch(() => []),
            PosteService.getAll().catch(() => []),
            DespesaService.getAll().catch(() => []),
            ItemVendaService.getAll().catch(() => [])
        ]);
        
        // Calcular estatísticas
        const estatisticas = {
            totalVendas: vendas.length,
            totalItensVendidos: itens.reduce((sum, item) => sum + (item.quantidade || 0), 0),
            totalPostesCadastrados: postes.filter(p => p.ativo).length,
            totalDespesasPeriodo: despesas.length
        };
        
        dashboardData.estatisticas = estatisticas;
        
        // Atualizar interface
        updateEstatisticasCards(estatisticas);
        
    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
        // Não falha silenciosamente, mas não quebra o dashboard
    }
}

// Atualizar cards de estatísticas
function updateEstatisticasCards(stats) {
    const elements = {
        'total-vendas': stats.totalVendas,
        'total-itens-vendidos': stats.totalItensVendidos,
        'total-postes-cadastrados': stats.totalPostesCadastrados,
        'total-despesas-periodo': stats.totalDespesasPeriodo
    };
    
    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            // Animação de contagem
            animateValue(element, 0, value || 0, 1500, false);
        }
    });
}

// Função para animar valores
function animateValue(element, start, end, duration, isCurrency = true) {
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const currentValue = start + (end - start) * easeOutQuart;
        
        if (isCurrency) {
            element.textContent = Utils.formatCurrency(currentValue);
        } else {
            element.textContent = Math.round(currentValue).toLocaleString('pt-BR');
        }
        
        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            // Garantir valor final exato
            if (isCurrency) {
                element.textContent = Utils.formatCurrency(end);
            } else {
                element.textContent = Math.round(end).toLocaleString('pt-BR');
            }
        }
    }
    
    requestAnimationFrame(update);
}

// Refresh do dashboard
window.refreshDashboard = async function() {
    console.log('🔄 Atualizando dashboard...');
    
    try {
        await loadDashboard();
        await loadEstatisticas();
        showAlert('Dashboard atualizado com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao atualizar dashboard:', error);
        showAlert('Erro ao atualizar dashboard', 'error');
    }
};

// Exportar relatório
window.exportarRelatorio = async function() {
    console.log('📊 Exportando relatório...');
    
    try {
        if (!dashboardData.resumo) {
            await loadDashboard();
        }
        
        const resumo = dashboardData.resumo;
        const dataAtual = new Date().toLocaleString('pt-BR');
        
        const relatorio = {
            'Data do Relatório': dataAtual,
            'Total Venda Postes': Utils.formatCurrency(resumo.totalVendaPostes),
            'Total Frete Eletrons': Utils.formatCurrency(resumo.totalFreteEletrons),
            'Total Comissão': Utils.formatCurrency(resumo.totalComissao),
            'Valor Total Informado': Utils.formatCurrency(resumo.valorTotalInformado),
            'Despesas Funcionário': Utils.formatCurrency(resumo.despesasFuncionario),
            'Outras Despesas': Utils.formatCurrency(resumo.outrasDespesas),
            'Total Despesas': Utils.formatCurrency(resumo.totalDespesas),
            'Lucro Total': Utils.formatCurrency(resumo.lucro),
            'Parte Cícero': Utils.formatCurrency(resumo.parteCicero),
            'Parte Guilherme': Utils.formatCurrency(resumo.parteGuilherme),
            'Parte Jefferson': Utils.formatCurrency(resumo.parteJefferson)
        };
        
        // Converter para array para CSV
        const csvData = [relatorio];
        
        // Exportar
        Utils.exportToCSV(csvData, `relatorio_vendas_${new Date().toISOString().split('T')[0]}`);
        
    } catch (error) {
        console.error('Erro ao exportar relatório:', error);
        showAlert('Erro ao exportar relatório', 'error');
    }
};

// Auto-refresh do dashboard a cada 5 minutos
let dashboardInterval;

function startDashboardAutoRefresh() {
    // Limpar interval anterior se existir
    if (dashboardInterval) {
        clearInterval(dashboardInterval);
    }
    
    // Configurar novo interval
    dashboardInterval = setInterval(async () => {
        try {
            await loadDashboard();
            console.log('🔄 Dashboard atualizado automaticamente');
        } catch (error) {
            console.warn('Erro no auto-refresh do dashboard:', error);
        }
    }, 5 * 60 * 1000); // 5 minutos
}

function stopDashboardAutoRefresh() {
    if (dashboardInterval) {
        clearInterval(dashboardInterval);
        dashboardInterval = null;
    }
}

// Iniciar auto-refresh quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.hash === '#dashboard' || AppState.currentPage === 'dashboard') {
        startDashboardAutoRefresh();
    }
});

// Parar auto-refresh quando sair da página
window.addEventListener('beforeunload', () => {
    stopDashboardAutoRefresh();
});

// Função para detectar mudança de página e controlar auto-refresh
const originalNavigateTo = window.navigationManager?.navigateTo;
if (originalNavigateTo) {
    window.navigationManager.navigateTo = function(page, addToHistory) {
        if (page === 'dashboard') {
            startDashboardAutoRefresh();
        } else {
            stopDashboardAutoRefresh();
        }
        return originalNavigateTo.call(this, page, addToHistory);
    };
}

// Funções de utilidade para o dashboard
const DashboardUtils = {
    // Calcular variação percentual
    calculatePercentageChange(current, previous) {
        if (!previous || previous === 0) return 0;
        return ((current - previous) / previous) * 100;
    },
    
    // Formatar variação
    formatVariation(variation) {
        const symbol = variation >= 0 ? '+' : '';
        const color = variation >= 0 ? '#059669' : '#dc2626';
        return `<span style="color: ${color};">${symbol}${variation.toFixed(1)}%</span>`;
    },
    
    // Obter status do lucro
    getLucroStatus(lucro) {
        if (lucro > 0) return { status: 'positivo', icon: '📈', color: '#059669' };
        if (lucro < 0) return { status: 'negativo', icon: '📉', color: '#dc2626' };
        return { status: 'neutro', icon: '➖', color: '#6b7280' };
    }
};

// Exportar funções para uso global
window.DashboardUtils = DashboardUtils;