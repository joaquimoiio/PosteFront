// Dashboard Mobile-First - JavaScript Otimizado para Cold Start do Render.com
const API_BASE = 'https://posteback.onrender.com/api';

// Estado global simplificado
const state = {
    resumo: null,
    despesas: [],
    vendas: [],
    postes: [],
    filters: { dataInicio: null, dataFim: null },
    isFirstRequest: !sessionStorage.getItem('api-connected'),
    requestCache: new Map()
};

// Cache simples com TTL
const cache = {
    data: new Map(),
    ttl: 5 * 60 * 1000, // 5 minutos
    
    set(key, value) {
        this.data.set(key, {
            value,
            timestamp: Date.now()
        });
    },
    
    get(key) {
        const item = this.data.get(key);
        if (!item) return null;
        
        if (Date.now() - item.timestamp > this.ttl) {
            this.data.delete(key);
            return null;
        }
        
        return item.value;
    },
    
    clear() {
        this.data.clear();
    }
};

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎯 Inicializando Dashboard Mobile...');
    
    // Mostrar aviso sobre cold start na primeira visita
    showColdStartWarning();
    
    try {
        configurarFiltrosPadrao();
        await carregarDados();
        console.log('✅ Dashboard carregado');
    } catch (error) {
        console.error('❌ Erro ao carregar:', error);
        showAlert('Erro ao carregar dados. Verifique sua conexão.', 'error');
    }
});

// Aviso sobre cold start
function showColdStartWarning() {
    if (state.isFirstRequest && !sessionStorage.getItem('cold-start-warning-shown')) {
        sessionStorage.setItem('cold-start-warning-shown', 'true');
        showAlert(`
            ℹ️ Primeira conexão pode demorar até 2 minutos devido ao servidor gratuito. 
            Após isso, ficará mais rápido!
        `, 'info', 10000);
    }
}

// Loading inteligente com feedback progressivo
function showIntelligentLoading(isFirstLoad = false) {
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingText = loadingOverlay?.querySelector('p');
    
    if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
        
        if (loadingText && isFirstLoad) {
            loadingText.textContent = 'Iniciando servidor (pode demorar até 2 minutos)...';
            
            // Feedback progressivo
            let seconds = 0;
            const progressInterval = setInterval(() => {
                seconds += 5;
                if (seconds <= 30) {
                    loadingText.textContent = `Iniciando servidor... ${seconds}s`;
                } else if (seconds <= 90) {
                    loadingText.textContent = `Servidor inicializando (demora normal)... ${seconds}s`;
                } else {
                    loadingText.textContent = 'Quase pronto, aguarde mais um pouco...';
                }
            }, 5000);
            
            // Limpar intervalo quando loading sumir
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.target.style.display === 'none') {
                        clearInterval(progressInterval);
                        observer.disconnect();
                    }
                });
            });
            observer.observe(loadingOverlay, { attributes: true, attributeFilter: ['style'] });
        } else if (loadingText) {
            loadingText.textContent = 'Carregando dados...';
        }
    }
}

