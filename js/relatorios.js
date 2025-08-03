// ================================
// RELATÓRIOS CAMINHÃO VERMELHO - OTIMIZADO
// ================================

class RelatoriosVermelho {
    constructor() {
        this.data = { vendas: [], postes: [], filtros: {} };
        this.init();
    }

    async init() {
        if (!this.validateAuth()) return;
        
        this.setupEvents();
        this.setDefaultPeriod();
        await this.loadPostes();
        
        console.log('✅ Relatórios Vermelho carregado');
    }

    validateAuth() {
        const userType = localStorage.getItem('poste-system-user-type');
        if (userType !== 'vermelho') {
            window.location.href = 'index.html';
            return false;
        }
        return true;
    }

    setupEvents() {
        document.getElementById('relatorio-form').addEventListener('submit', (e) => this.handleSubmit(e));
    }

    setDefaultPeriod() {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        
        document.getElementById('data-inicio').value = window.AppUtils.dateToInputValue(firstDay);
        document.getElementById('data-fim').value = window.AppUtils.dateToInputValue(today);
    }

    async loadPostes() {
        try {
            this.data.postes = await window.AppUtils.apiRequest('/postes') || [];
        } catch (error) {
            console.error('Erro ao carregar postes:', error);
            this.data.postes = [];
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        const filtros = {
            dataInicio: document.getElementById('data-inicio').value,
            dataFim: document.getElementById('data-fim').value,
            tipoVenda: document.getElementById('tipo-venda').value
        };

        if (!this.validateFilters(filtros)) return;
        
        this.data.filtros = filtros;
        await this.gerarRelatorio();
    }

    validateFilters(filtros) {
        if (!filtros.dataInicio || !filtros.dataFim) {
            window.AppUtils.showAlert('Datas são obrigatórias', 'warning');
            return false;
        }
        
        if (new Date(filtros.dataInicio) > new Date(filtros.dataFim)) {
            window.AppUtils.showAlert('Data início não pode ser maior que data fim', 'warning');
            return false;
        }
        
        return true;
    }

    async gerarRelatorio() {
        try {
            window.AppUtils.showLoading(true);
            
            // Buscar vendas
            const params = new URLSearchParams();
            if (this.data.filtros.dataInicio) params.append('dataInicio', this.data.filtros.dataInicio);
            if (this.data.filtros.dataFim) params.append('dataFim', this.data.filtros.dataFim);
            
            this.data.vendas = await window.AppUtils.apiRequest(`/vendas?${params}`) || [];
            
            this.updatePeriodoInfo();
            this.processarRelatorios();
            
            window.AppUtils.showAlert('Relatório gerado!', 'success');
            
        } catch (error) {
            console.error('Erro:', error);
            window.AppUtils.showAlert('Erro ao gerar relatório', 'error');
        } finally {
            window.AppUtils.showLoading(false);
        }
    }

    processarRelatorios() {
        const { tipoVenda } = this.data.filtros;
        
        this.hideAllSections();
        
        if (!tipoVenda || tipoVenda === 'V') this.processarVendasNormais();
        if (!tipoVenda || tipoVenda === 'E') this.processarVendasExtras();
        if (!tipoVenda || tipoVenda === 'L') this.processarVendasLoja();
    }

    processarVendasNormais() {
        const vendas = this.data.vendas.filter(v => v.tipoVenda === 'V');
        if (!vendas.length) return;

        // Agrupar por poste
        const agrupadas = this.agruparPorPoste(vendas);
        const relatorio = this.calcularLucros(agrupadas);
        const resumo = this.calcularResumo(relatorio);

        this.renderResumoVendas(resumo);
        this.renderDetalhesVendas(relatorio);
        this.showSection('resumo-vendas');
        this.showSection('detalhes-vendas');
    }

    processarVendasExtras() {
        const vendas = this.data.vendas.filter(v => v.tipoVenda === 'E');
        if (!vendas.length) return;

        const resumo = {
            total: vendas.length,
            quantidade: vendas.reduce((sum, v) => sum + (v.quantidade || 1), 0),
            valor: vendas.reduce((sum, v) => sum + (v.valorExtra || 0), 0)
        };

        this.renderResumoExtras(resumo);
        this.renderListaExtras(vendas.sort((a, b) => new Date(b.dataVenda) - new Date(a.dataVenda)));
        this.showSection('resumo-extras');
        this.showSection('detalhes-extras');
    }

    processarVendasLoja() {
        const vendas = this.data.vendas.filter(v => v.tipoVenda === 'L');
        if (!vendas.length) return;

        const resumo = {
            total: vendas.length,
            quantidade: vendas.reduce((sum, v) => sum + (v.quantidade || 0), 0),
            frete: vendas.reduce((sum, v) => sum + (v.freteEletrons || 0), 0)
        };

        this.renderResumoLoja(resumo);
        this.renderListaLoja(vendas.sort((a, b) => new Date(b.dataVenda) - new Date(a.dataVenda)));
        this.showSection('resumo-loja');
        this.showSection('detalhes-loja');
    }

    agruparPorPoste(vendas) {
        const grupos = {};
        
        vendas.forEach(venda => {
            const key = venda.posteId;
            if (!grupos[key]) {
                grupos[key] = {
                    posteId: venda.posteId,
                    codigo: venda.codigoPoste,
                    descricao: venda.descricaoPoste,
                    quantidade: 0,
                    valorVendas: 0,
                    custo: 0,
                    vendas: []
                };
            }
            
            grupos[key].quantidade += venda.quantidade || 0;
            grupos[key].valorVendas += venda.valorVenda || 0;
            grupos[key].vendas.push(venda);
            
            // Calcular custo
            const poste = this.data.postes.find(p => p.id === venda.posteId);
            if (poste && venda.quantidade) {
                grupos[key].custo += poste.preco * venda.quantidade;
            }
        });
        
        return grupos;
    }

    calcularLucros(grupos) {
        return Object.values(grupos).map(item => {
            item.lucro = item.valorVendas - item.custo;
            item.margem = item.valorVendas > 0 ? (item.lucro / item.valorVendas * 100) : 0;
            return item;
        }).sort((a, b) => b.quantidade - a.quantidade);
    }

    calcularResumo(relatorio) {
        return {
            tipos: relatorio.length,
            vendas: this.data.vendas.filter(v => v.tipoVenda === 'V').length,
            quantidade: relatorio.reduce((sum, item) => sum + item.quantidade, 0),
            faturamento: relatorio.reduce((sum, item) => sum + item.valorVendas, 0),
            custo: relatorio.reduce((sum, item) => sum + item.custo, 0),
            lucro: relatorio.reduce((sum, item) => sum + item.lucro, 0)
        };
    }

    renderResumoVendas(dados) {
        const container = document.getElementById('stats-vendas');
        container.innerHTML = `
            <div class="stat-item stat-primary">
                <div class="stat-icon">⚡</div>
                <div class="stat-content">
                    <div class="stat-number">${dados.tipos}</div>
                    <div class="stat-label">Tipos de Postes</div>
                </div>
            </div>
            <div class="stat-item stat-info">
                <div class="stat-icon">📋</div>
                <div class="stat-content">
                    <div class="stat-number">${dados.vendas}</div>
                    <div class="stat-label">Total de Vendas</div>
                </div>
            </div>
            <div class="stat-item stat-success">
                <div class="stat-icon">💰</div>
                <div class="stat-content">
                    <div class="stat-number">${window.AppUtils.formatCurrency(dados.lucro)}</div>
                    <div class="stat-label">Lucro Total</div>
                </div>
            </div>
            <div class="stat-item stat-warning">
                <div class="stat-icon">💵</div>
                <div class="stat-content">
                    <div class="stat-number">${window.AppUtils.formatCurrency(dados.faturamento)}</div>
                    <div class="stat-label">Faturamento</div>
                </div>
            </div>
        `;
    }

    renderResumoExtras(dados) {
        const container = document.getElementById('stats-extras');
        container.innerHTML = `
            <div class="stat-item stat-extra">
                <div class="stat-icon">📈</div>
                <div class="stat-content">
                    <div class="stat-number">${dados.total}</div>
                    <div class="stat-label">Vendas Extras</div>
                </div>
            </div>
            <div class="stat-item stat-info">
                <div class="stat-icon">🔧</div>
                <div class="stat-content">
                    <div class="stat-number">${dados.quantidade}</div>
                    <div class="stat-label">Serviços Extras</div>
                </div>
            </div>
            <div class="stat-item stat-success">
                <div class="stat-icon">💰</div>
                <div class="stat-content">
                    <div class="stat-number">${window.AppUtils.formatCurrency(dados.valor)}</div>
                    <div class="stat-label">Valor Total</div>
                </div>
            </div>
        `;
    }

    renderResumoLoja(dados) {
        const container = document.getElementById('stats-loja');
        container.innerHTML = `
            <div class="stat-item stat-loja">
                <div class="stat-icon">🏪</div>
                <div class="stat-content">
                    <div class="stat-number">${dados.total}</div>
                    <div class="stat-label">Vendas Loja</div>
                </div>
            </div>
            <div class="stat-item stat-info">
                <div class="stat-icon">📦</div>
                <div class="stat-content">
                    <div class="stat-number">${dados.quantidade}</div>
                    <div class="stat-label">Postes Vendidos</div>
                </div>
            </div>
            <div class="stat-item stat-warning">
                <div class="stat-icon">🚚</div>
                <div class="stat-content">
                    <div class="stat-number">${window.AppUtils.formatCurrency(dados.frete)}</div>
                    <div class="stat-label">Total Frete</div>
                </div>
            </div>
        `;
    }

    renderDetalhesVendas(dados) {
        const container = document.getElementById('lista-vendas');
        container.innerHTML = '';

        dados.forEach(item => {
            const precoMedio = item.quantidade > 0 ? item.valorVendas / item.quantidade : 0;
            const custoMedio = item.quantidade > 0 ? item.custo / item.quantidade : 0;
            const margemClass = this.getMargemClass(item.margem);

            container.innerHTML += `
                <div class="mobile-list-item">
                    <div class="item-header">
                        <span class="item-code">${item.codigo}</span>
                        <span class="item-quantidade">${item.quantidade} unidades</span>
                    </div>
                    <div class="item-content">
                        <div class="item-value">${window.AppUtils.formatCurrency(item.valorVendas)}</div>
                        <div class="item-title">${item.descricao}</div>
                        <div class="item-details">
                            <small>Preço médio: ${window.AppUtils.formatCurrency(precoMedio)}</small><br>
                            <small>Custo médio: ${window.AppUtils.formatCurrency(custoMedio)}</small><br>
                            <small>${item.vendas.length} venda(s)</small>
                        </div>
                        <div class="lucro-info ${margemClass}">
                            <div class="lucro-valor">
                                <strong>Lucro: ${window.AppUtils.formatCurrency(item.lucro)}</strong>
                            </div>
                            <div class="margem-valor">
                                <strong>Margem: ${item.margem.toFixed(1)}%</strong>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
    }

    renderListaExtras(dados) {
        const container = document.getElementById('lista-extras');
        container.innerHTML = '';

        dados.forEach(venda => {
            container.innerHTML += `
                <div class="mobile-list-item relatorio-extra-item tipo-e">
                    <div class="item-header">
                        <span class="item-date">${window.AppUtils.formatDateBR(venda.dataVenda, true)}</span>
                        <span class="item-code">${venda.codigoPoste || 'Extra'}</span>
                    </div>
                    <div class="item-content">
                        <div class="item-value">${window.AppUtils.formatCurrency(venda.valorExtra || 0)}</div>
                        <div class="item-title">${venda.descricaoPoste || 'Venda Extra'}</div>
                        <div class="item-details">
                            <small>Quantidade: ${venda.quantidade || 1}</small>
                            ${venda.observacoes ? `<br><small>Obs: ${venda.observacoes}</small>` : ''}
                        </div>
                    </div>
                </div>
            `;
        });
    }

    renderListaLoja(dados) {
        const container = document.getElementById('lista-loja');
        container.innerHTML = '';

        dados.forEach(venda => {
            container.innerHTML += `
                <div class="mobile-list-item relatorio-loja-item tipo-l">
                    <div class="item-header">
                        <span class="item-date">${window.AppUtils.formatDateBR(venda.dataVenda, true)}</span>
                        <span class="item-code">${venda.codigoPoste || 'N/A'}</span>
                    </div>
                    <div class="item-content">
                        <div class="item-value">${window.AppUtils.formatCurrency(venda.freteEletrons || 0)}</div>
                        <div class="item-title">${venda.descricaoPoste || 'Produto não especificado'}</div>
                        <div class="item-details">
                            <small>Quantidade: ${venda.quantidade || 1}</small>
                            ${venda.observacoes ? `<br><small>Obs: ${venda.observacoes}</small>` : ''}
                        </div>
                    </div>
                </div>
            `;
        });
    }

    getMargemClass(margem) {
        if (margem > 20) return 'margem-alta';
        if (margem > 10) return 'margem-media';
        if (margem < 0) return 'margem-negativa';
        return 'margem-neutra';
    }

    updatePeriodoInfo() {
        const { dataInicio, dataFim, tipoVenda } = this.data.filtros;
        const elemento = document.getElementById('periodo-texto');
        
        let texto = `${window.AppUtils.formatDateBR(dataInicio)} até ${window.AppUtils.formatDateBR(dataFim)}`;
        if (tipoVenda) {
            const tipos = { V: 'Vendas Normais', E: 'Vendas Extras', L: 'Vendas Loja' };
            texto += ` - ${tipos[tipoVenda]}`;
        }
        
        elemento.textContent = texto;
        document.getElementById('periodo-info').style.display = 'flex';
    }

    limparRelatorio() {
        document.getElementById('relatorio-form').reset();
        this.setDefaultPeriod();
        this.hideAllSections();
        this.data.vendas = [];
        window.AppUtils.showAlert('Relatório limpo', 'success');
    }

    exportarRelatorio(tipo = null) {
        const { tipoVenda } = this.data.filtros;
        const tipoExport = tipo || tipoVenda;
        
        if (!tipoExport) {
            window.AppUtils.showAlert('Selecione um tipo específico para exportar', 'warning');
            return;
        }

        const vendas = this.data.vendas.filter(v => v.tipoVenda === tipoExport);
        if (!vendas.length) {
            window.AppUtils.showAlert('Nenhum dado para exportar', 'warning');
            return;
        }

        let dados, filename;
        const { dataInicio, dataFim } = this.data.filtros;

        if (tipoExport === 'V') {
            const agrupadas = this.agruparPorPoste(vendas);
            dados = Object.values(agrupadas).map(item => ({
                'Código': item.codigo,
                'Descrição': item.descricao,
                'Quantidade': item.quantidade,
                'Faturamento': item.valorVendas.toFixed(2),
                'Custo': item.custo.toFixed(2),
                'Lucro': (item.valorVendas - item.custo).toFixed(2),
                'Margem (%)': ((item.valorVendas - item.custo) / item.valorVendas * 100).toFixed(1),
                'Vendas': item.vendas.length
            }));
            filename = `vendas_normais_vermelho_${dataInicio}_${dataFim}`;
        } else {
            dados = vendas.map(v => ({
                'Data': window.AppUtils.formatDateBR(v.dataVenda, true),
                'Código': v.codigoPoste || 'N/A',
                'Descrição': v.descricaoPoste || '-',
                'Quantidade': v.quantidade || 1,
                'Valor': tipoExport === 'E' ? (v.valorExtra || 0) : (v.freteEletrons || 0),
                'Observações': v.observacoes || '-'
            }));
            const tipoNome = tipoExport === 'E' ? 'extras' : 'loja';
            filename = `vendas_${tipoNome}_vermelho_${dataInicio}_${dataFim}`;
        }

        window.AppUtils.exportToCSV(dados, filename);
        window.AppUtils.showAlert('Relatório exportado!', 'success');
    }

    hideAllSections() {
        ['resumo-vendas', 'resumo-extras', 'resumo-loja', 
         'detalhes-vendas', 'detalhes-extras', 'detalhes-loja', 'periodo-info']
         .forEach(id => this.hideSection(id));
    }

    showSection(id) {
        const el = document.getElementById(id);
        if (el) el.style.display = 'block';
    }

    hideSection(id) {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    }
}

// Inicialização
let relatoriosVermelho;

document.addEventListener('DOMContentLoaded', () => {
    relatoriosVermelho = new RelatoriosVermelho();
});

// Funções globais
window.gerarRelatorio = () => relatoriosVermelho?.gerarRelatorio();
window.limparRelatorio = () => relatoriosVermelho?.limparRelatorio();
window.exportarRelatorio = (tipo) => relatoriosVermelho?.exportarRelatorio(tipo);

console.log('✅ Relatórios Vermelho otimizado carregado');