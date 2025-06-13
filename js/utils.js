// Funções utilitárias globais
const Utils = {
    
    // Formatação de números
    formatNumber(value, decimals = 0) {
        if (value == null || isNaN(value)) return '0';
        return Number(value).toLocaleString('pt-BR', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    },

    // Formatação de moeda
    formatCurrency(value) {
        return APIUtils.formatCurrency(value);
    },

    // Formatação de percentual
    formatPercent(value) {
        if (value == null || isNaN(value)) return '0%';
        return (value * 100).toFixed(1) + '%';
    },

    // Formatação de data
    formatDate(dateString) {
        return APIUtils.formatDate(dateString);
    },

    // Formatação de data simples
    formatDateSimple(dateString) {
        return APIUtils.formatDateSimple(dateString);
    },

    // Validação de email
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    // Validação de CPF
    isValidCPF(cpf) {
        const cleanCPF = cpf.replace(/\D/g, '');
        if (cleanCPF.length !== 11) return false;
        
        // Verificar se todos os dígitos são iguais
        if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
        
        // Validar dígitos verificadores
        let sum = 0;
        for (let i = 0; i < 9; i++) {
            sum += parseInt(cleanCPF[i]) * (10 - i);
        }
        let remainder = sum % 11;
        let digit1 = remainder < 2 ? 0 : 11 - remainder;
        
        if (parseInt(cleanCPF[9]) !== digit1) return false;
        
        sum = 0;
        for (let i = 0; i < 10; i++) {
            sum += parseInt(cleanCPF[i]) * (11 - i);
        }
        remainder = sum % 11;
        let digit2 = remainder < 2 ? 0 : 11 - remainder;
        
        return parseInt(cleanCPF[10]) === digit2;
    },

    // Formatação de CPF
    formatCPF(cpf) {
        const cleanCPF = cpf.replace(/\D/g, '');
        return cleanCPF.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    },

    // Formatação de telefone
    formatPhone(phone) {
        const cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.length === 11) {
            return cleanPhone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
        } else if (cleanPhone.length === 10) {
            return cleanPhone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
        }
        return phone;
    },

    // Limpar texto
    sanitizeText(text) {
        if (!text) return '';
        return text.toString().trim().replace(/\s+/g, ' ');
    },

    // Capitalizar primeira letra
    capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    },

    // Capitalizar todas as palavras
    capitalizeWords(str) {
        if (!str) return '';
        return str.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    },

    // Gerar ID único
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    // Delay/sleep
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    // Copiar texto para clipboard
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            showAlert('Texto copiado para a área de transferência!', 'success');
            return true;
        } catch (err) {
            console.error('Erro ao copiar texto:', err);
            showAlert('Erro ao copiar texto', 'error');
            return false;
        }
    },

    // Download de arquivo
    downloadFile(data, filename, type = 'text/plain') {
        const blob = new Blob([data], { type });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    },

    // Exportar dados para CSV
    exportToCSV(data, filename) {
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
                    // Escapar aspas
                    if (typeof value === 'string' && value.includes(',')) {
                        value = `"${value.replace(/"/g, '""')}"`;
                    }
                    return value;
                }).join(',')
            )
        ].join('\n');

        this.downloadFile(csv, `${filename}.csv`, 'text/csv');
        showAlert('Dados exportados com sucesso!', 'success');
    },

    // Validar formulário
    validateForm(formElement) {
        const errors = [];
        const requiredFields = formElement.querySelectorAll('[required]');
        
        requiredFields.forEach(field => {
            const value = field.value.trim();
            const fieldName = field.getAttribute('name') || field.id;
            
            if (!value) {
                errors.push(`${fieldName} é obrigatório`);
                field.classList.add('error');
            } else {
                field.classList.remove('error');
                
                // Validações específicas
                if (field.type === 'email' && !this.isValidEmail(value)) {
                    errors.push(`${fieldName} deve ser um email válido`);
                    field.classList.add('error');
                }
                
                if (field.dataset.validation === 'cpf' && !this.isValidCPF(value)) {
                    errors.push(`${fieldName} deve ser um CPF válido`);
                    field.classList.add('error');
                }
            }
        });

        return errors;
    },

    // Máscara para inputs
    applyMask(input, mask) {
        input.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            let maskedValue = '';
            let valueIndex = 0;

            for (let i = 0; i < mask.length && valueIndex < value.length; i++) {
                if (mask[i] === '9') {
                    maskedValue += value[valueIndex];
                    valueIndex++;
                } else {
                    maskedValue += mask[i];
                }
            }

            e.target.value = maskedValue;
        });
    },

    // Confirmar ação
    async confirm(message, title = 'Confirmação') {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.style.display = 'flex';
            
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 400px;">
                    <div class="modal-header">
                        <h3>${title}</h3>
                    </div>
                    <div style="padding: 20px 30px;">
                        <p>${message}</p>
                    </div>
                    <div class="modal-actions">
                        <button class="btn btn-secondary" id="cancel-btn">Cancelar</button>
                        <button class="btn btn-danger" id="confirm-btn">Confirmar</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            const cancelBtn = modal.querySelector('#cancel-btn');
            const confirmBtn = modal.querySelector('#confirm-btn');
            
            cancelBtn.addEventListener('click', () => {
                document.body.removeChild(modal);
                resolve(false);
            });
            
            confirmBtn.addEventListener('click', () => {
                document.body.removeChild(modal);
                resolve(true);
            });
            
            // Fechar com ESC
            const handleEsc = (e) => {
                if (e.key === 'Escape') {
                    document.body.removeChild(modal);
                    document.removeEventListener('keydown', handleEsc);
                    resolve(false);
                }
            };
            
            document.addEventListener('keydown', handleEsc);
        });
    },

    // Debounce
    debounce(func, wait) {
        return APIUtils.debounce(func, wait);
    },

    // Throttle
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    // Scroll suave
    smoothScrollTo(element) {
        if (typeof element === 'string') {
            element = document.querySelector(element);
        }
        
        if (element) {
            element.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    },

    // Detectar dispositivo móvel
    isMobile() {
        return window.innerWidth <= 768;
    },

    // Observar mudanças de tamanho
    onResize(callback) {
        const debouncedCallback = this.debounce(callback, 250);
        window.addEventListener('resize', debouncedCallback);
        return () => window.removeEventListener('resize', debouncedCallback);
    }
};

// Extensões para elementos DOM
HTMLElement.prototype.show = function() {
    this.style.display = 'block';
    return this;
};

HTMLElement.prototype.hide = function() {
    this.style.display = 'none';
    return this;
};

HTMLElement.prototype.toggle = function() {
    this.style.display = this.style.display === 'none' ? 'block' : 'none';
    return this;
};

// Exportar para uso global
window.Utils = Utils;