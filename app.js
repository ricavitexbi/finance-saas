console.log('🚀 VitexAI iniciando...');

// Variáveis globais
let supabase = null;
let currentUser = null;
let transactions = [];
let categories = {
    receita: ['Consultoria', 'Desenvolvimento', 'Licenciamento', 'Outras'],
    despesa: ['Pró-labore', 'Impostos', 'Terceiros', 'Desenvolvedores', 'Assinaturas', 'Marketing', 'Outras']
};
let charts = {};
let demoMode = false;
let lastTransactionTime = 0;
let updateDashboardTimeout = null;
let chatOpen = false;

// Internationalization System
let currentLanguage = localStorage.getItem('vitexai_language') || 'en';

const translations = {
    en: {
        // Headers
        'header.subtitle': 'Financial Intelligence Dashboard',
        'header.mainSubtitle': 'Financial Intelligence & Analytics',
        
        // Navigation
        'nav.transactions': 'Transactions',
        'nav.dashboard': 'Dashboard',
        'nav.trends': 'Trends',
        'nav.projections': 'Projections',
        'nav.analytics': 'Analytics',
        'nav.reports': 'Reports',
        'nav.settings': 'Settings',
        'nav.signout': 'Sign Out',
        
        // Auth
        'auth.welcome': 'Welcome to VitexAI',
        'auth.signin': 'Sign In',
        'auth.signup': 'Sign Up',
        'auth.email': 'Email',
        'auth.password': 'Password',
        'auth.fullName': 'Full Name',
        'auth.confirmPassword': 'Confirm Password',
        'auth.forgotPassword': 'Forgot Password?',
        'auth.createAccount': 'Create Account',
        
        // Setup
        'setup.title': 'Initial Setup',
        'setup.description': 'Configure your database connection:',
        'setup.tip': 'Tip:',
        'setup.tipText': 'If you haven\'t created the table in Supabase yet, use the SIMPLE structure (without user_id) available in Settings after login.',
        'setup.configure': 'Configure Connection',
        'setup.demoMode': 'Try Demo Mode',
        
        // Transactions
        'transactions.quickEntry': 'Quick Transaction Entry',
        'transactions.date': 'Date',
        'transactions.type': 'Type',
        'transactions.revenue': 'Revenue',
        'transactions.expense': 'Expense',
        'transactions.category': 'Category',
        'transactions.amount': 'Amount (R$)',
        'transactions.description': 'Description',
        'transactions.add': 'Add Transaction',
        'transactions.history': 'Transaction History',
        'transactions.sync': 'Sync Data',
        'transactions.loadSample': 'Load Sample Data',
        
        // Table
        'table.date': 'Date',
        'table.type': 'Type',
        'table.category': 'Category',
        'table.description': 'Description',
        'table.amount': 'Amount',
        'table.actions': 'Actions',
        'table.month': 'Month',
        'table.revenue': 'Revenue',
        'table.expenses': 'Expenses',
        'table.result': 'Result',
        'table.momGrowth': 'MoM Growth',
        'table.margin': 'Margin',
        'table.status': 'Status',
        
        // Metrics
        'metrics.totalRevenue': 'Total Revenue',
        'metrics.totalExpenses': 'Total Expenses',
        'metrics.netResult': 'Net Result',
        'metrics.averageMargin': 'Average Margin',
        'metrics.monthlyRevenueAvg': 'Monthly Revenue Avg',
        'metrics.averageBurnRate': 'Average Burn Rate',
        'metrics.cumulativeROI': 'Cumulative ROI',
        'metrics.taxBurden': 'Tax Burden',
        'metrics.fixedCosts': 'Fixed Costs %',
        'metrics.revenueExpenseRatio': 'Revenue/Expense Ratio',
        'metrics.taxesRevenue': 'Taxes/Revenue',
        'metrics.salariesSubscriptions': 'Salaries + Subscriptions',
        
        // Dashboard
        'dashboard.overallPerformance': 'Overall Performance Metrics',
        'dashboard.revenueMix': 'Revenue Mix Analysis',
        'dashboard.operationalEfficiency': 'Operational Efficiency',
        
        // Categories
        'categories.consulting': 'Consulting',
        'categories.development': 'Development',
        'categories.otherRevenue': 'Other Revenue',
        
        // Trends
        'trends.analysis': 'Trend Analysis',
        'trends.avgMoMGrowth': 'Average MoM Growth',
        'trends.monthlyRevenue': 'Monthly revenue',
        'trends.revenueVolatility': 'Revenue Volatility',
        'trends.coefficientVariation': 'Coefficient of variation',
        'trends.positiveMonths': 'Positive Months',
        'trends.bestResult': 'Best Result',
        'trends.monthlyEvolution': 'Monthly Evolution',
        'trends.monthlyDetailed': 'Monthly Detailed Analysis',
        
        // Projections
        'projections.title': 'Projections & Goals',
        'projections.projectedRevenue': 'Projected Revenue (Next Month)',
        'projections.basedOnAverage': 'Based on moving average',
        'projections.monthlyBreakeven': 'Monthly Break-even',
        'projections.avgMonthlyExpenses': 'Average monthly expenses',
        'projections.runway': 'Runway (Months)',
        'projections.withAvgResult': 'With average result',
        'projections.targetMargin': 'Target Margin',
        'projections.recommendedTarget': 'Recommended target',
        'projections.scenarioSimulator': 'Scenario Simulator',
        'projections.monthlyRevenueTarget': 'Monthly Revenue Target (R$)',
        'projections.expenseIncrease': 'Expense Increase %',
        'projections.availableCash': 'Available Cash (R$)',
        'projections.calculate': 'Calculate Scenario',
        
        // Analytics
        'analytics.title': 'Analytics & Visualizations',
        'analytics.monthlyEvolution': 'Monthly Evolution - Revenue vs Expenses',
        'analytics.revenueDistribution': 'Revenue Distribution',
        'analytics.expenseDistribution': 'Expense Distribution',
        'analytics.marginEvolution': 'Margin Evolution (%)',
        
        // Reports
        'reports.title': 'Reports & Export',
        'reports.exportData': 'Export Data',
        'reports.exportCSV': 'Export to CSV',
        'reports.backupJSON': 'Backup to JSON',
        'reports.executiveReport': 'Executive Report',
        
        // Settings
        'settings.title': 'System Settings',
        'settings.userProfile': 'User Profile',
        'settings.authenticatedUser': 'Authenticated user',
        'settings.activeSession': 'Active session',
        'settings.transactionsRecorded': 'Transactions recorded',
        'settings.advanced': 'Advanced Settings',
        'settings.comingSoon': 'Coming soon: custom categories, automatic goals, bank integration.',
        'settings.databaseStructure': 'Database Structure',
        'settings.important': 'Important:',
        'settings.userIdError': 'If you\'re getting \'user_id\' errors, use the SIMPLE structure below:',
        'settings.simpleStructure': 'Option 1 - SIMPLE Structure (recommended to start):',
        'settings.completeStructure': 'Option 2 - COMPLETE Structure (with user isolation):',
        'settings.copySimple': 'Copy Simple Structure',
        'settings.copyComplete': 'Copy Complete Structure',
        
        // Chat
        'chat.askData': 'Ask the Data',
        'chat.title': 'VitexAI Assistant',
        'chat.welcome': 'Hi! I can help you analyze your financial data. Try asking:\n\n• "What was my biggest expense this month?"\n• "Show me revenue trends"\n• "How is my margin evolving?"\n• "What\'s my current financial health?"',
        'chat.send': 'Send',
        
        // Footer
        'footer.description': 'Financial Intelligence Dashboard',
        'footer.version': 'Version 3.0 | Advanced Analytics | Real-time Insights',
        
        // Executive Report
        'report.executiveTitle': 'Executive Financial Report',
        'report.prepared': 'Prepared for',
        'report.board': 'Board of Directors',
        'report.executiveSummary': 'Executive Summary',
        'report.keyMetrics': 'Key Performance Indicators',
        'report.trendAnalysis': 'Trend Analysis',
        'report.insights': 'Strategic Insights',
        'report.recommendations': 'Recommendations',
        'report.conclusion': 'Conclusion',
        'report.details': 'Detailed Analysis',
        'report.financialHealth': 'Financial Health Status',
        'report.growth': 'Growth',
        'report.stability': 'Stability',
        'report.decline': 'Decline',
        'report.critical': 'Critical',
        'report.currentPeriod': 'Current Period',
        'report.previousPeriod': 'Previous Period',
        'report.change': 'Change',
        'report.positiveGrowth': 'positive growth',
        'report.negativeGrowth': 'negative decline',
        'report.lastUpdated': 'Last Updated',
        'report.printReport': 'Print Report'
    },
    pt: {
        // Headers
        'header.subtitle': 'Painel de Inteligência Financeira',
        'header.mainSubtitle': 'Inteligência Financeira & Análises',
        
        // Navigation
        'nav.transactions': 'Lançamentos',
        'nav.dashboard': 'Painel',
        'nav.trends': 'Tendências',
        'nav.projections': 'Projeções',
        'nav.analytics': 'Análises',
        'nav.reports': 'Relatórios',
        'nav.settings': 'Configurações',
        'nav.signout': 'Sair',
        
        // Auth
        'auth.welcome': 'Bem-vindo ao VitexAI',
        'auth.signin': 'Entrar',
        'auth.signup': 'Cadastrar',
        'auth.email': 'Email',
        'auth.password': 'Senha',
        'auth.fullName': 'Nome Completo',
        'auth.confirmPassword': 'Confirmar Senha',
        'auth.forgotPassword': 'Esqueceu a senha?',
        'auth.createAccount': 'Criar Conta',
        
        // Setup
        'setup.title': 'Configuração Inicial',
        'setup.description': 'Configure sua conexão com o banco de dados:',
        'setup.tip': 'Dica:',
        'setup.tipText': 'Se você ainda não criou a tabela no Supabase, use a estrutura SIMPLES (sem user_id) disponível em Configurações após o login.',
        'setup.configure': 'Configurar Conexão',
        'setup.demoMode': 'Experimentar Modo Demo',
        
        // Transactions
        'transactions.quickEntry': 'Entrada Rápida de Transação',
        'transactions.date': 'Data',
        'transactions.type': 'Tipo',
        'transactions.revenue': 'Receita',
        'transactions.expense': 'Despesa',
        'transactions.category': 'Categoria',
        'transactions.amount': 'Valor (R$)',
        'transactions.description': 'Descrição',
        'transactions.add': 'Adicionar Transação',
        'transactions.history': 'Histórico de Transações',
        'transactions.sync': 'Sincronizar Dados',
        'transactions.loadSample': 'Carregar Dados de Exemplo',
        
        // Table
        'table.date': 'Data',
        'table.type': 'Tipo',
        'table.category': 'Categoria',
        'table.description': 'Descrição',
        'table.amount': 'Valor',
        'table.actions': 'Ações',
        'table.month': 'Mês',
        'table.revenue': 'Receita',
        'table.expenses': 'Despesas',
        'table.result': 'Resultado',
        'table.momGrowth': 'Crescimento MoM',
        'table.margin': 'Margem',
        'table.status': 'Status',
        
        // Metrics
        'metrics.totalRevenue': 'Receita Total',
        'metrics.totalExpenses': 'Despesas Totais',
        'metrics.netResult': 'Resultado Líquido',
        'metrics.averageMargin': 'Margem Média',
        'metrics.monthlyRevenueAvg': 'Média de Receita Mensal',
        'metrics.averageBurnRate': 'Taxa de Queima Média',
        'metrics.cumulativeROI': 'ROI Acumulado',
        'metrics.taxBurden': 'Carga Tributária',
        'metrics.fixedCosts': 'Custos Fixos %',
        'metrics.revenueExpenseRatio': 'Razão Receita/Despesa',
        'metrics.taxesRevenue': 'Impostos/Receita',
        'metrics.salariesSubscriptions': 'Salários + Assinaturas',
        
        // Dashboard
        'dashboard.overallPerformance': 'Métricas de Desempenho Geral',
        'dashboard.revenueMix': 'Análise do Mix de Receitas',
        'dashboard.operationalEfficiency': 'Eficiência Operacional',
        
        // Categories
        'categories.consulting': 'Consultoria',
        'categories.development': 'Desenvolvimento',
        'categories.otherRevenue': 'Outras Receitas',
        
        // Trends
        'trends.analysis': 'Análise de Tendências',
        'trends.avgMoMGrowth': 'Crescimento MoM Médio',
        'trends.monthlyRevenue': 'Receita mensal',
        'trends.revenueVolatility': 'Volatilidade da Receita',
        'trends.coefficientVariation': 'Coeficiente de variação',
        'trends.positiveMonths': 'Meses Positivos',
        'trends.bestResult': 'Melhor Resultado',
        'trends.monthlyEvolution': 'Evolução Mensal',
        'trends.monthlyDetailed': 'Análise Detalhada Mensal',
        
        // Projections
        'projections.title': 'Projeções & Metas',
        'projections.projectedRevenue': 'Receita Projetada (Próximo Mês)',
        'projections.basedOnAverage': 'Baseado na média móvel',
        'projections.monthlyBreakeven': 'Ponto de Equilíbrio Mensal',
        'projections.avgMonthlyExpenses': 'Despesas mensais médias',
        'projections.runway': 'Runway (Meses)',
        'projections.withAvgResult': 'Com resultado médio',
        'projections.targetMargin': 'Margem Alvo',
        'projections.recommendedTarget': 'Meta recomendada',
        'projections.scenarioSimulator': 'Simulador de Cenários',
        'projections.monthlyRevenueTarget': 'Meta de Receita Mensal (R$)',
        'projections.expenseIncrease': 'Aumento de Despesas %',
        'projections.availableCash': 'Caixa Disponível (R$)',
        'projections.calculate': 'Calcular Cenário',
        
        // Analytics
        'analytics.title': 'Análises & Visualizações',
        'analytics.monthlyEvolution': 'Evolução Mensal - Receitas vs Despesas',
        'analytics.revenueDistribution': 'Distribuição de Receitas',
        'analytics.expenseDistribution': 'Distribuição de Despesas',
        'analytics.marginEvolution': 'Evolução da Margem (%)',
        
        // Reports
        'reports.title': 'Relatórios & Exportação',
        'reports.exportData': 'Exportar Dados',
        'reports.exportCSV': 'Exportar para CSV',
        'reports.backupJSON': 'Backup para JSON',
        'reports.executiveReport': 'Relatório Executivo',
        
        // Settings
        'settings.title': 'Configurações do Sistema',
        'settings.userProfile': 'Perfil do Usuário',
        'settings.authenticatedUser': 'Usuário autenticado',
        'settings.activeSession': 'Sessão ativa',
        'settings.transactionsRecorded': 'Transações registradas',
        'settings.advanced': 'Configurações Avançadas',
        'settings.comingSoon': 'Em breve: categorias personalizadas, metas automáticas, integração bancária.',
        'settings.databaseStructure': 'Estrutura do Banco de Dados',
        'settings.important': 'Importante:',
        'settings.userIdError': 'Se você está recebendo erros de \'user_id\', use a estrutura SIMPLES abaixo:',
        'settings.simpleStructure': 'Opção 1 - Estrutura SIMPLES (recomendado para começar):',
        'settings.completeStructure': 'Opção 2 - Estrutura COMPLETA (com isolamento de usuário):',
        'settings.copySimple': 'Copiar Estrutura Simples',
        'settings.copyComplete': 'Copiar Estrutura Completa',
        
        // Chat
        'chat.askData': 'Pergunte aos Dados',
        'chat.title': 'Assistente VitexAI',
        'chat.welcome': 'Olá! Posso ajudar você a analisar seus dados financeiros. Tente perguntar:\n\n• "Qual foi minha maior despesa este mês?"\n• "Mostre as tendências de receita"\n• "Como está evoluindo minha margem?"\n• "Qual é minha saúde financeira atual?"',
        'chat.send': 'Enviar',
        
        // Footer
        'footer.description': 'Painel de Inteligência Financeira',
        'footer.version': 'Versão 3.0 | Análises Avançadas | Insights em Tempo Real',
        
        // Executive Report
        'report.executiveTitle': 'Relatório Financeiro Executivo',
        'report.prepared': 'Preparado para',
        'report.board': 'Conselho de Administração',
        'report.executiveSummary': 'Resumo Executivo',
        'report.keyMetrics': 'Indicadores-Chave de Desempenho',
        'report.trendAnalysis': 'Análise de Tendências',
        'report.insights': 'Insights Estratégicos',
        'report.recommendations': 'Recomendações',
        'report.conclusion': 'Conclusão',
        'report.details': 'Análise Detalhada',
        'report.financialHealth': 'Status de Saúde Financeira',
        'report.growth': 'Crescimento',
        'report.stability': 'Estabilidade',
        'report.decline': 'Declínio',
        'report.critical': 'Crítico',
        'report.currentPeriod': 'Período Atual',
        'report.previousPeriod': 'Período Anterior',
        'report.change': 'Variação',
        'report.positiveGrowth': 'crescimento positivo',
        'report.negativeGrowth': 'declínio negativo',
        'report.lastUpdated': 'Última Atualização',
        'report.printReport': 'Imprimir Relatório'
    }
};

