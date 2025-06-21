// Vendas JavaScript - VERSÃO REFATORADA COM INTEGRAÇÃO DE ESTOQUE
class VendasManager {
    constructor() {
        this.config = {
            API_BASE: 'http://localhost:8080/api',
            DEBOUNCE_DELAY: 300,
            ALERT_DURATION: 5000
        };
        
        this.state = {
            vendas: [],
            filteredVendas: [],
            postes: [],
            currentEditId: null,
            filters: {
                tipo: '',
                dataInicio: '',
                dataFim: ''
            },
            isLoading: false
        };
        
        this.elements = {};
        this.init();
    }

    // ===== INICIALIZAÇÃO =====
    async init() {
        console.log('🎯 Inicializando VendasManager...');
        
        try {
            this.cacheElements();
            this.configurarLocaleBrasileiro();
            this.setupEventListeners();
            this.setupFilters();
            this.setDefaultDateTime();
            this.setDefaultDateFilters();
            
            await this.loadData();
            
            console.log('✅ VendasManager inicializado com sucesso');
        } catch (error) {
            console.error('❌ Erro na inicialização:', error);
            this.showAlert('Erro ao carregar dados de vendas', 'error');
        }
    }

    cacheElements() {
        this.elements = {
            // Forms
            vendaForm: document.getElementById('venda-form'),
            editForm: document.getElementById('edit-venda-form'),
            
            // Form inputs
            vendaTipo: document.getElementById('venda-tipo'),
            vendaData: document.getElementById('venda-data'),
            vendaObservacoes: document.getElementById('venda-observacoes'),
            
            // Tipo E
            valorExtra: document.getElementById('venda-valor-extra'),
            
            // Tipo V
            posteV: document.getElementById('venda-poste-v'),
            quantidadeV: document.getElementById('venda-quantidade-v'),
            valorTotalV: document.getElementById('venda-valor-total-v'),
            
            // Tipo L
            posteL: document.getElementById('venda-poste-l'),
            quantidadeL: document.getElementById('venda-quantidade-l'),
            freteL: document.getElementById('venda-frete-l'),
            
            // Edit form
            editTipoVenda: document.getElementById('edit-tipo-venda'),
            editObservacoes: document.getElementById('edit-observacoes'),
            editValorExtra: document.getElementById('edit-valor-extra'),
            editValorTotal: document.getElementById('edit-valor-total'),
            editFreteEletrons: document.getElementById('edit-frete-eletrons'),
            
            // Conditional fields
            camposTipoE: document.getElementById('campos-tipo-e'),
            camposTipoV: document.getElementById('campos-tipo-v'),
            camposTipoL: document.getElementById('campos-tipo-l'),
            
            // Edit groups
            editFreteGroup: document.getElementById('edit-frete-group'),
            editValorGroup: document.getElementById('edit-valor-group'),
            editExtraGroup: document.getElementById('edit-extra-group'),
            
            // Filters
            filtroTipoVenda: document.getElementById('filtro-tipo-venda'),
            filtroDataInicio: document.getElementById('filtro-data-inicio'),
            filtroDataFim: document.getElementById('filtro-data-fim'),
            
            // Display
            vendasTable: document.querySelector('#vendas-table tbody'),
            loadingOverlay: document.getElementById('loading-overlay'),
            alertContainer: document.getElementById('alert-container'),
            editModal: document.getElementById('edit-venda-modal'),
            
            // Summary cards
            totalVendasE: document.getElementById('total-vendas-e'),
            totalVendasV: document.getElementById('total-vendas-v'),
            totalVendasL: document.getElementById('total-vendas-l'),
            totalVendasGeral: document.getElementById('total-vendas-geral')
        };
    }

    configurarLocaleBrasileiro() {
        document.documentElement.lang = 'pt-BR';
        
        setTimeout(() => {
            const inputs = document.querySelectorAll('input[type="date"], input[type="datetime-local"]');
            inputs.forEach(input => input.setAttribute('lang', 'pt-BR'));
        }, 100);
    }

