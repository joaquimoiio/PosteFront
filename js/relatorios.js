// ================================
// RELATÓRIOS CAMINHÃO VERMELHO - REFATORADO
// Sistema com cálculo de lucro integrado
// ================================

class RelatoriosVermelho {
    constructor() {
        this.data = {
            vendas: [],
            postes: [],
            relatorioGerado: false,
            filtros: { dataInicio: '', dataFim: '', tipoVenda: '' }
        };
        
        this.init();
    }

    // ================================
    // INICIALIZAÇÃO
    // ================================
    async init() {
        if (!this.validateAuth()) return;
        if (!this.validateDependencies()) return;

        console.log('🎯 Inicializando Relatórios Caminhão Vermelho...');

        try {
            this.setupEventListeners();
            this.setDefaultPeriod();
            await this.loadPostes();
            console.log('✅ Relatórios Caminhão Vermelho carregado');
        } catch (error) {
            console.error('❌ Erro ao carregar:', error);
            window.AppUtils.showAlert('Erro ao carregar dados. Verifique sua conexão.', 'error');
        }
    }

    validateAuth() {
        const userType = localStorage.getItem('poste-system-user-type');
        if (userType !== 'vermelho') {
            window.location.href = 'index.html';
            return false;
        }
        return true;
    }

    validateDependencies() {
        if (!window.AppUtils) {
            console.error('AppUtils não carregado!');
            return false;
        }
        return true;
    }

    setupEventListeners() {
        const relatorioForm = document.getElementById('relatorio-form');
        if (relatorioForm) {
            relatorioForm.addEventListener('submit', (e) => this.handleRelatorioSubmit(e));
        }
    }

    setDefaultPeriod() {
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        
        document.getElementById('data-inicio').value = window.AppUtils.dateToInputValue(firstDayOfMonth);
        document.getElementById('data-fim').value = window.AppUtils.dateToInputValue(today);
    }

    async loadPostes() {
        try {
            const postes = await window.AppUtils.apiRequest('/postes');
            this.data.postes = postes || [];
        } catch (error) {
            console.error('Erro ao carregar postes:', error);
            this.data.postes = [];
        }
    }

    // ================================
    // MANIPULAÇÃO DE EVENTOS
    // ================================
    async handleRelatorioSubmit(e) {
        e.preventDefault();
        
        try {
            const formData = this.buildRelatorioFilters();
            
            if (!this.validateRelatorioFilters(formData)) {
                return;
            }
            
            this.data.filtros = formData;
            await this.gerarRelatorio();
            
        } catch (error) {
            console.error('Erro ao gerar relatório:', error);
            window.AppUtils.showAlert('Erro ao gerar relatório: ' + error.message, 'error');
        }
    }

    buildRelatorioFilters() {
        return {
            dataInicio: document.getElementById('data-inicio').value,
            dataFim: document.getElementById('data-fim').value,
            tipoVenda: document.getElementById('tipo-venda').value
        };
    }