// Requisição otimizada com retry e timeout inteligente
async function apiRequestOptimized(endpoint, options = {}) {
    const cacheKey = `${endpoint}_${JSON.stringify(options)}`;
    
    // Verificar cache primeiro
    const cachedData = cache.get(cacheKey);
    if (cachedData && !options.skipCache) {
        console.log('📦 Dados do cache:', endpoint);
        return cachedData;
    }
    
    const controller = new AbortController();
    const isFirstRequest = state.isFirstRequest;
    
    // Timeout maior para primeira requisição (cold start)
    const timeoutMs = isFirstRequest ? 120000 : 30000; // 2min vs 30s
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    const maxRetries = 2;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            console.log(`🌐 Tentativa ${attempt + 1}/${maxRetries + 1}: ${endpoint}`, isFirstRequest ? '(COLD START)' : '(WARM)');
            
            const response = await fetch(`${API_BASE}${endpoint}`, {
                ...options,
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    ...options.headers
                }
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            // Marcar como conectado
            if (state.isFirstRequest) {
                state.isFirstRequest = false;
                sessionStorage.setItem('api-connected', 'true');
            }
            
            // Verificar se há conteúdo antes de fazer parse JSON
            if (response.status === 204 || response.status === 205) {
                return null;
            }
            
            const contentLength = response.headers.get('Content-Length');
            if (contentLength === '0') {
                return null;
            }
            
            let data;
            try {
                data = await response.json();
            } catch (jsonError) {
                return null;
            }
            
            // Cachear resultado
            if (data !== null) {
                cache.set(cacheKey, data);
            }
            
            return data;
            
        } catch (error) {
            console.warn(`⚠️ Tentativa ${attempt + 1} falhou:`, error.message);
            
            if (attempt === maxRetries) {
                clearTimeout(timeoutId);
                
                // Mostrar erro específico para cold start
                if (isFirstRequest && error.name === 'AbortError') {
                    showAlert('⏱️ Servidor demorou para responder. Tente novamente em alguns segundos.', 'warning', 8000);
                } else if (error.message.includes('Failed to fetch')) {
                    showAlert('🌐 Sem conexão com a internet ou servidor indisponível.', 'error');
                } else {
                    showAlert('Erro ao conectar: ' + error.message, 'error');
                }
                
                throw error;
            }
            
            // Aguardar antes de tentar novamente (backoff exponencial)
            const delay = Math.min(2000 * Math.pow(2, attempt), 10000);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

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

// Carregamento de dados otimizado
async function carregarDados() {
    try {
        showIntelligentLoading(state.isFirstRequest);
        
        console.log('📊 Carregando dados do dashboard...');
        
        const [resumoVendas, despesas, vendas, postes] = await Promise.all([
            fetchResumoVendas(),
            fetchDespesas(),
            fetchVendas(),
            fetchPostes()
        ]);

        state.resumo = resumoVendas;
        state.despesas = despesas || [];
        state.vendas = vendas || [];
        state.postes = postes || [];

        const lucros = calcularLucros(resumoVendas, despesas || []);
        atualizarInterface(lucros);
        
        console.log('✅ Dados do dashboard carregados');
        
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        
        // Mostrar dados em cache se disponível
        if (state.resumo) {
            console.log('📦 Usando dados em cache');
            const lucros = calcularLucros(state.resumo, state.despesas);
            atualizarInterface(lucros);
            showAlert('Usando dados salvos. Alguns dados podem estar desatualizados.', 'warning');
        }
        
        throw error;
    } finally {
        showLoading(false);
    }
}

// Requisições API otimizadas
async function fetchResumoVendas() {
    const params = new URLSearchParams();
    if (state.filters.dataInicio) {
        params.append('dataInicio', dateToISOString(state.filters.dataInicio));
    }
    if (state.filters.dataFim) {
        params.append('dataFim', dateToISOString(state.filters.dataFim));
    }
    
    const endpoint = params.toString() ? `/vendas/resumo?${params}` : '/vendas/resumo';
    
    try {
        return await apiRequestOptimized(endpoint);
    } catch (error) {
        console.error('Erro ao buscar resumo:', error);
        return {
            totalVendaPostes: 0,
            valorTotalVendas: 0,
            totalFreteEletrons: 0,
            valorTotalExtras: 0,
            totalVendasE: 0,
            totalVendasV: 0,
            totalVendasL: 0
        };
    }
}

async function fetchDespesas() {
    const params = new URLSearchParams();
    if (state.filters.dataInicio) {
        params.append('dataInicio', dateToISOString(state.filters.dataInicio));
    }
    if (state.filters.dataFim) {
        params.append('dataFim', dateToISOString(state.filters.dataFim));
    }
    
    const endpoint = params.toString() ? `/despesas?${params}` : '/despesas';
    
    try {
        return await apiRequestOptimized(endpoint);
    } catch (error) {
        console.error('Erro ao buscar despesas:', error);
        return [];
    }
}

async function fetchVendas() {
    const params = new URLSearchParams();
    if (state.filters.dataInicio) {
        params.append('dataInicio', dateToISOString(state.filters.dataInicio));
    }
    if (state.filters.dataFim) {
        params.append('dataFim', dateToISOString(state.filters.dataFim));
    }
    
    const endpoint = params.toString() ? `/vendas?${params}` : '/vendas';
    
    try {
        return await apiRequestOptimized(endpoint);
    } catch (error) {
        console.error('Erro ao buscar vendas:', error);
        return [];
    }
}

async function fetchPostes() {
    try {
        return await apiRequestOptimized('/postes');
    } catch (error) {
        console.error('Erro ao buscar postes:', error);
        return [];
    }
}

// Cálculos de lucro (mantido igual - fórmula correta)
function calcularLucros(resumoVendas, despesas) {
    if (!resumoVendas || !despesas) {
        return {
            totalVendaPostes: 0,
            valorTotalVendas: 0,
            custoEletronsL: 0,
            despesasFuncionario: 0,
            outrasDespesas: 0,
            lucroTotal: 0,
            parteCicero: 0,
            parteGilberto: 0,
            parteJefferson: 0,
            valorTotalExtras: 0,
            totalFreteEletrons: 0,
            totalVendasE: 0,
            totalVendasV: 0,
            totalVendasL: 0
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

    // Divisão dos lucros
    const metadeCicero = lucroTotal / 2;
    const metadeGilbertoJefferson = lucroTotal / 2;
    
    const parteGilbertoJeffersonLiquida = metadeGilbertoJefferson - despesasFuncionario;
    
    const parteGilberto = parteGilbertoJeffersonLiquida / 2;
    const parteJefferson = parteGilbertoJeffersonLiquida / 2;

    const custoEletronsL = totalVendaPostes - totalFreteEletrons;

    console.log('💰 Cálculo de Lucros:');
    console.log('   Valor Arrecadado (V):', valorTotalVendas);
    console.log('   Extras (E):', valorTotalExtras);
    console.log('   Loja/Frete (L):', totalFreteEletrons);
    console.log('   Outras Despesas:', outrasDespesas);
    console.log('   Custo Eletrons:', totalVendaPostes);
    console.log('   LUCRO TOTAL:', lucroTotal);

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

// Atualização da interface (mantida igual)
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

    console.log('✅ Interface atualizada');
}

// Filtros otimizados
async function applyPeriodFilter() {
    try {
        const filtroInicio = document.getElementById('data-inicio');
        const filtroFim = document.getElementById('data-fim');
        
        if (filtroInicio && filtroFim) {
            state.filters.dataInicio = filtroInicio.value ? 
                new Date(filtroInicio.value + 'T00:00:00') : null;
            state.filters.dataFim = filtroFim.value ? 
                new Date(filtroFim.value + 'T23:59:59') : null;
        }
        
        // Limpar cache para forçar nova requisição
        cache.clear();
        
        await carregarDados();
        showAlert('Filtros aplicados com sucesso!', 'success');
        
    } catch (error) {
        console.error('Erro ao aplicar filtros:', error);
        showAlert('Erro ao aplicar filtros. Tente novamente.', 'error');
    }
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
    try {
        // Limpar cache para forçar nova requisição
        cache.clear();
        
        await carregarDados();
        showAlert('Dashboard atualizado com sucesso!', 'success');
        
    } catch (error) {
        console.error('Erro ao atualizar dashboard:', error);
        showAlert('Erro ao atualizar. Verifique sua conexão.', 'error');
    }
}

// Utilitários (mantidos iguais)
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

console.log('✅ Dashboard Mobile-First carregado com otimizações para cold start');