    setupEventListeners() {
        // Main form events
        if (this.elements.vendaForm) {
            this.elements.vendaForm.addEventListener('submit', (e) => this.handleVendaSubmit(e));
            this.elements.vendaForm.addEventListener('reset', () => this.resetForm());
        }
        
        // Edit form events
        if (this.elements.editForm) {
            this.elements.editForm.addEventListener('submit', (e) => this.handleEditSubmit(e));
        }
        
        // Tipo venda change
        if (this.elements.vendaTipo) {
            this.elements.vendaTipo.addEventListener('change', (e) => this.handleTipoVendaChange(e));
        }
        
        if (this.elements.editTipoVenda) {
            this.elements.editTipoVenda.addEventListener('change', (e) => this.handleEditTipoChange(e));
        }
        
        // Calculation events for tipo V
        if (this.elements.posteV && this.elements.quantidadeV) {
            this.elements.posteV.addEventListener('change', () => this.calcularValorVenda());
            this.elements.quantidadeV.addEventListener('input', () => {
                this.calcularValorVenda();
                this.verificarEstoqueDisponivel();
            });
        }
        
        // NOVA FUNCIONALIDADE: Verificar estoque para tipo L
        if (this.elements.posteL && this.elements.quantidadeL) {
            this.elements.posteL.addEventListener('change', () => this.verificarEstoqueDisponivel());
            this.elements.quantidadeL.addEventListener('input', () => this.verificarEstoqueDisponivel());
        }
        
        // Modal close events
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('close')) {
                this.closeModal(this.elements.editModal);
            }
        });
        
        // Keyboard events
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.elements.editModal.style.display === 'block') {
                this.closeModal(this.elements.editModal);
            }
        });
    }

    setupFilters() {
        const filterConfig = {
            'filtro-tipo-venda': 'tipo',
            'filtro-data-inicio': 'dataInicio',
            'filtro-data-fim': 'dataFim'
        };
        
        Object.entries(filterConfig).forEach(([elementId, filterKey]) => {
            const element = document.getElementById(elementId);
            if (element) {
                element.addEventListener('input', 
                    this.debounce(() => {
                        this.state.filters[filterKey] = element.value;
                        this.applyFilters();
                    }, this.config.DEBOUNCE_DELAY)
                );
            }
        });
    }

    // ===== NOVA FUNCIONALIDADE: VERIFICAÇÃO DE ESTOQUE =====
    async verificarEstoqueDisponivel() {
        const tipoVenda = this.elements.vendaTipo.value;
        
        if (tipoVenda !== 'V' && tipoVenda !== 'L') {
            return; // Só verifica estoque para vendas V e L
        }
        
        const posteElement = tipoVenda === 'V' ? this.elements.posteV : this.elements.posteL;
        const quantidadeElement = tipoVenda === 'V' ? this.elements.quantidadeV : this.elements.quantidadeL;
        
        if (!posteElement || !quantidadeElement) return;
        
        const posteId = parseInt(posteElement.value);
        const quantidade = parseInt(quantidadeElement.value) || 1;
        
        if (!posteId || quantidade <= 0) {
            this.limparAvisoEstoque();
            return;
        }
        
        try {
            const disponivel = await this.checkEstoqueAPI(posteId, quantidade);
            this.mostrarStatusEstoque(posteElement, disponivel, quantidade);
        } catch (error) {
            console.error('Erro ao verificar estoque:', error);
        }
    }

    async checkEstoqueAPI(posteId, quantidade) {
        try {
            const response = await fetch(`${this.config.API_BASE}/estoque/verificar-disponibilidade`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ posteId, quantidade })
            });
            
            if (!response.ok) {
                throw new Error('Erro ao verificar estoque');
            }
            
            const data = await response.json();
            return data.disponivel;
        } catch (error) {
            console.error('Erro na verificação de estoque:', error);
            return false;
        }
    }

    mostrarStatusEstoque(posteElement, disponivel, quantidade) {
        // Remover avisos anteriores
        this.limparAvisoEstoque();
        
        // Criar elemento de aviso
        const aviso = document.createElement('div');
        aviso.className = `estoque-aviso ${disponivel ? 'estoque-ok' : 'estoque-insuficiente'}`;
        aviso.style.cssText = `
            margin-top: 5px;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
            ${disponivel ? 
                'background: #f0fdf4; color: #059669; border: 1px solid #dcfce7;' : 
                'background: #fef2f2; color: #dc2626; border: 1px solid #fecaca;'
            }
        `;
        
        if (disponivel) {
            aviso.innerHTML = `✅ Estoque disponível (${quantidade} unidades)`;
        } else {
            aviso.innerHTML = `❌ Estoque insuficiente para ${quantidade} unidades`;
        }
        
        // Inserir após o elemento do poste
        posteElement.parentNode.appendChild(aviso);
    }

    limparAvisoEstoque() {
        const avisos = document.querySelectorAll('.estoque-aviso');
        avisos.forEach(aviso => aviso.remove());
    }

    // ===== DATA MANAGEMENT =====
    async loadData() {
        try {
            this.setLoading(true);
            
            await Promise.all([
                this.loadPostes(),
                this.loadVendas()
            ]);
            
            this.updateResumo();
            this.applyFilters();
            
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            throw error;
        } finally {
            this.setLoading(false);
        }
    }

    async loadPostes() {
        try {
            const postes = await this.apiRequest('/postes');
            this.state.postes = postes.filter(p => p.ativo);
            this.populatePosteSelects();
        } catch (error) {
            console.error('Erro ao carregar postes:', error);
            this.showAlert('Erro ao carregar lista de postes', 'warning');
        }
    }

    async loadVendas() {
        try {
            const vendas = await this.apiRequest('/vendas');
            this.state.vendas = vendas || [];
            this.state.filteredVendas = [...this.state.vendas];
        } catch (error) {
            console.error('Erro ao carregar vendas:', error);
            this.displayVendasError();
            throw error;
        }
    }

    // ===== API METHODS =====
    async apiRequest(endpoint, options = {}) {
        try {
            const response = await fetch(`${this.config.API_BASE}${endpoint}`, options);
            
            // Handle DELETE responses
            if (options.method === 'DELETE') {
                if (response.status === 204 || response.status === 200) {
                    return null;
                }
            }
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
            }
            
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            }
            
            return null;
        } catch (error) {
            console.error(`Erro na requisição ${endpoint}:`, error);
            throw error;
        }
    }

    // ===== FORM HANDLERS =====
    async handleVendaSubmit(e) {
        e.preventDefault();
        
        try {
            const formData = this.buildFormData();
            
            if (!this.validateFormData(formData)) {
                return;
            }
            
            // NOVA VALIDAÇÃO: Verificar estoque antes de submeter
            if ((formData.tipoVenda === 'V' || formData.tipoVenda === 'L') && formData.posteId) {
                const quantidade = formData.quantidade || 1;
                const estoqueDisponivel = await this.checkEstoqueAPI(formData.posteId, quantidade);
                
                if (!estoqueDisponivel) {
                    this.showAlert('Estoque insuficiente para realizar esta venda', 'error');
                    return;
                }
            }
            
            this.setLoading(true);
            
            await this.apiRequest('/vendas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            
            this.showAlert('Venda criada com sucesso! Estoque atualizado automaticamente.', 'success');
            this.resetForm();
            await this.loadData();
            
        } catch (error) {
            console.error('Erro ao criar venda:', error);
            this.showAlert('Erro ao criar venda: ' + error.message, 'error');
        } finally {
            this.setLoading(false);
        }
    }

    async handleEditSubmit(e) {
        e.preventDefault();
        
        try {
            const formData = this.buildEditFormData();
            
            if (!this.validateEditFormData(formData)) {
                return;
            }
            
            this.setLoading(true);
            
            await this.apiRequest(`/vendas/${this.state.currentEditId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            
            this.showAlert('Venda atualizada com sucesso!', 'success');
            this.closeModal(this.elements.editModal);
            await this.loadData();
            
        } catch (error) {
            console.error('Erro ao atualizar venda:', error);
            this.showAlert('Erro ao atualizar venda: ' + error.message, 'error');
        } finally {
            this.setLoading(false);
        }
    }

    buildFormData() {
        const tipoVenda = this.elements.vendaTipo.value;
        const dataVenda = this.elements.vendaData.value;
        const observacoes = this.elements.vendaObservacoes.value.trim();
        
        let formData = {
            tipoVenda,
            dataVenda,
            observacoes: observacoes || null
        };
        
        switch (tipoVenda) {
            case 'E':
                formData.valorExtra = parseFloat(this.elements.valorExtra.value);
                break;
                
            case 'V':
                formData.posteId = parseInt(this.elements.posteV.value);
                formData.quantidade = parseInt(this.elements.quantidadeV.value) || 1;
                formData.valorVenda = parseFloat(this.elements.valorTotalV.value);
                break;
                
            case 'L':
                formData.posteId = parseInt(this.elements.posteL.value);
                formData.quantidade = parseInt(this.elements.quantidadeL.value) || 1;
                formData.freteEletrons = parseFloat(this.elements.freteL.value) || 0;
                break;
        }
        
        return formData;
    }

    buildEditFormData() {
        const tipoVenda = this.elements.editTipoVenda.value;
        const observacoes = this.elements.editObservacoes.value.trim();
        
        let formData = {
            observacoes: observacoes || null
        };
        
        switch (tipoVenda) {
            case 'E':
                formData.valorExtra = parseFloat(this.elements.editValorExtra.value);
                break;
            case 'V':
                formData.valorVenda = parseFloat(this.elements.editValorTotal.value);
                break;
            case 'L':
                formData.freteEletrons = parseFloat(this.elements.editFreteEletrons.value) || 0;
                break;
        }
        
        return formData;
    }

    // ===== VALIDATION =====
    validateFormData(data) {
        const validationRules = {
            common: [
                { condition: !data.tipoVenda || !data.dataVenda, message: 'Tipo de venda e data são obrigatórios' }
            ],
            E: [
                { condition: !data.valorExtra || data.valorExtra <= 0, message: 'Valor extra deve ser maior que zero' }
            ],
            V: [
                { condition: !data.posteId, message: 'Selecione um poste para venda normal' },
                { condition: !data.valorVenda || data.valorVenda <= 0, message: 'Valor de venda deve ser maior que zero' }
            ],
            L: [
                { condition: !data.posteId, message: 'Selecione um poste de referência para venda loja' }
            ]
        };
        
        return this.runValidation(validationRules, data);
    }

    validateEditFormData(data) {
        const tipoVenda = this.elements.editTipoVenda.value;
        
        const validationRules = {
            E: [
                { condition: !data.valorExtra || data.valorExtra <= 0, message: 'Valor extra deve ser maior que zero' }
            ],
            V: [
                { condition: !data.valorVenda || data.valorVenda <= 0, message: 'Valor de venda deve ser maior que zero' }
            ]
        };
        
        if (validationRules[tipoVenda]) {
            return this.runValidation({ [tipoVenda]: validationRules[tipoVenda] }, data);
        }
        
        return true;
    }

    runValidation(rules, data) {
        const tipoVenda = data.tipoVenda || this.elements.editTipoVenda.value;
        
        // Check common rules
        if (rules.common) {
            for (const rule of rules.common) {
                if (rule.condition) {
                    this.showAlert(rule.message, 'warning');
                    return false;
                }
            }
        }
        
        // Check type-specific rules
        if (rules[tipoVenda]) {
            for (const rule of rules[tipoVenda]) {
                if (rule.condition) {
                    this.showAlert(rule.message, 'warning');
                    return false;
                }
            }
        }
        
        return true;
    }

    // ===== CRUD OPERATIONS =====
    async editVenda(id) {
        try {
            const venda = this.state.vendas.find(v => v.id === id);
            
            if (!venda) {
                throw new Error('Venda não encontrada');
            }
            
            this.populateEditForm(venda);
            this.state.currentEditId = id;
            this.showModal(this.elements.editModal);
            
        } catch (error) {
            console.error('Erro ao carregar venda para edição:', error);
            this.showAlert('Erro ao carregar dados da venda', 'error');
        }
    }

    async deleteVenda(id) {
        try {
            if (!this.validateId(id)) return;
            
            const confirmed = await this.showConfirmDialog(
                'Confirmar Exclusão',
                'Tem certeza que deseja excluir esta venda? O estoque será devolvido automaticamente.'
            );
            
            if (!confirmed) return;
            
            this.setLoading(true);
            console.log(`🗑️ Deletando venda ID: ${id}`);
            
            await this.apiRequest(`/vendas/${id}`, { method: 'DELETE' });
            
            console.log(`✅ Venda ${id} deletada com sucesso`);
            this.showAlert('Venda excluída com sucesso! Estoque devolvido automaticamente.', 'success');
            
            await this.loadData();
            
        } catch (error) {
            console.error(`❌ Erro ao excluir venda ${id}:`, error);
            this.handleDeleteError(error);
        } finally {
            this.setLoading(false);
        }
    }

    // ===== UI HELPERS =====
    handleTipoVendaChange(e) {
        const tipo = e.target.value;
        
        this.hideAllConditionalFields();
        this.limparAvisoEstoque();
        
        if (tipo) {
            const camposDiv = document.getElementById(`campos-tipo-${tipo.toLowerCase()}`);
            if (camposDiv) {
                camposDiv.style.display = 'block';
            }
        }
        
        this.clearOtherTypeFields(tipo);
    }

    handleEditTipoChange(e) {
        const tipo = e.target.value;
        
        // Show/hide edit groups based on type
        const groupsConfig = {
            E: { frete: false, valor: false, extra: true },
            V: { frete: false, valor: true, extra: false },
            L: { frete: true, valor: true, extra: false }
        };
        
        const config = groupsConfig[tipo] || { frete: true, valor: true, extra: false };
        
        if (this.elements.editFreteGroup) this.elements.editFreteGroup.style.display = config.frete ? 'block' : 'none';
        if (this.elements.editValorGroup) this.elements.editValorGroup.style.display = config.valor ? 'block' : 'none';
        if (this.elements.editExtraGroup) this.elements.editExtraGroup.style.display = config.extra ? 'block' : 'none';
    }

    hideAllConditionalFields() {
        [this.elements.camposTipoE, this.elements.camposTipoV, this.elements.camposTipoL]
            .forEach(el => el && (el.style.display = 'none'));
    }

    clearOtherTypeFields(currentType) {
        const fieldGroups = {
            'E': [this.elements.valorExtra],
            'V': [this.elements.posteV, this.elements.quantidadeV, this.elements.valorTotalV],
            'L': [this.elements.posteL, this.elements.quantidadeL, this.elements.freteL]
        };
        
        Object.entries(fieldGroups).forEach(([tipo, campos]) => {
            if (tipo !== currentType) {
                campos.forEach(campo => campo && (campo.value = ''));
            }
        });
    }

    calcularValorVenda() {
        if (!this.elements.posteV || !this.elements.quantidadeV || !this.elements.valorTotalV) return;
        
        const posteId = parseInt(this.elements.posteV.value);
        const quantidade = parseInt(this.elements.quantidadeV.value) || 1;
        
        if (posteId) {
            const poste = this.state.postes.find(p => p.id === posteId);
            if (poste) {
                const valorCalculado = poste.preco * quantidade;
                this.elements.valorTotalV.value = valorCalculado.toFixed(2);
            }
        }
    }

    populatePosteSelects() {
        [this.elements.posteV, this.elements.posteL]
            .filter(select => select)
            .forEach(select => {
                // Clear existing options except first
                while (select.children.length > 1) {
                    select.removeChild(select.lastChild);
                }
                
                // Add poste options
                this.state.postes.forEach(poste => {
                    const option = document.createElement('option');
                    option.value = poste.id;
                    option.textContent = `${poste.codigo} - ${poste.descricao} (${this.formatCurrency(poste.preco)})`;
                    select.appendChild(option);
                });
            });
    }

    populateEditForm(venda) {
        this.elements.editTipoVenda.value = venda.tipoVenda;
        this.elements.editObservacoes.value = venda.observacoes || '';
        
        switch (venda.tipoVenda) {
            case 'E':
                this.elements.editValorExtra.value = venda.valorExtra || '';
                break;
            case 'V':
                this.elements.editValorTotal.value = venda.valorVenda || '';
                break;
            case 'L':
                this.elements.editFreteEletrons.value = venda.freteEletrons || '';
                break;
        }
        
        this.handleEditTipoChange({ target: { value: venda.tipoVenda } });
    }

    // ===== DISPLAY METHODS =====
    displayVendas(vendas) {
        if (!this.elements.vendasTable) return;
        
        if (!vendas || vendas.length === 0) {
            this.displayEmptyState();
            return;
        }
        
        this.elements.vendasTable.innerHTML = '';
        
        vendas.forEach(venda => {
            const row = this.createVendaRow(venda);
            this.elements.vendasTable.appendChild(row);
        });
    }

    createVendaRow(venda) {
        const row = document.createElement('tr');
        
        // Adicionar indicador visual para vendas que afetaram estoque
        let estoqueIndicator = '';
        if ((venda.tipoVenda === 'V' || venda.tipoVenda === 'L') && venda.quantidade > 0) {
            estoqueIndicator = `<small style="color: #059669; font-weight: 500;">📦 Estoque: -${venda.quantidade}</small>`;
        }
        
        row.innerHTML = `
            <td class="date" data-label="Data">${this.formatDateBR(venda.dataVenda)}</td>
            <td data-label="Tipo">
                <span class="status ${venda.tipoVenda.toLowerCase()}">
                    ${this.getTipoVendaLabel(venda.tipoVenda)}
                </span>
            </td>
            <td data-label="Poste/Descrição">
                ${this.getPosteDescricao(venda)}
                ${estoqueIndicator}
            </td>
            <td class="currency" data-label="Frete">${this.formatCurrency(venda.freteEletrons || 0)}</td>
            <td class="currency" data-label="Valor">${this.getValorVenda(venda)}</td>
            <td data-label="Observações">
                <div class="observacoes-cell" title="${venda.observacoes || ''}">
                    ${venda.observacoes || '-'}
                </div>
            </td>
            <td data-label="Ações">
                <div class="table-actions">
                    <button class="btn btn-primary btn-small" onclick="vendasManager.editVenda(${venda.id})" title="Editar">
                        <span class="btn-icon">✏️</span>
                        Editar
                    </button>
                    <button class="btn btn-danger btn-small" onclick="vendasManager.deleteVenda(${venda.id})" title="Excluir (Devolve Estoque)">
                        <span class="btn-icon">🗑️</span>
                        Excluir
                    </button>
                </div>
            </td>
        `;
        return row;
    }

    displayEmptyState() {
        this.elements.vendasTable.innerHTML = `
            <tr>
                <td colspan="7" class="empty-table">
                    <div class="empty-state">
                        <div class="empty-icon">📋</div>
                        <h3>Nenhuma venda encontrada</h3>
                        <p>Comece cadastrando sua primeira venda no formulário acima.</p>
                        <button class="btn btn-primary" onclick="vendasManager.scrollToForm()">
                            Cadastrar Primeira Venda
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    displayVendasError() {
        if (this.elements.vendasTable) {
            this.elements.vendasTable.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-table">
                        <div class="empty-state">
                            <div class="empty-icon">❌</div>
                            <h3>Erro ao carregar vendas</h3>
                            <button class="btn btn-secondary" onclick="vendasManager.loadData()">
                                Tentar Novamente
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }
    }

    updateResumo() {
        const vendas = this.state.vendas;
        
        const resumo = {
            totalE: vendas.filter(v => v.tipoVenda === 'E').length,
            totalV: vendas.filter(v => v.tipoVenda === 'V').length,
            totalL: vendas.filter(v => v.tipoVenda === 'L').length,
            totalGeral: vendas.length
        };
        
        this.updateResumoCards(resumo);
    }

    updateResumoCards(resumo) {
        const cardElements = {
            'total-vendas-e': resumo.totalE,
            'total-vendas-v': resumo.totalV,
            'total-vendas-l': resumo.totalL,
            'total-vendas-geral': resumo.totalGeral
        };
        
        Object.entries(cardElements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value.toString();
            }
        });
    }

    // ===== FILTERS =====
    applyFilters() {
        const { tipo, dataInicio, dataFim } = this.state.filters;
        
        let filtered = [...this.state.vendas];
        
        if (tipo) {
            filtered = filtered.filter(v => v.tipoVenda === tipo);
        }
        
        if (dataInicio) {
            const dataInicioObj = new Date(dataInicio + 'T00:00:00');
            filtered = filtered.filter(v => new Date(v.dataVenda) >= dataInicioObj);
        }
        
        if (dataFim) {
            const dataFimObj = new Date(dataFim + 'T23:59:59');
            filtered = filtered.filter(v => new Date(v.dataVenda) <= dataFimObj);
        }
        
        this.state.filteredVendas = filtered;
        this.displayVendas(filtered);
    }

    limparFiltros() {
        // Reset filter inputs
        if (this.elements.filtroTipoVenda) this.elements.filtroTipoVenda.value = '';
        if (this.elements.filtroDataInicio) this.elements.filtroDataInicio.value = '';
        if (this.elements.filtroDataFim) this.elements.filtroDataFim.value = '';
        
        // Reset state
        this.state.filters = { tipo: '', dataInicio: '', dataFim: '' };
        
        this.applyFilters();
        this.showAlert('Filtros limpos', 'success');
    }

    // ===== UTILITY METHODS =====
    setDefaultDateTime() {
        if (this.elements.vendaData) {
            const agora = new Date();
            const dataFormatada = agora.getFullYear() + '-' + 
                String(agora.getMonth() + 1).padStart(2, '0') + '-' + 
                String(agora.getDate()).padStart(2, '0') + 'T' + 
                String(agora.getHours()).padStart(2, '0') + ':' + 
                String(agora.getMinutes()).padStart(2, '0');
            
            this.elements.vendaData.value = dataFormatada;
        }
    }

    setDefaultDateFilters() {
        const hoje = new Date();
        const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        
        if (this.elements.filtroDataInicio) {
            this.elements.filtroDataInicio.value = this.dateToInputValue(primeiroDiaMes);
            this.state.filters.dataInicio = this.elements.filtroDataInicio.value;
        }
        
        if (this.elements.filtroDataFim) {
            this.elements.filtroDataFim.value = this.dateToInputValue(hoje);
            this.state.filters.dataFim = this.elements.filtroDataFim.value;
        }
    }

    resetForm() {
        if (this.elements.vendaForm) {
            this.elements.vendaForm.reset();
            this.hideAllConditionalFields();
            this.limparAvisoEstoque();
            this.setDefaultDateTime();
        }
    }

    validateId(id) {
        if (!id || id <= 0) {
            this.showAlert('ID da venda inválido', 'error');
            return false;
        }
        return true;
    }

    handleDeleteError(error) {
        if (error.message.includes('404')) {
            this.showAlert('Venda não encontrada', 'error');
        } else if (error.message.includes('400')) {
            this.showAlert('Dados inválidos para exclusão', 'error');
        } else if (error.message.includes('500')) {
            this.showAlert('Erro interno do servidor', 'error');
        } else {
            this.showAlert('Erro ao excluir venda: ' + error.message, 'error');
        }
    }

    scrollToForm() {
        if (this.elements.vendaForm) {
            this.elements.vendaForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
            
            const firstInput = this.elements.vendaForm.querySelector('input, select, textarea');
            if (firstInput) {
                firstInput.focus();
            }
        }
    }

    exportarVendas() {
        if (!this.state.filteredVendas || this.state.filteredVendas.length === 0) {
            this.showAlert('Nenhuma venda para exportar', 'warning');
            return;
        }
        
        const dadosExportar = this.state.filteredVendas.map(venda => ({
            'Data': this.formatDateBR(venda.dataVenda),
            'Tipo': this.getTipoVendaLabel(venda.tipoVenda),
            'Poste': this.getPosteDescricao(venda),
            'Quantidade': venda.quantidade || 1,
            'Frete': venda.freteEletrons || 0,
            'Valor': venda.tipoVenda === 'E' ? venda.valorExtra : 
                     venda.tipoVenda === 'V' ? venda.valorVenda : 0,
            'Observações': venda.observacoes || '',
            'Impacto Estoque': (venda.tipoVenda === 'V' || venda.tipoVenda === 'L') ? 
                               `Reduzido ${venda.quantidade || 1} unidades` : 'Sem impacto'
        }));
        
        this.exportToCSV(dadosExportar, `vendas_${new Date().toISOString().split('T')[0]}`);
    }

    // ===== FORMATTERS =====
    formatDateBR(dateString) {
        if (!dateString) return '-';
        
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatCurrency(value) {
        if (value == null || isNaN(value)) return 'R$ 0,00';
        
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    }

    dateToInputValue(date) {
        if (!date) return '';
        
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
    }

    getTipoVendaLabel(tipo) {
        const labels = {
            'E': '📈 Extra',
            'V': '🛒 Normal',
            'L': '🏪 Loja'
        };
        return labels[tipo] || tipo;
    }

    getPosteDescricao(venda) {
        if (venda.tipoVenda === 'E') {
            return '<em>Venda Extra</em>';
        }
        
        if (venda.codigoPoste) {
            const quantidade = venda.quantidade || 1;
            return `${venda.codigoPoste} ${quantidade > 1 ? `(${quantidade}x)` : ''}`;
        }
        
        return 'Poste não encontrado';
    }

    getValorVenda(venda) {
        if (venda.tipoVenda === 'E') {
            return this.formatCurrency(venda.valorExtra || 0);
        } else if (venda.tipoVenda === 'L') {
            return '<em>Só frete</em>';
        } else {
            return this.formatCurrency(venda.valorVenda || 0);
        }
    }

    // ===== UI HELPERS =====
    setLoading(show) {
        this.state.isLoading = show;
        
        if (this.elements.loadingOverlay) {
            this.elements.loadingOverlay.style.display = show ? 'flex' : 'none';
            this.elements.loadingOverlay.setAttribute('aria-hidden', !show);
        }
    }

    showAlert(message, type = 'success', duration = this.config.ALERT_DURATION) {
        if (!this.elements.alertContainer) {
            console.warn('Container de alertas não encontrado');
            return;
        }
        
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.textContent = message;
        alert.setAttribute('role', 'alert');
        
        this.elements.alertContainer.appendChild(alert);
        
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, duration);
        
        console.log(`📢 Alerta: ${message} (${type})`);
    }

    showConfirmDialog(title, message) {
        return new Promise((resolve) => {
            const result = confirm(`${title}\n\n${message}`);
            resolve(result);
        });
    }

    showModal(modal) {
        if (modal) {
            modal.style.display = 'block';
            modal.setAttribute('aria-hidden', 'false');
            
            // Focus management
            const firstInput = modal.querySelector('input, select, textarea, button');
            if (firstInput) {
                firstInput.focus();
            }
        }
    }

    closeModal(modal) {
        if (modal) {
            modal.style.display = 'none';
            modal.setAttribute('aria-hidden', 'true');
        }
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    exportToCSV(data, filename) {
        if (!data || data.length === 0) {
            this.showAlert('Nenhum dado para exportar', 'warning');
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
        
        this.showAlert('Dados exportados com sucesso!', 'success');
    }

    // ===== PUBLIC API METHODS =====
    async refresh() {
        console.log('🔄 Atualizando dados de vendas...');
        await this.loadData();
        this.showAlert('Dados atualizados!', 'success');
    }

    getState() {
        return { ...this.state };
    }

    getFilteredVendas() {
        return [...this.state.filteredVendas];
    }

    // ===== ERROR HANDLING =====
    handleError(error, context = 'Operação') {
        console.error(`Erro em ${context}:`, error);
        
        const userMessage = this.getUserFriendlyErrorMessage(error);
        this.showAlert(`${context}: ${userMessage}`, 'error');
    }

    getUserFriendlyErrorMessage(error) {
        if (error.message.includes('fetch')) {
            return 'Erro de conexão com o servidor';
        }
        if (error.message.includes('404')) {
            return 'Recurso não encontrado';
        }
        if (error.message.includes('400')) {
            return 'Dados inválidos';
        }
        if (error.message.includes('500')) {
            return 'Erro interno do servidor';
        }
        
        return error.message || 'Erro desconhecido';
    }
}

// ===== GLOBAL FUNCTIONS (for backward compatibility) =====
let vendasManager;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    vendasManager = new VendasManager();
});

// Global functions for onclick handlers
window.editVenda = (id) => vendasManager?.editVenda(id);
window.deleteVenda = (id) => vendasManager?.deleteVenda(id);
window.exportarVendas = () => vendasManager?.exportarVendas();
window.limparFiltros = () => vendasManager?.limparFiltros();
window.scrollToForm = () => vendasManager?.scrollToForm();
window.closeModal = (modalId) => {
    const modal = document.getElementById(modalId);
    vendasManager?.closeModal(modal);
};

// Utility functions
window.loadVendas = () => vendasManager?.loadData();

console.log('✅ VendasManager com integração de estoque carregado com sucesso');