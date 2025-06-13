// JavaScript da página de Vendas
let vendasData = {
    vendas: [],
    itens: [],
    postes: [],
    currentEditId: null,
    currentEditType: null
};

// Função de inicialização da página
window.initVendasPage = async function() {
    console.log('🎯 Inicializando página de Vendas...');
    
    try {
        await loadVendas();
        await loadItensVenda();
        await loadSelectOptions();
        setupEventListeners();
        
        console.log('✅ Página de Vendas carregada com sucesso');
    } catch (error) {
        console.error('❌ Erro ao carregar página de Vendas:', error);
        showAlert('Erro ao carregar dados de vendas', 'error');
    }
};

// Configurar event listeners
function setupEventListeners() {
    // Formulário de nova venda
    const vendaForm = document.getElementById('venda-form');
    if (vendaForm) {
        vendaForm.addEventListener('submit', handleVendaSubmit);
    }
    
    // Formulário de item de venda
    const itemVendaForm = document.getElementById('item-venda-form');
    if (itemVendaForm) {
        itemVendaForm.addEventListener('submit', handleItemVendaSubmit);
    }
    
    // Formulário de edição de venda
    const editVendaForm = document.getElementById('edit-venda-form');
    if (editVendaForm) {
        editVendaForm.addEventListener('submit', handleEditVendaSubmit);
    }
    
    // Formulário de edição de item
    const editItemForm = document.getElementById('edit-item-form');
    if (editItemForm) {
        editItemForm.addEventListener('submit', handleEditItemSubmit);
    }
    
    // Select de poste - atualizar preço
    const selectPoste = document.getElementById('select-poste');
    if (selectPoste) {
        selectPoste.addEventListener('change', handlePosteChange);
    }
    
    // Quantidade e preço - calcular subtotal
    const quantidade = document.getElementById('quantidade');
    const precoUnitario = document.getElementById('preco-unitario');
    
    if (quantidade && precoUnitario) {
        [quantidade, precoUnitario].forEach(input => {
            input.addEventListener('input', updateSubtotalPreview);
        });
    }
    
    // Inputs de edição de item - calcular subtotal
    const editQuantidade = document.getElementById('edit-item-quantidade');
    const editPreco = document.getElementById('edit-item-preco');
    
    if (editQuantidade && editPreco) {
        [editQuantidade, editPreco].forEach(input => {
            input.addEventListener('input', updateEditItemSubtotal);
        });
    }
}

// Carregar vendas
async function loadVendas() {
    try {
        const vendas = await VendaService.getAll();
        vendasData.vendas = vendas;
        displayVendas(vendas);
    } catch (error) {
        console.error('Erro ao carregar vendas:', error);
        displayVendasError();
    }
}