    validateRelatorioFilters(data) {
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

    // ================================
    // GERAÇÃO DE RELATÓRIOS
    // ================================
    async gerarRelatorio() {
        try {
            window.AppUtils.showLoading(true);
            
            const vendas = await this.fetchVendasPeriodo();
            this.data.vendas = vendas || [];
            
            const { tipoVenda } = this.data.filtros;
            
            // Gerar relatórios baseado no tipo selecionado
            if (!tipoVenda || tipoVenda === 'V') {
                await this.gerarRelatorioVendasNormais();
            }
            
            if (!tipoVenda || tipoVenda === 'E') {
                this.gerarRelatorioVendasExtras();
            }
            
            if (!tipoVenda || tipoVenda === 'L') {
                this.gerarRelatorioVendasLoja();
            }
            
            this.updatePeriodoInfo();
            this.data.relatorioGerado = true;
            
            window.AppUtils.showAlert('Relatório gerado com sucesso!', 'success');
            
        } catch (error) {
            console.error('Erro ao gerar relatório:', error);
            throw error;
        } finally {
            window.AppUtils.showLoading(false);
        }
    }

    async fetchVendasPeriodo() {
        const { dataInicio, dataFim } = this.data.filtros;
        const params = new URLSearchParams();
        
        if (dataInicio) params.append('dataInicio', dataInicio);
        if (dataFim) params.append('dataFim', dataFim);
        
        const endpoint = `/vendas?${params}`;
        return await window.AppUtils.apiRequest(endpoint);
    }

    // ================================
    // VENDAS NORMAIS COM LUCRO
    // ================================
    async gerarRelatorioVendasNormais() {
        const vendasV = this.data.vendas.filter(v => v.tipoVenda === 'V');
        
        if (vendasV.length === 0) {
            this.hideSection('resumo-section');
            this.hideSection('relatorio-section');
            return;
        }
        
        const vendasAgrupadas = this.agruparVendasPorPoste(vendasV);
        const relatorioArray = this.calcularLucrosVendas(vendasAgrupadas);
        const resumoGeral = this.calcularResumoGeral(relatorioArray);
        
        this.updateResumoVendasNormais(resumoGeral);
        this.displayRelatorioVendasNormais(relatorioArray);
        
        this.showSection('resumo-section');
        this.showSection('relatorio-section');
        
        console.log('📊 Relatório vendas normais com lucro:', resumoGeral);
    }

    agruparVendasPorPoste(vendas) {
        const agrupadas = {};
        
        vendas.forEach(venda => {
            const key = venda.posteId;
            if (!agrupadas[key]) {
                agrupadas[key] = {
                    posteId: venda.posteId,
                    codigoPoste: venda.codigoPoste,
                    descricaoPoste: venda.descricaoPoste,
                    quantidadeTotal: 0,
                    valorTotalVendas: 0,
                    custoTotalPostes: 0,
                    vendas: []
                };
            }
            
            agrupadas[key].quantidadeTotal += venda.quantidade || 0;
            agrupadas[key].valorTotalVendas += venda.valorVenda || 0;
            agrupadas[key].vendas.push(venda);
            
            // Calcular custo baseado no preço do poste
            const poste = this.data.postes.find(p => p.id === venda.posteId);
            if (poste && venda.quantidade) {
                agrupadas[key].custoTotalPostes += (poste.preco * venda.quantidade);
            }
        });
        
        return agrupadas;
    }

    calcularLucrosVendas(vendasAgrupadas) {
        return Object.values(vendasAgrupadas).map(item => {
            item.lucroTotal = item.valorTotalVendas - item.custoTotalPostes;
            item.margemLucro = item.valorTotalVendas > 0 ? 
                (item.lucroTotal / item.valorTotalVendas * 100) : 0;
            return item;
        }).sort((a, b) => b.quantidadeTotal - a.quantidadeTotal);
    }

    calcularResumoGeral(relatorioArray) {
        const totalTipos = relatorioArray.length;
        const totalVendas = this.data.vendas.filter(v => v.tipoVenda === 'V').length;
        const quantidadeTotal = relatorioArray.reduce((sum, item) => sum + item.quantidadeTotal, 0);
        const valorTotalArrecadado = relatorioArray.reduce((sum, item) => sum + item.valorTotalVendas, 0);
        const custoTotalGeral = relatorioArray.reduce((sum, item) => sum + item.custoTotalPostes, 0);
        const lucroTotalGeral = valorTotalArrecadado - custoTotalGeral;
        const margemLucroGeral = valorTotalArrecadado > 0 ? (lucroTotalGeral / valorTotalArrecadado * 100) : 0;

        return {
            totalTipos,
            totalVendas,
            quantidadeTotal,
            valorTotalArrecadado,
            custoTotalGeral,
            lucroTotalGeral,
            margemLucroGeral
        };
    }

    updateResumoVendasNormais(resumo) {
        window.AppUtils.updateElement('total-tipos-postes', resumo.totalTipos);
        window.AppUtils.updateElement('total-vendas-periodo', resumo.totalVendas);
        window.AppUtils.updateElement('quantidade-total', resumo.quantidadeTotal);
        window.AppUtils.updateElement('valor-total', window.AppUtils.formatCurrency(resumo.valorTotalArrecadado));
        
        // Elementos de lucro
        this.updateOrCreateElement('custo-total', window.AppUtils.formatCurrency(resumo.custoTotalGeral));
        this.updateOrCreateElement('lucro-total-vendas', window.AppUtils.formatCurrency(resumo.lucroTotalGeral));
        this.updateOrCreateElement('margem-lucro-vendas', `${resumo.margemLucroGeral.toFixed(1)}%`);
    }

    displayRelatorioVendasNormais(relatorio) {
        const container = document.getElementById('relatorio-list');
        if (!container) return;
        
        if (!relatorio || relatorio.length === 0) {
            container.innerHTML = this.getEmptyStateHTML('📈', 'Nenhuma venda normal encontrada', 'Não há vendas normais (V) no período selecionado.');
            return;
        }
        
        container.innerHTML = '';
        relatorio.forEach(item => {
            container.appendChild(this.createRelatorioItemComLucro(item));
        });
    }

    createRelatorioItemComLucro(item) {
        const element = document.createElement('div');
        element.className = 'mobile-list-item relatorio-item';
        
        const precoUnitario = item.quantidadeTotal > 0 ? item.valorTotalVendas / item.quantidadeTotal : 0;
        const custoUnitario = item.quantidadeTotal > 0 ? item.custoTotalPostes / item.quantidadeTotal : 0;
        const margemClass = this.getMargemClass(item.margemLucro);
        
        element.innerHTML = `
            <div class="item-header">
                <span class="item-code">${item.codigoPoste}</span>
                <span class="item-quantidade">${item.quantidadeTotal} unidades</span>
            </div>
            
            <div class="item-content">
                <div class="item-value">${window.AppUtils.formatCurrency(item.valorTotalVendas)}</div>
                <div class="item-title">${item.descricaoPoste}</div>
                
                <div class="item-details">
                    <small>Preço médio venda: ${window.AppUtils.formatCurrency(precoUnitario)}</small>
                </div>
                <div class="item-details">
                    <small>Custo médio: ${window.AppUtils.formatCurrency(custoUnitario)}</small>
                </div>
                <div class="item-details">
                    <small>${item.vendas.length} venda(s) realizadas</small>
                </div>
                
                <div class="lucro-info ${margemClass}">
                    <div class="lucro-valor">
                        <strong>Lucro: ${window.AppUtils.formatCurrency(item.lucroTotal)}</strong>
                    </div>
                    <div class="margem-valor">
                        <strong>Margem: ${item.margemLucro.toFixed(1)}%</strong>
                    </div>
                </div>
            </div>
        `;
        
        return element;
    }

    // ================================
    // VENDAS EXTRAS
    // ================================
    gerarRelatorioVendasExtras() {
        const vendasE = this.data.vendas.filter(v => v.tipoVenda === 'E');
        
        if (vendasE.length === 0) {
            this.hideSection('resumo-extras-section');
            this.hideSection('vendas-extras-section');
            return;
        }
        
        const vendasOrdenadas = vendasE.sort((a, b) => new Date(b.dataVenda) - new Date(a.dataVenda));
        const resumoExtras = this.calcularResumoExtras(vendasE);
        
        this.updateResumoExtras(resumoExtras);
        this.displayRelatorioVendasExtras(vendasOrdenadas);
        
        this.showSection('resumo-extras-section');
        this.showSection('vendas-extras-section');
    }

    calcularResumoExtras(vendas) {
        return {
            totalVendasExtras: vendas.length,
            totalPostesExtras: vendas.reduce((sum, v) => sum + (v.quantidade || 1), 0),
            totalValorExtras: vendas.reduce((sum, v) => sum + (v.valorExtra || 0), 0)
        };
    }

    updateResumoExtras(resumo) {
        window.AppUtils.updateElement('total-vendas-extras', resumo.totalVendasExtras);
        window.AppUtils.updateElement('total-postes-extras', resumo.totalPostesExtras);
        window.AppUtils.updateElement('total-valor-extras', window.AppUtils.formatCurrency(resumo.totalValorExtras));
    }

    displayRelatorioVendasExtras(vendas) {
        const container = document.getElementById('vendas-extras-list');
        if (!container) return;
        
        if (!vendas || vendas.length === 0) {
            container.innerHTML = this.getEmptyStateHTML('📈', 'Nenhuma venda extra encontrada', 'Não há vendas extras (E) no período selecionado.');
            return;
        }
        
        container.innerHTML = '';
        vendas.forEach(venda => {
            container.appendChild(this.createRelatorioExtraItem(venda));
        });
    }

    createRelatorioExtraItem(venda) {
        const element = document.createElement('div');
        element.className = 'mobile-list-item relatorio-extra-item tipo-e';
        
        element.innerHTML = `
            <div class="item-header">
                <span class="item-date">${window.AppUtils.formatDateBR(venda.dataVenda, true)}</span>
                <span class="item-code">${venda.codigoPoste || 'Extra'}</span>
            </div>
            
            <div class="item-content">
                <div class="item-value">${window.AppUtils.formatCurrency(venda.valorExtra || 0)}</div>
                <div class="item-title">${venda.descricaoPoste || 'Venda Extra'}</div>
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

    // ================================
    // VENDAS LOJA
    // ================================
    gerarRelatorioVendasLoja() {
        const vendasL = this.data.vendas.filter(v => v.tipoVenda === 'L');
        
        if (vendasL.length === 0) {
            this.hideSection('resumo-loja-section');
            this.hideSection('vendas-loja-section');
            return;
        }
        
        const vendasOrdenadas = vendasL.sort((a, b) => new Date(b.dataVenda) - new Date(a.dataVenda));
        const resumoLoja = this.calcularResumoLoja(vendasL);
        
        this.updateResumoLoja(resumoLoja);
        this.displayRelatorioVendasLoja(vendasOrdenadas);
        
        this.showSection('resumo-loja-section');
        this.showSection('vendas-loja-section');
    }

    calcularResumoLoja(vendas) {
        return {
            totalVendasLoja: vendas.length,
            totalPostesLoja: vendas.reduce((sum, v) => sum + (v.quantidade || 0), 0),
            totalFreteLoja: vendas.reduce((sum, v) => sum + (v.freteEletrons || 0), 0)
        };
    }

    updateResumoLoja(resumo) {
        window.AppUtils.updateElement('total-vendas-loja', resumo.totalVendasLoja);
        window.AppUtils.updateElement('total-postes-loja', resumo.totalPostesLoja);
        window.AppUtils.updateElement('total-frete-loja', window.AppUtils.formatCurrency(resumo.totalFreteLoja));
    }

    displayRelatorioVendasLoja(vendas) {
        const container = document.getElementById('vendas-loja-list');
        if (!container) return;
        
        if (!vendas || vendas.length === 0) {
            container.innerHTML = this.getEmptyStateHTML('🏪', 'Nenhuma venda loja encontrada', 'Não há vendas loja (L) no período selecionado.');
            return;
        }
        
        container.innerHTML = '';
        vendas.forEach(venda => {
            container.appendChild(this.createRelatorioLojaItem(venda));
        });
    }

    createRelatorioLojaItem(venda) {
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

    // ================================
    // EXPORTAÇÃO
    // ================================
    exportarRelatorio() {
        if (!this.data.relatorioGerado || this.data.vendas.length === 0) {
            window.AppUtils.showAlert('Nenhum relatório para exportar', 'warning');
            return;
        }
        
        const { tipoVenda } = this.data.filtros;
        
        if (!tipoVenda || tipoVenda === 'V') {
            this.exportarRelatorioVendasNormaisComLucro();
        }
        
        if (!tipoVenda || tipoVenda === 'E') {
            this.exportarRelatorioVendasExtras();
        }
        
        if (!tipoVenda || tipoVenda === 'L') {
            this.exportarRelatorioVendasLoja();
        }
    }

    exportarRelatorioVendasNormaisComLucro() {
        const vendasV = this.data.vendas.filter(v => v.tipoVenda === 'V');
        if (vendasV.length === 0) return;
        
        const vendasAgrupadas = this.agruparVendasPorPoste(vendasV);
        const dadosExportar = Object.values(vendasAgrupadas).map(item => {
            const lucroTotal = item.valorTotalVendas - item.custoTotalPostes;
            const margemLucro = item.valorTotalVendas > 0 ? (lucroTotal / item.valorTotalVendas * 100) : 0;
            
            return {
                'Código': item.codigoPoste,
                'Descrição': item.descricaoPoste,
                'Quantidade Total': item.quantidadeTotal,
                'Valor Arrecadado': item.valorTotalVendas.toFixed(2),
                'Custo Total': item.custoTotalPostes.toFixed(2),
                'Lucro Total': lucroTotal.toFixed(2),
                'Margem Lucro (%)': margemLucro.toFixed(1),
                'Preço Médio Venda': (item.valorTotalVendas / item.quantidadeTotal).toFixed(2),
                'Custo Médio': (item.custoTotalPostes / item.quantidadeTotal).toFixed(2),
                'Número de Vendas': item.vendas.length
            };
        });
        
        const { dataInicio, dataFim } = this.data.filtros;
        const filename = `relatorio_vendas_normais_lucro_vermelho_${dataInicio}_${dataFim}`;
        
        window.AppUtils.exportToCSV(dadosExportar, filename);
    }

    exportarRelatorioVendasExtras() {
        const vendasE = this.data.vendas.filter(v => v.tipoVenda === 'E');
        if (vendasE.length === 0) return;
        
        const dadosExportar = vendasE.map(venda => ({
            'Data': window.AppUtils.formatDateBR(venda.dataVenda, true),
            'Código Poste': venda.codigoPoste || 'N/A',
            'Descrição': venda.descricaoPoste || 'Venda Extra',
            'Quantidade': venda.quantidade || 1,
            'Valor Extra': venda.valorExtra || 0,
            'Observações': venda.observacoes || '-'
        }));
        
        const { dataInicio, dataFim } = this.data.filtros;
        const filename = `relatorio_vendas_extras_vermelho_${dataInicio}_${dataFim}`;
        
        window.AppUtils.exportToCSV(dadosExportar, filename);
    }

    exportarRelatorioVendasLoja() {
        const vendasL = this.data.vendas.filter(v => v.tipoVenda === 'L');
        if (vendasL.length === 0) return;
        
        const dadosExportar = vendasL.map(venda => ({
            'Data': window.AppUtils.formatDateBR(venda.dataVenda, true),
            'Código Poste': venda.codigoPoste || 'N/A',
            'Descrição': venda.descricaoPoste || 'Produto não especificado',
            'Quantidade': venda.quantidade || 1,
            'Frete Eletrons': venda.freteEletrons || 0,
            'Observações': venda.observacoes || '-'
        }));
        
        const { dataInicio, dataFim } = this.data.filtros;
        const filename = `relatorio_vendas_loja_vermelho_${dataInicio}_${dataFim}`;
        
        window.AppUtils.exportToCSV(dadosExportar, filename);
    }

    // ================================
    // FUNÇÕES AUXILIARES
    // ================================
    updatePeriodoInfo() {
        const { dataInicio, dataFim, tipoVenda } = this.data.filtros;
        const indicator = document.getElementById('periodo-info');
        const text = document.getElementById('periodo-texto');
        
        if (!indicator || !text) return;
        
        let periodo = '';
        if (dataInicio && dataFim) {
            const inicio = window.AppUtils.formatDateBR(dataInicio);
            const fim = window.AppUtils.formatDateBR(dataFim);
            periodo = `${inicio} até ${fim}`;
        }
        
        const tipos = { 'V': ' - Vendas Normais', 'E': ' - Vendas Extras', 'L': ' - Vendas Loja' };
        const tipo = tipos[tipoVenda] || '';
        
        text.textContent = `Período: ${periodo}${tipo}`;
        indicator.style.display = 'flex';
    }

    limparRelatorio() {
        document.getElementById('relatorio-form').reset();
        this.setDefaultPeriod();
        
        const sections = [
            'resumo-section', 'resumo-extras-section', 'resumo-loja-section',
            'relatorio-section', 'vendas-extras-section', 'vendas-loja-section', 'periodo-info'
        ];
        
        sections.forEach(section => this.hideSection(section));
        
        this.data.vendas = [];
        this.data.relatorioGerado = false;
        this.data.filtros = { dataInicio: '', dataFim: '', tipoVenda: '' };
        
        window.AppUtils.showAlert('Relatório limpo', 'success');
    }

    updateOrCreateElement(id, value) {
        let element = document.getElementById(id);
        if (!element) {
            element = this.createElement(id);
        }
        
        if (element) {
            element.textContent = value;
        }
    }

    createElement(id) {
        const resumoSection = document.getElementById('resumo-section');
        if (!resumoSection) return null;
        
        const statsGrid = resumoSection.querySelector('.stats-grid');
        if (!statsGrid || statsGrid.querySelector(`#${id}`)) return null;
        
        const configs = {
            'custo-total': { icon: '📦', label: 'Custo Total' },
            'lucro-total-vendas': { icon: '💎', label: 'Lucro Total' },
            'margem-lucro-vendas': { icon: '📊', label: 'Margem Lucro' }
        };
        
        const config = configs[id] || { icon: '💰', label: 'Valor' };
        
        const statItem = document.createElement('div');
        statItem.className = 'stat-item';
        statItem.innerHTML = `
            <div class="stat-icon">${config.icon}</div>
            <div class="stat-number" id="${id}">-</div>
            <div class="stat-label">${config.label}</div>
        `;
        
        statsGrid.appendChild(statItem);
        return document.getElementById(id);
    }

    getMargemClass(margem) {
        if (margem > 20) return 'margem-alta';
        if (margem > 10) return 'margem-media';
        if (margem < 0) return 'margem-negativa';
        return 'margem-neutra';
    }

    getEmptyStateHTML(icon, title, message) {
        return `
            <div class="empty-state">
                <div class="empty-icon">${icon}</div>
                <h3>${title}</h3>
                <p>${message}</p>
            </div>
        `;
    }

    showSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) section.style.display = 'block';
    }

    hideSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) section.style.display = 'none';
    }
}

// ================================
// INICIALIZAÇÃO E FUNÇÕES GLOBAIS
// ================================
let relatoriosVermelho;

document.addEventListener('DOMContentLoaded', () => {
    relatoriosVermelho = new RelatoriosVermelho();
});

// Funções globais para compatibilidade
window.gerarRelatorio = () => relatoriosVermelho?.gerarRelatorio();
window.limparRelatorio = () => relatoriosVermelho?.limparRelatorio();
window.exportarRelatorio = () => relatoriosVermelho?.exportarRelatorio();

console.log('✅ Relatórios Caminhão Vermelho refatorado carregado');