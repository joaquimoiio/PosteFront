// Theme Manager - Gerenciador de Dark Mode
// Este arquivo deve ser incluído em todas as páginas HTML

class ThemeManager {
    constructor() {
        this.storageKey = 'poste-system-theme';
        this.themes = {
            LIGHT: 'light',
            DARK: 'dark',
            AUTO: 'auto'
        };
        
        this.init();
    }
    
    init() {
        // Carregar tema salvo ou usar auto
        const savedTheme = this.getSavedTheme();
        const initialTheme = savedTheme || this.themes.AUTO;
        
        // Aplicar tema inicial
        this.applyTheme(initialTheme);
        
        // Criar botão de toggle
        this.createThemeToggle();
        
        // Listener para mudanças de preferência do sistema
        this.setupSystemThemeListener();
        
        console.log('🎨 Theme Manager inicializado');
    }
    
    getSavedTheme() {
        try {
            return localStorage.getItem(this.storageKey);
        } catch (error) {
            console.warn('Não foi possível acessar localStorage:', error);
            return null;
        }
    }
    
    saveTheme(theme) {
        try {
            localStorage.setItem(this.storageKey, theme);
        } catch (error) {
            console.warn('Não foi possível salvar tema:', error);
        }
    }
    
    getCurrentTheme() {
        return document.documentElement.getAttribute('data-theme') || this.themes.AUTO;
    }
    
    getSystemTheme() {
        return window.matchMedia('(prefers-color-scheme: dark)').matches 
            ? this.themes.DARK 
            : this.themes.LIGHT;
    }
    
    getEffectiveTheme(theme = this.getCurrentTheme()) {
        if (theme === this.themes.AUTO) {
            return this.getSystemTheme();
        }
        return theme;
    }
    
    applyTheme(theme) {
        // Adicionar classe de transição
        document.body.classList.add('theme-transition');
        
        // Remover temas anteriores
        document.documentElement.removeAttribute('data-theme');
        
        // Aplicar novo tema
        if (theme !== this.themes.AUTO) {
            document.documentElement.setAttribute('data-theme', theme);
        }
        
        // Atualizar ícone do toggle
        this.updateToggleIcon();
        
        // Remover classe de transição após animação
        setTimeout(() => {
            document.body.classList.remove('theme-transition');
        }, 250);
        
        // Salvar preferência
        this.saveTheme(theme);
        
        // Dispatch evento customizado
        window.dispatchEvent(new CustomEvent('themeChanged', {
            detail: { theme, effectiveTheme: this.getEffectiveTheme(theme) }
        }));
    }
    
    toggleTheme() {
        const currentTheme = this.getCurrentTheme();
        let nextTheme;
        
        // Ciclo: auto → light → dark → auto
        switch (currentTheme) {
            case this.themes.AUTO:
                nextTheme = this.themes.LIGHT;
                break;
            case this.themes.LIGHT:
                nextTheme = this.themes.DARK;
                break;
            case this.themes.DARK:
                nextTheme = this.themes.AUTO;
                break;
            default:
                nextTheme = this.themes.AUTO;
        }
        
        this.applyTheme(nextTheme);
        
        // Feedback visual
        this.showThemeFeedback(nextTheme);
    }
    
    createThemeToggle() {
        // Verificar se já existe
        if (document.getElementById('theme-toggle')) return;
        
        const toggle = document.createElement('button');
        toggle.id = 'theme-toggle';
        toggle.className = 'theme-toggle';
        toggle.setAttribute('aria-label', 'Alternar tema');
        toggle.setAttribute('title', 'Alternar tema (Auto/Claro/Escuro)');
        toggle.addEventListener('click', () => this.toggleTheme());
        
        // Inserir no DOM
        document.body.appendChild(toggle);
        
        // Atualizar ícone inicial
        this.updateToggleIcon();
    }
    
