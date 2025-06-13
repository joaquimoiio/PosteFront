// JavaScript da página de Vendas - Versão Simplificada
let vendasData = {
    vendas: [],
    postes: [],
    currentEditId: null
};

// Função de inicialização da página
window.initVendasPage = async function() {
    console.log('🎯 Inicializando página de Vendas...');
    
    try {
        await loadVendas();
        await loadPostes();
        setupEventListeners();
        
        console.log('✅ Página de Vendas carregada com sucesso');
    } catch (error) {
        console.error('❌ Erro ao carregar página de Vendas:', error);
        showAlert('Erro ao carregar dados de vendas', 'error');
    }
};

// Configurar event listeners
function setupEventListeners() {
    // Formulário de nova venda (agora completa)
    const vendaForm = document.getElementById('venda-form');
    if (vendaForm) {
        vendaForm.addEventListener('submit', handleVendaSubmit);
    }
    
    // Formulário de edição de venda
    const editVendaForm = document.getElementById('edit-venda-form');
    if (editVendaForm) {
        editVendaForm.addEventListener('submit', handleEditVendaSubmit);
    }
    
    // Select de poste - atualizar preço sugerido
    const selectPoste = document.getElementById('venda-poste');
    if (selectPoste) {
        selectPoste.addEventListener('change', handlePosteChange);
    }
    
    // Calcular preview do valor baseado na quantidade
    const quantidade = document.getElementById('venda-quantidade');
    if (quantidade) {
        quantidade.addEventListener('input', updatePreviewValor);
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

// Carregar postes para o select
async function loadPostes() {
    try {
        const postes = await PosteService.getActive();
        vendasData.postes = postes;
        
        const selectPoste = document.getElementById('venda-poste');
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
        console.error('Erro ao carregar postes:', error);
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
        const posteInfo = venda.itens && venda.itens[0] ? 
            `${venda.itens[0].codigoPoste} (${venda.itens[0].quantidade}x)` : 
            'N/A';
        
        row.innerHTML = `
            <td class="date" data-label="Data">${Utils.formatDate(venda.dataVenda)}</td>
            <td data-label="Poste">${posteInfo}</td>
            <td class="currency" data-label="Frete">${Utils.formatCurrency(venda.totalFreteEletrons)}</td>
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

// Handler de mudança do poste
function handlePosteChange(e) {
    const selectedOption = e.target.options[e.target.selectedIndex];
    if (selectedOption.dataset.preco) {
        updatePreviewValor();
    }
}

// Atualizar preview do valor baseado no poste e quantidade
function updatePreviewValor() {
    const selectPoste = document.getElementById('venda-poste');
    const quantidade = parseInt(document.getElementById('venda-quantidade').value) || 1;
    const valorTotalInput = document.getElementById('venda-valor-total');
    
    if (selectPoste && selectPoste.selectedIndex > 0) {
        const selectedOption = selectPoste.options[selectPoste.selectedIndex];
        const precoUnitario = parseFloat(selectedOption.dataset.preco) || 0;
        const valorSugerido = precoUnitario * quantidade;
        
        // Apenas sugerir se o campo estiver vazio
        if (valorTotalInput && !valorTotalInput.value) {
            valorTotalInput.placeholder = `Sugerido: ${Utils.formatCurrency(valorSugerido)}`;
        }
    }
}

// Handler do formulário de nova venda (agora completa)
async function handleVendaSubmit(e) {
    e.preventDefault();
    
    const posteId = document.getElementById('venda-poste').value;
    const quantidade = parseInt(document.getElementById('venda-quantidade').value);
    const freteEletrons = parseFloat(document.getElementById('venda-frete').value) || 0;
    const valorTotal = parseFloat(document.getElementById('venda-valor-total').value);
    const observacoes = document.getElementById('venda-observacoes').value.trim();
    
    // Validação
    if (!posteId) {
        showAlert('Selecione um poste', 'warning');
        return;
    }
    
    if (!quantidade || quantidade <= 0) {
        showAlert('Quantidade deve ser maior que zero', 'warning');
        return;
    }
    
    if (!valorTotal || valorTotal <= 0) {
        showAlert('Valor total deve ser maior que zero', 'warning');
        return;
    }
    
    try {
        // Criar a venda completa usando o DTO correto do backend
        const vendaCreateDTO = {
            dataVenda: new Date().toISOString(),
            quantidade: quantidade,
            posteId: parseInt(posteId),
            freteEletrons: freteEletrons,
            valorVenda: valorTotal,
            observacoes: observacoes
        };
        
        await VendaService.create(vendaCreateDTO);
        showAlert('Venda criada com sucesso!', 'success');
        
        // Resetar formulário
        e.target.reset();
        document.getElementById('venda-valor-total').placeholder = '';
        
        // Recarregar dados
        await loadVendas();
        
    } catch (error) {
        console.error('Erro ao criar venda:', error);
        showAlert('Erro ao criar venda', 'error');
    }
}

// Função de edição
window.editVenda = async function(id) {
    try {
        const venda = await VendaService.getById(id);
        
        // Preencher formulário de edição
        document.getElementById('edit-frete-eletrons').value = venda.totalFreteEletrons || 0;
        document.getElementById('edit-valor-total').value = venda.valorTotalInformado || 0;
        document.getElementById('edit-observacoes').value = venda.observacoes || '';
        
        // Definir ID atual
        vendasData.currentEditId = id;
        
        // Abrir modal
        document.getElementById('edit-venda-modal').style.display = 'block';
        
    } catch (error) {
        console.error('Erro ao carregar venda para edição:', error);
        showAlert('Erro ao carregar dados da venda', 'error');
    }
};

// Handler de edição
async function handleEditVendaSubmit(e) {
    e.preventDefault();
    
    const formData = {
        totalFreteEletrons: parseFloat(document.getElementById('edit-frete-eletrons').value) || 0,
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

// Função de exclusão
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
    } catch (error) {
        console.error('Erro ao excluir venda:', error);
        showAlert('Erro ao excluir venda', 'error');
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

// Recarregar vendas
window.loadVendas = loadVendas;