// Initialize Language System
function initializeLanguageSystem() {
    setLanguage(currentLanguage);
}

// Set language function
function setLanguage(lang) {
    currentLanguage = lang;
    localStorage.setItem('vitexai_language', lang);
    
    // Update language selector buttons
    document.querySelectorAll('.language-selector button').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent === lang.toUpperCase()) {
            btn.classList.add('active');
        }
    });
    
    // Update all text elements
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        const translation = translations[lang][key];
        if (translation) {
            element.textContent = translation;
        }
    });
    
    // Update placeholders
    updatePlaceholders();
    
    // Update document language
    document.documentElement.lang = lang === 'pt' ? 'pt-BR' : 'en';
}

// Update placeholders based on language
function updatePlaceholders() {
    const placeholders = {
        en: {
            'loginEmail': 'your@email.com',
            'loginPassword': 'Enter your password',
            'registerName': 'Your full name',
            'registerEmail': 'your@email.com',
            'registerPassword': 'Minimum 8 characters',
            'confirmPassword': 'Re-enter password',
            'quickDescricao': 'Transaction description',
            'chatInput': 'Ask about your data...',
            'metaReceita': 'Ex: 20000',
            'aumentoDespesas': 'Ex: 10',
            'caixaDisponivel': 'Ex: 50000'
        },
        pt: {
            'loginEmail': 'seu@email.com',
            'loginPassword': 'Digite sua senha',
            'registerName': 'Seu nome completo',
            'registerEmail': 'seu@email.com',
            'registerPassword': 'Mínimo 8 caracteres',
            'confirmPassword': 'Digite a senha novamente',
            'quickDescricao': 'Descrição da transação',
            'chatInput': 'Pergunte sobre seus dados...',
            'metaReceita': 'Ex: 20000',
            'aumentoDespesas': 'Ex: 10',
            'caixaDisponivel': 'Ex: 50000'
        }
    };
    
    Object.keys(placeholders[currentLanguage]).forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.placeholder = placeholders[currentLanguage][id];
        }
    });
}

// Function to get translated text
function getTranslation(key) {
    return translations[currentLanguage][key] || key;
}