    updateToggleIcon() {
        const toggle = document.getElementById('theme-toggle');
        if (!toggle) return;
        
        const currentTheme = this.getCurrentTheme();
        const effectiveTheme = this.getEffectiveTheme(currentTheme);
        
        let icon, title;
        
        switch (currentTheme) {
            case this.themes.LIGHT:
                icon = '☀️';
                title = 'Tema Claro (clique para Escuro)';
                break;
            case this.themes.DARK:
                icon = '🌙';
                title = 'Tema Escuro (clique para Auto)';
                break;
            case this.themes.AUTO:
            default:
                icon = effectiveTheme === this.themes.DARK ? '🌓' : '🌗';
                title = 'Tema Automático (clique para Claro)';
                break;
        }
        
        toggle.textContent = icon;
        toggle.setAttribute('title', title);
        toggle.setAttribute('aria-label', title);
    }
    
    setupSystemThemeListener() {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        mediaQuery.addEventListener('change', () => {
            // Só reagir se estiver em modo auto
            if (this.getCurrentTheme() === this.themes.AUTO) {
                this.updateToggleIcon();
                
                // Dispatch evento de mudança
                window.dispatchEvent(new CustomEvent('themeChanged', {
                    detail: { 
                        theme: this.themes.AUTO, 
                        effectiveTheme: this.getEffectiveTheme() 
                    }
                }));
            }
        });
    }
    
    showThemeFeedback(theme) {
        // Criar feedback visual temporário
        const feedback = document.createElement('div');
        feedback.className = 'theme-feedback';
        
        const effectiveTheme = this.getEffectiveTheme(theme);
        let message, icon;
        
        switch (theme) {
            case this.themes.LIGHT:
                icon = '☀️';
                message = 'Tema Claro';
                break;
            case this.themes.DARK:
                icon = '🌙';
                message = 'Tema Escuro';
                break;
            case this.themes.AUTO:
                icon = effectiveTheme === this.themes.DARK ? '🌓' : '🌗';
                message = `Automático (${effectiveTheme === this.themes.DARK ? 'Escuro' : 'Claro'})`;
                break;
        }
        
        feedback.innerHTML = `${icon} ${message}`;
        feedback.style.cssText = `
            position: fixed;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--bg-secondary);
            color: var(--text-primary);
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            border: 1px solid var(--border-primary);
            box-shadow: var(--shadow-secondary);
            z-index: 1002;
            animation: themeSlideUp 0.3s ease-out;
            pointer-events: none;
        `;
        
        // Adicionar CSS da animação se não existir
        if (!document.getElementById('theme-feedback-styles')) {
            const style = document.createElement('style');
            style.id = 'theme-feedback-styles';
            style.textContent = `
                @keyframes themeSlideUp {
                    from {
                        opacity: 0;
                        transform: translateX(-50%) translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(-50%) translateY(0);
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(feedback);
        
        // Remover após 2 segundos
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.style.animation = 'themeSlideUp 0.3s ease-out reverse';
                setTimeout(() => {
                    if (feedback.parentNode) {
                        feedback.remove();
                    }
                }, 300);
            }
        }, 2000);
    }
    
    // Métodos públicos para uso em outros scripts
    setTheme(theme) {
        if (Object.values(this.themes).includes(theme)) {
            this.applyTheme(theme);
        } else {
            console.warn('Tema inválido:', theme);
        }
    }
    
    isDarkMode() {
        return this.getEffectiveTheme() === this.themes.DARK;
    }
    
    isLightMode() {
        return this.getEffectiveTheme() === this.themes.LIGHT;
    }
    
    isAutoMode() {
        return this.getCurrentTheme() === this.themes.AUTO;
    }
}

// Inicializar automaticamente quando DOM estiver pronto
let themeManager;

function initThemeManager() {
    if (!themeManager) {
        themeManager = new ThemeManager();
        
        // Tornar disponível globalmente para debug
        window.themeManager = themeManager;
    }
}

// Inicializar imediatamente se DOM já estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initThemeManager);
} else {
    initThemeManager();
}

// Exportar para uso em módulos (se necessário)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeManager;
}

// Event listeners para outros scripts
window.addEventListener('themeChanged', (event) => {
    console.log('🎨 Tema alterado:', event.detail);
});

console.log('🎨 Theme Manager script carregado');