// Exibir vendas na tabela
function displayVendas(vendas) {
    const tbody = document.querySelector('#vendas-table tbody');
    if (!tbody) return;
    
    if (!vendas || vendas.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-table">
                    <div class="empty-table-icon">📋</div>
                    <p>Nenhuma venda encontrada</p>
                    <button class="btn btn-primary" onclick="scrollToForm()">Cadastrar Primeira Venda</button>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = '';
    
    vendas.forEach(venda => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="date" data-label="Data">${Utils.formatDate(venda.dataVenda)}</td>
            <td class="currency" data-label="Frete">${Utils.formatCurrency(venda.totalFreteEletrons)}</td>
            <td class="currency" data-label="Comissão">${Utils.formatCurrency(venda.totalComissao)}</td>
            <td class="currency" data-label="Valor Total">${Utils.formatCurrency(venda.valorTotalInformado)}</td>
            <td data-label="Observações">${venda.observacoes || '-'}</td>
            <td data-label="Ações">
                <div class="table-actions">
                    <button class="btn btn-primary btn-small" onclick="editVenda(${venda.id})" title="Editar">
                        <span class="btn-icon">✏️</span>
                        Editar
                    </button>
                    <button class="btn btn-danger btn-small" onclick="deleteVenda(${venda.id})" title="Excluir">
                        <span class="btn-icon">🗑️</span>
                        Excluir
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Exibir erro ao carregar vendas
function displayVendasError() {
    const tbody = document.querySelector('#vendas-table tbody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-table">
                    <div class="empty-table-icon">❌</div>
                    <p>Erro ao carregar vendas</p>
                    <button class="btn btn-secondary" onclick="loadVendas()">Tentar Novamente</button>
                </td>
            </tr>
        `;
    }
}

// Carregar itens de venda
async function loadItensVenda() {
    try {
        const itens = await ItemVendaService.getAll();
        vendasData.itens = itens;
        displayItensVenda(itens);
    } catch (error) {
        console.error('Erro ao carregar itens de venda:', error);
        displayItensVendaError();
    }
}

// Exibir itens de venda
function displayItensVenda(itens) {
    const tbody = document.querySelector('#itens-venda-table tbody');
    if (!tbody) return;
    
    if (!itens || itens.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-table">
                    <div class="empty-table-icon">📦</div>
                    <p>Nenhum item encontrado</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = '';
    
    itens.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td data-label="Venda">Venda #${item.venda?.id || 'N/A'}</td>
            <td data-label="Código">${item.poste?.codigo || 'N/A'}</td>
            <td data-label="Descrição">${item.poste?.descricao || 'N/A'}</td>
            <td data-label="Quantidade">${item.quantidade}</td>
            <td class="currency" data-label="Preço Unit.">${Utils.formatCurrency(item.precoUnitario)}</td>
            <td class="currency" data-label="Subtotal">${Utils.formatCurrency(item.subtotal)}</td>
            <td data-label="Ações">
                <div class="table-actions">
                    <button class="btn btn-primary btn-small" onclick="editItem(${item.id})" title="Editar">
                        <span class="btn-icon">✏️</span>
                        Editar
                    </button>
                    <button class="btn btn-danger btn-small" onclick="deleteItem(${item.id})" title="Excluir">
                        <span class="btn-icon">🗑️</span>
                        Excluir
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Exibir erro ao carregar itens
function displayItensVendaError() {
    const tbody = document.querySelector('#itens-venda-table tbody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-table">
                    <div class="empty-table-icon">❌</div>
                    <p>Erro ao carregar itens</p>
                    <button class="btn btn-secondary" onclick="loadItensVenda()">Tentar Novamente</button>
                </td>
            </tr>
        `;
    }
}

// Carregar opções dos selects
async function loadSelectOptions() {
    try {
        // Carregar vendas para select
        const vendas = await VendaService.getAll();
        const selectVenda = document.getElementById('select-venda');
        if (selectVenda) {
            selectVenda.innerHTML = '<option value="">Selecione uma venda</option>';
            vendas.forEach(venda => {
                const option = document.createElement('option');
                option.value = venda.id;
                option.textContent = `Venda #${venda.id} - ${Utils.formatDateSimple(venda.dataVenda)}`;
                selectVenda.appendChild(option);
            });
        }
        
        // Carregar postes para select
        const postes = await PosteService.getActive();
        vendasData.postes = postes;
        const selectPoste = document.getElementById('select-poste');
        if (selectPoste) {
            selectPoste.innerHTML = '<option value="">Selecione um poste</option>';
            postes.forEach(poste => {
                const option = document.createElement('option');
                option.value = poste.id;
                option.textContent = `${poste.codigo} - ${poste.descricao}`;
                option.dataset.preco = poste.preco;
                selectPoste.appendChild(option);
            });
        }
        
    } catch (error) {
        console.error('Erro ao carregar opções dos selects:', error);
    }
}

// Handlers de formulários
async function handleVendaSubmit(e) {
    e.preventDefault();
    
    const formData = {
        totalFreteEletrons: parseFloat(document.getElementById('frete-eletrons').value) || 0,
        totalComissao: parseFloat(document.getElementById('comissao').value) || 0,
        valorTotalInformado: parseFloat(document.getElementById('valor-total').value) || 0,
        observacoes: document.getElementById('observacoes').value.trim()
    };
    
    try {
        await VendaService.create(formData);
        showAlert('Venda criada com sucesso!', 'success');
        
        // Resetar formulário
        e.target.reset();
        
        // Recarregar dados
        await loadVendas();
        await loadSelectOptions();
        
    } catch (error) {
        console.error('Erro ao criar venda:', error);
        showAlert('Erro ao criar venda', 'error');
    }
}

async function handleItemVendaSubmit(e) {
    e.preventDefault();
    
    const vendaId = document.getElementById('select-venda').value;
    const posteId = document.getElementById('select-poste').value;
    const quantidade = parseInt(document.getElementById('quantidade').value);
    const precoUnitario = parseFloat(document.getElementById('preco-unitario').value);
    
    if (!vendaId || !posteId || !quantidade || !precoUnitario) {
        showAlert('Preencha todos os campos obrigatórios', 'warning');
        return;
    }
    
    const itemData = {
        venda: { id: parseInt(vendaId) },
        poste: { id: parseInt(posteId) },
        quantidade: quantidade,
        precoUnitario: precoUnitario
    };
    
    try {
        await ItemVendaService.create(itemData);
        showAlert('Item adicionado com sucesso!', 'success');
        
        // Resetar formulário
        e.target.reset();
        document.getElementById('preco-unitario').value = '';
        document.getElementById('subtotal-preview').style.display = 'none';
        
        // Recarregar dados
        await loadItensVenda();
        
    } catch (error) {
        console.error('Erro ao adicionar item:', error);
        showAlert('Erro ao adicionar item', 'error');
    }
}

// Handlers de mudança
function handlePosteChange(e) {
    const selectedOption = e.target.options[e.target.selectedIndex];
    const precoInput = document.getElementById('preco-unitario');
    
    if (selectedOption.dataset.preco && precoInput) {
        precoInput.value = selectedOption.dataset.preco;
        updateSubtotalPreview();
    }
}

function updateSubtotalPreview() {
    const quantidade = parseInt(document.getElementById('quantidade').value) || 0;
    const preco = parseFloat(document.getElementById('preco-unitario').value) || 0;
    const subtotal = quantidade * preco;
    
    const preview = document.getElementById('subtotal-preview');
    const valor = document.getElementById('subtotal-valor');
    
    if (preview && valor) {
        valor.textContent = Utils.formatCurrency(subtotal);
        preview.style.display = subtotal > 0 ? 'block' : 'none';
    }
}

function updateEditItemSubtotal() {
    const quantidade = parseInt(document.getElementById('edit-item-quantidade').value) || 0;
    const preco = parseFloat(document.getElementById('edit-item-preco').value) || 0;
    const subtotal = quantidade * preco;
    
    const subtotalElement = document.getElementById('edit-item-subtotal');
    if (subtotalElement) {
        subtotalElement.textContent = Utils.formatCurrency(subtotal);
    }
}

// Funções de edição
window.editVenda = async function(id) {
    try {
        const venda = await VendaService.getById(id);
        
        // Preencher formulário de edição
        document.getElementById('edit-frete-eletrons').value = venda.totalFreteEletrons || 0;
        document.getElementById('edit-comissao').value = venda.totalComissao || 0;
        document.getElementById('edit-valor-total').value = venda.valorTotalInformado || 0;
        document.getElementById('edit-observacoes').value = venda.observacoes || '';
        
        // Definir ID atual
        vendasData.currentEditId = id;
        vendasData.currentEditType = 'venda';
        
        // Abrir modal
        document.getElementById('edit-venda-modal').style.display = 'block';
        
    } catch (error) {
        console.error('Erro ao carregar venda para edição:', error);
        showAlert('Erro ao carregar dados da venda', 'error');
    }
};

window.editItem = async function(id) {
    try {
        const item = await ItemVendaService.getById ? await ItemVendaService.getById(id) : 
                     vendasData.itens.find(i => i.id === id);
        
        if (!item) {
            throw new Error('Item não encontrado');
        }
        
        // Preencher formulário de edição
        document.getElementById('edit-item-quantidade').value = item.quantidade;
        document.getElementById('edit-item-preco').value = item.precoUnitario;
        updateEditItemSubtotal();
        
        // Definir ID atual
        vendasData.currentEditId = id;
        vendasData.currentEditType = 'item';
        
        // Abrir modal
        document.getElementById('edit-item-modal').style.display = 'block';
        
    } catch (error) {
        console.error('Erro ao carregar item para edição:', error);
        showAlert('Erro ao carregar dados do item', 'error');
    }
};

// Handlers de edição
async function handleEditVendaSubmit(e) {
    e.preventDefault();
    
    const formData = {
        totalFreteEletrons: parseFloat(document.getElementById('edit-frete-eletrons').value) || 0,
        totalComissao: parseFloat(document.getElementById('edit-comissao').value) || 0,
        valorTotalInformado: parseFloat(document.getElementById('edit-valor-total').value) || 0,
        observacoes: document.getElementById('edit-observacoes').value.trim()
    };
    
    try {
        await VendaService.update(vendasData.currentEditId, formData);
        showAlert('Venda atualizada com sucesso!', 'success');
        
        // Fechar modal
        closeModal('edit-venda-modal');
        
        // Recarregar dados
        await loadVendas();
        
    } catch (error) {
        console.error('Erro ao atualizar venda:', error);
        showAlert('Erro ao atualizar venda', 'error');
    }
}

async function handleEditItemSubmit(e) {
    e.preventDefault();
    
    const formData = {
        quantidade: parseInt(document.getElementById('edit-item-quantidade').value),
        precoUnitario: parseFloat(document.getElementById('edit-item-preco').value)
    };
    
    try {
        await ItemVendaService.update(vendasData.currentEditId, formData);
        showAlert('Item atualizado com sucesso!', 'success');
        
        // Fechar modal
        closeModal('edit-item-modal');
        
        // Recarregar dados
        await loadItensVenda();
        
    } catch (error) {
        console.error('Erro ao atualizar item:', error);
        showAlert('Erro ao atualizar item', 'error');
    }
}

// Funções de exclusão
window.deleteVenda = async function(id) {
    const confirmed = await Utils.confirm(
        'Tem certeza que deseja excluir esta venda?',
        'Confirmar Exclusão'
    );
    
    if (!confirmed) return;
    
    try {
        await VendaService.delete(id);
        showAlert('Venda excluída com sucesso!', 'success');
        await loadVendas();
        await loadSelectOptions();
    } catch (error) {
        console.error('Erro ao excluir venda:', error);
        showAlert('Erro ao excluir venda', 'error');
    }
};

window.deleteItem = async function(id) {
    const confirmed = await Utils.confirm(
        'Tem certeza que deseja excluir este item?',
        'Confirmar Exclusão'
    );
    
    if (!confirmed) return;
    
    try {
        await ItemVendaService.delete(id);
        showAlert('Item excluído com sucesso!', 'success');
        await loadItensVenda();
    } catch (error) {
        console.error('Erro ao excluir item:', error);
        showAlert('Erro ao excluir item', 'error');
    }
};

// Funções de exportação
window.exportarVendas = function() {
    if (!vendasData.vendas || vendasData.vendas.length === 0) {
        showAlert('Nenhuma venda para exportar', 'warning');
        return;
    }
    
    const dadosExportar = vendasData.vendas.map(venda => ({
        'ID': venda.id,
        'Data': Utils.formatDate(venda.dataVenda),
        'Frete Eletrons': venda.totalFreteEletrons || 0,
        'Comissão': venda.totalComissao || 0,
        'Valor Total Informado': venda.valorTotalInformado || 0,
        'Observações': venda.observacoes || ''
    }));
    
    Utils.exportToCSV(dadosExportar, `vendas_${new Date().toISOString().split('T')[0]}`);
};

// Função para rolar até o formulário
window.scrollToForm = function() {
    const form = document.getElementById('venda-form');
    if (form) {
        Utils.smoothScrollTo(form);
        
        // Focar no primeiro campo
        const firstInput = form.querySelector('input, select, textarea');
        if (firstInput) {
            firstInput.focus();
        }
    }
};

// Funções de utilidade específicas para vendas
const VendasUtils = {
    // Calcular total de uma venda
    calcularTotalVenda(itens) {
        return itens.reduce((total, item) => total + (item.subtotal || 0), 0);
    },
    
    // Validar dados de venda
    validarVenda(dados) {
        const erros = [];
        
        if (dados.valorTotalInformado < 0) {
            erros.push('Valor total não pode ser negativo');
        }
        
        if (dados.totalFreteEletrons < 0) {
            erros.push('Frete não pode ser negativo');
        }
        
        if (dados.totalComissao < 0) {
            erros.push('Comissão não pode ser negativa');
        }
        
        return erros;
    },
    
    // Validar item de venda
    validarItem(dados) {
        const erros = [];
        
        if (!dados.vendaId) {
            erros.push('Selecione uma venda');
        }
        
        if (!dados.posteId) {
            erros.push('Selecione um poste');
        }
        
        if (!dados.quantidade || dados.quantidade <= 0) {
            erros.push('Quantidade deve ser maior que zero');
        }
        
        if (!dados.precoUnitario || dados.precoUnitario <= 0) {
            erros.push('Preço unitário deve ser maior que zero');
        }
        
        return erros;
    },
    
    // Buscar venda por ID
    buscarVendaPorId(id) {
        return vendasData.vendas.find(v => v.id === id);
    },
    
    // Buscar item por ID
    buscarItemPorId(id) {
        return vendasData.itens.find(i => i.id === id);
    }
};

// Event listeners adicionais
document.addEventListener('DOMContentLoaded', () => {
    // Configurar máscaras de input quando a página de vendas estiver ativa
    if (AppState.currentPage === 'vendas') {
        setupInputMasks();
    }
});

function setupInputMasks() {
    // Máscara para valores monetários
    const moneyInputs = document.querySelectorAll('input[type="number"][step="0.01"]');
    moneyInputs.forEach(input => {
        input.addEventListener('blur', function() {
            if (this.value) {
                const value = parseFloat(this.value);
                this.value = value.toFixed(2);
            }
        });
    });
}

// Auto-save para formulários (salvar no localStorage)
function setupAutoSave() {
    const forms = ['venda-form', 'item-venda-form'];
    
    forms.forEach(formId => {
        const form = document.getElementById(formId);
        if (!form) return;
        
        const inputs = form.querySelectorAll('input, select, textarea');
        
        inputs.forEach(input => {
            // Carregar valor salvo
            const savedValue = localStorage.getItem(`${formId}_${input.id}`);
            if (savedValue && !input.value) {
                input.value = savedValue;
            }
            
            // Salvar ao digitar
            input.addEventListener('input', Utils.debounce(() => {
                localStorage.setItem(`${formId}_${input.id}`, input.value);
            }, 500));
        });
        
        // Limpar auto-save ao submeter
        form.addEventListener('submit', () => {
            inputs.forEach(input => {
                localStorage.removeItem(`${formId}_${input.id}`);
            });
        });
    });
}

// Configurar auto-save quando a página carregar
setTimeout(setupAutoSave, 1000);

// Exportar utilitários
window.VendasUtils = VendasUtils;