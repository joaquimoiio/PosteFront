// Relatórios JavaScript - VENDAS POR POSTE COM CUSTO ELETRONS
const CONFIG = {
    API_BASE: 'http://localhost:8080/api'
};

// Estado global
let relatoriosData = {
    vendas: [],
    postes: [],
    relatorio: [],
    filtros: {
        dataInicio: null,
        dataFim: null,
        tipoVenda: ''
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
    console.log('🎯 Inicializando página de Relatórios...');
    
    configurarLocaleBrasileiro();
    setupEventListeners();
    setDefaultDates();
    
    try {
        await loadPostes();
        console.log('✅ Página de Relatórios carregada com sucesso');
    } catch (error) {
        console.error('❌ Erro ao carregar página de Relatórios:', error);
        showAlert('Erro ao carregar dados para relatórios', 'error');
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

function setupEventListeners() {
    const filtroDataInicio = document.getElementById('filtro-data-inicio');
    const filtroDataFim = document.getElementById('filtro-data-fim');
    
    if (filtroDataInicio && filtroDataFim) {
        filtroDataInicio.addEventListener('change', updatePeriodIndicator);
        filtroDataFim.addEventListener('change', updatePeriodIndicator);
    }
}

function setDefaultDates() {
    const hoje = new Date();
    const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    
    const filtroDataInicio = document.getElementById('filtro-data-inicio');
    const filtroDataFim = document.getElementById('filtro-data-fim');
    
    if (filtroDataInicio && filtroDataFim) {
        filtroDataInicio.value = dateToInputValue(primeiroDiaMes);
        filtroDataFim.value = dateToInputValue(hoje);
        updatePeriodIndicator();
    }
}

function updatePeriodIndicator() {
    const filtroDataInicio = document.getElementById('filtro-data-inicio');
    const filtroDataFim = document.getElementById('filtro-data-fim');
    const periodoInfo = document.getElementById('periodo-info');
    const periodoTexto = document.getElementById('periodo-texto');
    
    if (!filtroDataInicio || !filtroDataFim || !periodoInfo || !periodoTexto) return;
    
    const dataInicio = filtroDataInicio.value;
    const dataFim = filtroDataFim.value;
    
    if (dataInicio && dataFim) {
        const inicio = formatDateBR(dataInicio);
        const fim = formatDateBR(dataFim);
        
        if (dataInicio === dataFim) {
            periodoTexto.textContent = `Relatório para ${inicio}`;
        } else {
            periodoTexto.textContent = `Relatório de ${inicio} até ${fim}`;
        }
        
        periodoInfo.style.display = 'block';
    } else {
        periodoInfo.style.display = 'none';
    }
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
        
        console.log('🌐 Requisição API:', url.toString());
        
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

async function loadPostes() {
    try {
        const postes = await apiRequest('/postes');
        relatoriosData.postes = postes;
        console.log(`📦 ${postes.length} postes carregados`);
    } catch (error) {
        console.error('Erro ao carregar postes:', error);
        showAlert('Erro ao carregar lista de postes', 'warning');
    }
}

async function loadVendas() {
    try {
        showLoading(true);
        
        const filtroDataInicio = document.getElementById('filtro-data-inicio');
        const filtroDataFim = document.getElementById('filtro-data-fim');
        
        const params = {};
        if (filtroDataInicio.value) {
            params.dataInicio = filtroDataInicio.value;
        }
        if (filtroDataFim.value) {
            params.dataFim = filtroDataFim.value;
        }
        
        const vendas = await apiRequest('/vendas', params);
        relatoriosData.vendas = vendas;
        
        console.log(`📊 ${vendas.length} vendas carregadas para o período`);
        return vendas;
        
    } catch (error) {
        console.error('Erro ao carregar vendas:', error);
        throw error;
    } finally {
        showLoading(false);
    }
}

async function gerarRelatorio() {
    try {
        const filtroDataInicio = document.getElementById('filtro-data-inicio');
        const filtroDataFim = document.getElementById('filtro-data-fim');
        const filtroTipoVenda = document.getElementById('filtro-tipo-venda');
        
        if (!filtroDataInicio.value || !filtroDataFim.value) {
            showAlert('Selecione o período para gerar o relatório', 'warning');
            return;
        }
        
        // Validar datas
        const dataInicio = new Date(filtroDataInicio.value);
        const dataFim = new Date(filtroDataFim.value);
        
        if (dataInicio > dataFim) {
            showAlert('Data de início deve ser anterior à data fim', 'warning');
            return;
        }
        
        showLoading(true);
        
        // Carregar vendas do período
        const vendas = await loadVendas();
        
        // Filtrar por tipo de venda se especificado
        let vendasFiltradas = vendas;
        if (filtroTipoVenda.value) {
            vendasFiltradas = vendas.filter(v => v.tipoVenda === filtroTipoVenda.value);
        }
        
        // Filtrar apenas vendas que têm postes (V e L)
        const vendasComPostes = vendasFiltradas.filter(v => 
            (v.tipoVenda === 'V' || v.tipoVenda === 'L') && v.posteId
        );
        
        // Gerar relatório por poste
        const relatorioPorPoste = gerarRelatorioPorPoste(vendasComPostes);
        
        // Atualizar interface
        displayResumo(vendasComPostes, relatorioPorPoste);
        displayRelatorio(relatorioPorPoste);
        generateCharts(relatorioPorPoste);
        
        // Mostrar seções
        document.getElementById('resumo-section').style.display = 'block';
        document.getElementById('relatorio-section').style.display = 'block';
        document.getElementById('graficos-section').style.display = 'block';
        
        showAlert('Relatório gerado com sucesso!', 'success');
        
    } catch (error) {
        console.error('Erro ao gerar relatório:', error);
        showAlert('Erro ao gerar relatório', 'error');
    } finally {
        showLoading(false);
    }
}

function gerarRelatorioPorPoste(vendas) {
    console.log('📊 Gerando relatório com todos os postes...');
    
    // Primeiro, criar entrada para TODOS os postes cadastrados
    const relatorioPorPoste = {};
    
    // Inicializar todos os postes com valores zerados
    relatoriosData.postes.forEach(poste => {
        if (poste.ativo) { // Considerar apenas postes ativos
            relatorioPorPoste[poste.id] = {
                posteId: poste.id,
                codigoPoste: poste.codigo,
                descricaoPoste: poste.descricao,
                quantidadeTotal: 0,
                valorTotal: 0,
                numeroVendas: 0,
                precoUnitario: parseFloat(poste.preco),
                custoEletrons: 0 // Nova propriedade para custo Eletrons
            };
        }
    });
    
    // Agora processar as vendas existentes
    vendas.forEach(venda => {
        const posteId = venda.posteId;
        
        // Se o poste existe no relatório (postes ativos)
        if (relatorioPorPoste[posteId]) {
            const item = relatorioPorPoste[posteId];
            const quantidade = venda.quantidade || 1;
            
            item.quantidadeTotal += quantidade;
            item.numeroVendas++;
            
            // Para venda tipo V, somar o valor de venda
            if (venda.tipoVenda === 'V' && venda.valorVenda) {
                item.valorTotal += parseFloat(venda.valorVenda);
            }
        }
    });
    
    // Converter para array e calcular custo Eletrons
    const relatorio = Object.values(relatorioPorPoste);
    
    // Calcular custo Eletrons para cada item (Preço Unitário × Quantidade Vendida)
    relatorio.forEach(item => {
        item.custoEletrons = item.precoUnitario * item.quantidadeTotal;
    });
    
    // Ordenar: primeiro os com vendas (por quantidade), depois os sem vendas (por código)
    relatorio.sort((a, b) => {
        // Se ambos têm vendas, ordenar por quantidade (decrescente)
        if (a.quantidadeTotal > 0 && b.quantidadeTotal > 0) {
            return b.quantidadeTotal - a.quantidadeTotal;
        }
        // Se apenas um tem vendas, ele vem primeiro
        if (a.quantidadeTotal > 0) return -1;
        if (b.quantidadeTotal > 0) return 1;
        // Se nenhum tem vendas, ordenar por código
        return a.codigoPoste.localeCompare(b.codigoPoste);
    });
    
    // Calcular percentuais e ranking
    const quantidadeTotal = relatorio.reduce((sum, item) => sum + item.quantidadeTotal, 0);
    let rankingAtual = 1;
    
    relatorio.forEach((item, index) => {
        // Apenas postes com vendas recebem ranking
        if (item.quantidadeTotal > 0) {
            item.ranking = rankingAtual;
            // Se o próximo item tem quantidade diferente, atualizar ranking
            if (index + 1 < relatorio.length && 
                relatorio[index + 1].quantidadeTotal !== item.quantidadeTotal) {
                rankingAtual = index + 2;
            }
        } else {
            item.ranking = null; // Sem ranking para postes sem vendas
        }
        
        item.percentualDoTotal = quantidadeTotal > 0 ? 
            ((item.quantidadeTotal / quantidadeTotal) * 100) : 0;
    });
    
    console.log(`📊 Relatório gerado com ${relatorio.length} postes (${relatorio.filter(r => r.quantidadeTotal > 0).length} com vendas)`);
    
    relatoriosData.relatorio = relatorio;
    return relatorio;
}

function displayResumo(vendas, relatorio) {
    const tiposPostesComVenda = relatorio.filter(item => item.quantidadeTotal > 0).length;
    const tiposPostesCadastrados = relatorio.length;
    const totalVendas = vendas.length;
    const quantidadeTotalPostes = relatorio.reduce((sum, item) => sum + item.quantidadeTotal, 0);
    const valorTotalPeriodo = relatorio.reduce((sum, item) => sum + item.valorTotal, 0);
    
    // Atualizar cards de resumo
    const elements = {
        'total-tipos-postes': `${tiposPostesComVenda}/${tiposPostesCadastrados}`,
        'total-vendas-periodo': totalVendas.toString(),
        'quantidade-total-postes': quantidadeTotalPostes.toString(),
        'valor-total-periodo': formatCurrency(valorTotalPeriodo)
    };
    
    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    });
    
    // Atualizar nota do card de tipos de postes
    const tiposPostesCard = document.querySelector('#total-tipos-postes').closest('.summary-card');
    if (tiposPostesCard) {
        const cardNote = tiposPostesCard.querySelector('.card-note');
        if (cardNote) {
            cardNote.textContent = `${tiposPostesComVenda} com vendas de ${tiposPostesCadastrados} cadastrados`;
        }
    }
}

function displayRelatorio(relatorio) {
    const tbody = document.getElementById('relatorio-tbody');
    if (!tbody) return;
    
    if (!relatorio || relatorio.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-table">
                    <div class="empty-state">
                        <div class="empty-icon">📊</div>
                        <h3>Nenhum poste encontrado</h3>
                        <p>Nenhum poste cadastrado no sistema.</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = '';
    
    relatorio.forEach(item => {
        const row = document.createElement('tr');
        
        // Aplicar estilo diferente para postes sem vendas
        if (item.quantidadeTotal === 0) {
            row.style.opacity = '0.6';
            row.style.backgroundColor = '#f8f9fa';
        }
        
        row.innerHTML = `
            <td data-label="Código">
                <strong>${item.codigoPoste || 'N/A'}</strong>
            </td>
            <td data-label="Descrição">
                <div style="max-width: 300px; overflow: hidden; text-overflow: ellipsis;" 
                     title="${item.descricaoPoste || 'Descrição não disponível'}">
                    ${item.descricaoPoste || 'Descrição não disponível'}
                </div>
            </td>
            <td class="currency" data-label="Preço">${formatCurrency(item.precoUnitario)}</td>
            <td class="quantity" data-label="Quantidade">
                ${item.quantidadeTotal === 0 ? 
                    '<span style="color: #6b7280;">0</span>' : 
                    `<strong>${item.quantidadeTotal}</strong>`}
            </td>
            <td class="currency" data-label="Custo Eletrons">
                ${item.custoEletrons === 0 ? 
                    '<span style="color: #6b7280;">R$ 0,00</span>' : 
                    `<strong style="color: #dc2626;">${formatCurrency(item.custoEletrons)}</strong>`}
            </td>
            <td class="currency" data-label="Valor Total">
                ${item.valorTotal === 0 ? 
                    '<span style="color: #6b7280;">R$ 0,00</span>' : 
                    formatCurrency(item.valorTotal)}
            </td>
            <td class="percentage" data-label="% do Total">
                ${item.percentualDoTotal === 0 ? 
                    '<span style="color: #6b7280;">0,0%</span>' : 
                    `${item.percentualDoTotal.toFixed(1)}%`}
            </td>
            <td class="ranking" data-label="Ranking">
                ${item.ranking ? getRankingBadge(item.ranking) : 
                    '<span style="color: #6b7280; font-size: 0.75rem;">Sem vendas</span>'}
            </td>
        `;
        tbody.appendChild(row);
    });
    
    console.log(`📊 Tabela atualizada com ${relatorio.length} postes`);
}

function getRankingBadge(ranking) {
    let badgeClass = 'ranking-default';
    let icon = '📊';
    
    if (ranking === 1) {
        badgeClass = 'ranking-1';
        icon = '🥇';
    } else if (ranking === 2) {
        badgeClass = 'ranking-2';
        icon = '🥈';
    } else if (ranking === 3) {
        badgeClass = 'ranking-3';
        icon = '🥉';
    }
    
    return `<span class="ranking-badge ${badgeClass}">${icon} ${ranking}º</span>`;
}

function generateCharts(relatorio) {
    // Separar postes com vendas para os gráficos
    const postesComVendas = relatorio.filter(item => item.quantidadeTotal > 0);
    
    const topPostesChart = document.getElementById('top-postes-chart');
    const faixaPrecoChart = document.getElementById('faixa-preco-chart');
    
    if (topPostesChart) {
        const top10 = postesComVendas.slice(0, 10);
        
        if (top10.length > 0) {
            const chartHTML = `
                <div style="padding: 20px;">
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        ${top10.map((item, index) => `
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <span style="min-width: 30px; font-weight: bold;">${index + 1}º</span>
                                <div style="flex: 1; background: #f1f5f9; border-radius: 4px; height: 24px; position: relative;">
                                    <div style="background: #3b82f6; height: 100%; border-radius: 4px; width: ${(item.quantidadeTotal / top10[0].quantidadeTotal) * 100}%;"></div>
                                    <span style="position: absolute; left: 8px; top: 50%; transform: translateY(-50%); font-size: 12px; font-weight: 500;">
                                        ${item.codigoPoste} - ${item.quantidadeTotal} unidades
                                    </span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    ${postesComVendas.length > 10 ? 
                        `<div style="text-align: center; margin-top: 15px; font-size: 12px; color: #6b7280;">
                            +${postesComVendas.length - 10} outros postes com vendas
                        </div>` : ''}
                </div>
            `;
            topPostesChart.innerHTML = chartHTML;
        } else {
            topPostesChart.innerHTML = `
                <div class="chart-placeholder">
                    <span class="chart-icon">📊</span>
                    <p>Nenhuma venda no período selecionado</p>
                </div>
            `;
        }
    }
    
    if (faixaPrecoChart) {
        const faixas = analisarFaixasPreco(postesComVendas);
        
        if (Object.keys(faixas).length > 0) {
            const chartHTML = `
                <div style="padding: 20px;">
                    <div style="display: flex; flex-direction: column; gap: 15px;">
                        ${Object.entries(faixas).map(([faixa, dados]) => `
                            <div>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                    <span style="font-weight: 500;">${faixa}</span>
                                    <span style="font-size: 12px; color: #6b7280;">${dados.quantidade} unidades</span>
                                </div>
                                <div style="background: #f1f5f9; border-radius: 4px; height: 20px; position: relative;">
                                    <div style="background: #059669; height: 100%; border-radius: 4px; width: ${dados.percentual}%;"></div>
                                </div>
                                <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">
                                    ${dados.percentual.toFixed(1)}% do total vendido
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
            faixaPrecoChart.innerHTML = chartHTML;
        } else {
            faixaPrecoChart.innerHTML = `
                <div class="chart-placeholder">
                    <span class="chart-icon">📊</span>
                    <p>Nenhuma venda para analisar</p>
                </div>
            `;
        }
    }
}

function analisarFaixasPreco(relatorio) {
    const faixas = {
        'Até R$ 300': { quantidade: 0, percentual: 0 },
        'R$ 301 - R$ 500': { quantidade: 0, percentual: 0 },
        'R$ 501 - R$ 700': { quantidade: 0, percentual: 0 },
        'R$ 701 - R$ 900': { quantidade: 0, percentual: 0 },
        'Acima de R$ 900': { quantidade: 0, percentual: 0 }
    };
    
    const totalQuantidade = relatorio.reduce((sum, item) => sum + item.quantidadeTotal, 0);
    
    relatorio.forEach(item => {
        const preco = item.precoUnitario;
        
        if (preco <= 300) {
            faixas['Até R$ 300'].quantidade += item.quantidadeTotal;
        } else if (preco <= 500) {
            faixas['R$ 301 - R$ 500'].quantidade += item.quantidadeTotal;
        } else if (preco <= 700) {
            faixas['R$ 501 - R$ 700'].quantidade += item.quantidadeTotal;
        } else if (preco <= 900) {
            faixas['R$ 701 - R$ 900'].quantidade += item.quantidadeTotal;
        } else {
            faixas['Acima de R$ 900'].quantidade += item.quantidadeTotal;
        }
    });
    
    // Calcular percentuais
    Object.keys(faixas).forEach(faixa => {
        faixas[faixa].percentual = totalQuantidade > 0 ? 
            (faixas[faixa].quantidade / totalQuantidade) * 100 : 0;
    });
    
    // Remover faixas vazias
    Object.keys(faixas).forEach(faixa => {
        if (faixas[faixa].quantidade === 0) {
            delete faixas[faixa];
        }
    });
    
    return faixas;
}

function exportarRelatorio() {
    if (!relatoriosData.relatorio || relatoriosData.relatorio.length === 0) {
        showAlert('Nenhum relatório para exportar', 'warning');
        return;
    }
    
    const filtroDataInicio = document.getElementById('filtro-data-inicio');
    const filtroDataFim = document.getElementById('filtro-data-fim');
    
    const periodo = `${formatDateBR(filtroDataInicio.value)}_a_${formatDateBR(filtroDataFim.value)}`;
    
    const dadosExportar = relatoriosData.relatorio.map(item => ({
        'Ranking': item.ranking || 'Sem vendas',
        'Código': item.codigoPoste || 'N/A',
        'Descrição': item.descricaoPoste || 'Descrição não disponível',
        'Preço Unitário': item.precoUnitario,
        'Quantidade Vendida': item.quantidadeTotal,
        'Custo Eletrons': item.custoEletrons,
        'Valor Total': item.valorTotal,
        'Percentual do Total': `${item.percentualDoTotal.toFixed(1)}%`,
        'Número de Vendas': item.numeroVendas,
        'Status': item.quantidadeTotal > 0 ? 'Com vendas' : 'Sem vendas'
    }));
    
    exportToCSV(dadosExportar, `relatorio_completo_postes_${periodo}`);
}

function imprimirRelatorio() {
    window.print();
}

function limparFiltros() {
    document.getElementById('filtro-data-inicio').value = '';
    document.getElementById('filtro-data-fim').value = '';
    document.getElementById('filtro-tipo-venda').value = '';
    
    document.getElementById('periodo-info').style.display = 'none';
    document.getElementById('resumo-section').style.display = 'none';
    document.getElementById('relatorio-section').style.display = 'none';
    document.getElementById('graficos-section').style.display = 'none';
    
    showAlert('Filtros limpos', 'success');
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

console.log('✅ Relatórios com Custo Eletrons carregado');