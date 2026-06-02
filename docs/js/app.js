document.addEventListener('DOMContentLoaded', () => {
    // API Server Configuration (Render)
    const API_BASE_URL = 'https://resume-api-service.onrender.com';

    // State management
    let optimizedContent = '';
    let requiredSections = [];

    // DOM Elements
    const body = document.body;
    const themeToggle = document.getElementById('theme-toggle');
    const originalResume = document.getElementById('original-resume');
    const targetJd = document.getElementById('target-jd');
    const resumeCount = document.getElementById('resume-count');
    const jdCount = document.getElementById('jd-count');
    
    // Settings elements
    const toggleSettingsBtn = document.getElementById('toggle-settings-btn');
    const settingsPanel = document.getElementById('settings-panel');
    const modelNameSelect = document.getElementById('model-name');
    const simulationModeCheckbox = document.getElementById('simulation-mode');
    
    // Output elements
    const optimizeBtn = document.getElementById('optimize-btn');
    const previewContent = document.getElementById('preview-content');
    const optimizedMarkdown = document.getElementById('optimized-markdown');
    const skeletonLoader = document.getElementById('skeleton-loader');
    
    // Action buttons
    const copyBtn = document.getElementById('copy-btn');
    const downloadBtn = document.getElementById('download-btn');
    const exportPdfBtn = document.getElementById('export-pdf-btn');
    const saveLocalBtn = document.getElementById('save-local-btn');
    
    // Validation Elements
    const validationBadge = document.getElementById('validation-badge');
    const summaryStatusIcon = document.getElementById('summary-status-icon');
    const summaryTitle = document.getElementById('summary-title');
    const summaryDesc = document.getElementById('summary-desc');
    const validationList = document.getElementById('validation-list');
    const consoleLogs = document.getElementById('console-logs');
    const clearConsoleBtn = document.getElementById('clear-console-btn');

    // --- Tab Switching Logic ---
    const setupTabs = (tabSelectorClass, activeTabClass, contentTabPrefix) => {
        document.querySelectorAll(`.${tabSelectorClass}`).forEach(button => {
            button.addEventListener('click', () => {
                const targetTabId = button.getAttribute('data-tab');
                
                // Deactivate all sibling buttons & contents
                button.parentElement.querySelectorAll(`.${tabSelectorClass}`).forEach(btn => {
                    btn.classList.remove('active');
                });
                
                // Find all corresponding tab contents and hide them
                const cardBody = button.closest('.card').querySelector('.card-body');
                cardBody.querySelectorAll('.tab-content').forEach(content => {
                    content.classList.remove('active');
                });
                
                // Activate selected
                button.classList.add('active');
                document.getElementById(targetTabId).classList.add('active');
            });
        });
    };
    
    setupTabs('input-tab', 'active', 'input-tab-content');
    setupTabs('output-tab', 'active', 'output-tab-content');

    // --- Accordion Logic ---
    toggleSettingsBtn.addEventListener('click', () => {
        toggleSettingsBtn.classList.toggle('active');
        settingsPanel.classList.toggle('active');
    });

    // --- Theme Toggle Logic ---
    const savedTheme = localStorage.getItem('theme') || 'dark-theme';
    body.className = savedTheme;
    updateThemeIcon(savedTheme);

    themeToggle.addEventListener('click', () => {
        if (body.classList.contains('dark-theme')) {
            body.className = 'light-theme';
            localStorage.setItem('theme', 'light-theme');
        } else {
            body.className = 'dark-theme';
            localStorage.setItem('theme', 'dark-theme');
        }
        updateThemeIcon(body.className);
    });

    function updateThemeIcon(theme) {
        const icon = themeToggle.querySelector('i');
        if (theme === 'light-theme') {
            icon.className = 'fa-solid fa-sun';
        } else {
            icon.className = 'fa-solid fa-moon';
        }
    }

    // --- Local Storage for Settings ---
    const loadSettings = () => {
        const model = localStorage.getItem('gemini_model') || 'gemini-1.5-flash';
        const sim = localStorage.getItem('gemini_simulation');

        modelNameSelect.value = model;
        if (sim !== null) {
            simulationModeCheckbox.checked = sim === 'true';
        }
    };

    const saveSettingsToLocal = () => {
        localStorage.setItem('gemini_model', modelNameSelect.value);
        localStorage.setItem('gemini_simulation', simulationModeCheckbox.checked);
    };

    [modelNameSelect, simulationModeCheckbox].forEach(el => {
        el.addEventListener('change', saveSettingsToLocal);
        if (el.tagName === 'INPUT') el.addEventListener('input', saveSettingsToLocal);
    });

    // --- Character Counters ---
    const updateCharCount = (element, displayElement) => {
        displayElement.textContent = element.value.length.toLocaleString();
    };
    
    originalResume.addEventListener('input', () => updateCharCount(originalResume, resumeCount));
    targetJd.addEventListener('input', () => updateCharCount(targetJd, jdCount));

    // --- Load Initial Data from Server ---
    const loadInitialData = async () => {
        addLog('正在從伺服器載入資料與設定檔...', 'info');
        try {
            const response = await fetch(`${API_BASE_URL}/api/load_data`);
            const data = await response.json();
            
            if (data.success) {
                originalResume.value = data.resume_content;
                updateCharCount(originalResume, resumeCount);
                
                requiredSections = data.required_sections;
                
                // If local storage is empty, use defaults from server
                if (!localStorage.getItem('gemini_model')) {
                    modelNameSelect.value = data.default_model;
                }
                
                addLog('資料初始化載入成功。', 'success');
                initValidationList();
            } else {
                showToast('載入資料失敗: ' + data.error, 'error');
                addLog('載入資料失敗: ' + data.error, 'error');
            }
        } catch (error) {
            showToast('連線伺服器失敗！', 'error');
            addLog('連線伺服器失敗！請確認後端 Flask 已正確執行。', 'error');
        }
    };

    // --- Console Logger Helpers ---
    function addLog(message, type = 'info') {
        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
        
        const line = document.createElement('div');
        line.className = `log-line ${type}`;
        line.innerText = `[${timeStr}] ${message}`;
        
        consoleLogs.appendChild(line);
        consoleLogs.scrollTop = consoleLogs.scrollHeight;
    }

    clearConsoleBtn.addEventListener('click', () => {
        consoleLogs.innerHTML = '';
        addLog('主控台紀錄已清除。', 'info');
    });

    // --- Initialize Validation Tab ---
    function initValidationList() {
        validationList.innerHTML = '';
        requiredSections.forEach(section => {
            const li = document.createElement('li');
            li.className = 'validation-item pending';
            li.innerHTML = `
                <i class="fa-solid fa-circle-question item-icon"></i>
                <span class="item-text">${escapeHtml(section)}</span>
                <span class="item-status">等待測試...</span>
            `;
            validationList.appendChild(li);
        });
        
        validationBadge.className = 'badge';
        validationBadge.innerHTML = '<i class="fa-solid fa-circle-question"></i>';
    }

    // --- Optimization Process ---
    optimizeBtn.addEventListener('click', async () => {
        const baseResumeText = originalResume.value.trim();
        const jdText = targetJd.value.trim();
        const model = modelNameSelect.value;
        const simulate = simulationModeCheckbox.checked;

        if (!baseResumeText) {
            showToast('原始履歷內容不可為空！', 'error');
            originalResume.focus();
            return;
        }

        if (!jdText) {
            showToast('請提供目標職缺描述 (JD)！', 'error');
            // Switch to JD tab so they see it
            document.querySelector('.input-tab[data-tab="jd-input-tab"]').click();
            targetJd.focus();
            return;
        }

        // Start UI loading state
        setLoadingState(true);
        initValidationList();

        addLog('=========================================', 'info');
        addLog('啟動履歷優化客製管線...', 'info');
        addLog(`改寫模式: ${simulate ? '模擬模式 (Simulation)' : '實體 LLM 生成模式'}`, 'info');
        if (!simulate) {
            addLog(`使用模型: ${model}`, 'info');
        }

        try {
            // 1. Generate tailored resume
            addLog('正在重構經歷與排版... (這需要一些時間，請稍候)', 'info');
            const genResponse = await fetch(`${API_BASE_URL}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    base_resume: baseResumeText,
                    jd_text: jdText,
                    model: model,
                    simulate: simulate
                })
            });
            const genData = await genResponse.json();

            if (!genData.success) {
                throw new Error(genData.error || '生成失敗。');
            }

            optimizedContent = genData.tailored_resume;
            optimizedMarkdown.value = optimizedContent;
            
            // Render Live HTML Preview
            previewContent.innerHTML = marked.parse(optimizedContent);
            addLog('客製化履歷生成成功！已載入 Markdown 及預覽圖。', 'success');

            // 2. Perform Automated Validation
            addLog('正在執行履歷格式結構自動化測試...', 'info');
            const valResponse = await fetch(`${API_BASE_URL}/api/validate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: optimizedContent })
            });
            const valData = await valResponse.json();

            if (!valData.success) {
                throw new Error(valData.error || '驗證程式執行失敗。');
            }

            // Render Validation Results
            renderValidationResults(valData);

        } catch (error) {
            showToast(`執行失敗: ${error.message}`, 'error');
            addLog(`[錯誤] ${error.message}`, 'error');
            
            previewContent.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-triangle-exclamation" style="color: var(--danger-color);"></i>
                    <p>執行失敗：${escapeHtml(error.message)}</p>
                </div>
            `;
            setLoadingState(false, false);
        }
    });

    function setLoadingState(isLoading, enableActions = false) {
        if (isLoading) {
            optimizeBtn.disabled = true;
            optimizeBtn.querySelector('span').textContent = '優化與驗證中...';
            optimizeBtn.querySelector('i').className = 'fa-solid fa-spinner fa-spin';
            
            // Hide preview content and show skeleton
            previewContent.classList.add('hidden');
            skeletonLoader.classList.remove('hidden');
            
            // Disable actions
            copyBtn.disabled = true;
            downloadBtn.disabled = true;
            exportPdfBtn.disabled = true;
            saveLocalBtn.disabled = true;
        } else {
            optimizeBtn.disabled = false;
            optimizeBtn.querySelector('span').textContent = '優化履歷與格式驗證';
            optimizeBtn.querySelector('i').className = 'fa-solid fa-wand-magic-sparkles';
            
            skeletonLoader.classList.add('hidden');
            previewContent.classList.remove('hidden');
            
            // Toggle actions based on success
            copyBtn.disabled = !enableActions;
            downloadBtn.disabled = !enableActions;
            exportPdfBtn.disabled = !enableActions;
            saveLocalBtn.disabled = !enableActions;
        }
    }

    function renderValidationResults(valData) {
        validationList.innerHTML = '';
        let passCount = 0;

        valData.results.forEach(res => {
            const li = document.createElement('li');
            li.className = `validation-item ${res.passed ? 'pass' : 'fail'}`;
            li.innerHTML = `
                <i class="fa-solid ${res.passed ? 'fa-circle-check' : 'fa-circle-xmark'} item-icon"></i>
                <span class="item-text">${escapeHtml(res.section)}</span>
                <span class="item-status">${res.passed ? '通過 [PASS]' : '缺失 [FAIL]'}</span>
            `;
            validationList.appendChild(li);
            
            if (res.passed) {
                passCount++;
                addLog(`[PASS] 欄位結構驗證通過: ${res.section}`, 'success');
            } else {
                addLog(`[FAIL] 遺漏必要結構欄位: ${res.section}`, 'error');
            }
        });

        // Summary Card
        const isAllPassed = valData.all_passed;
        const total = valData.results.length;
        
        validationBadge.className = `badge ${isAllPassed ? 'pass' : 'fail'}`;
        validationBadge.innerHTML = isAllPassed ? 
            `<i class="fa-solid fa-check"></i>` : 
            `<span style="font-weight:bold">${total - passCount}</span>`;

        summaryStatusIcon.className = `summary-status-icon ${isAllPassed ? 'pass' : 'fail'}`;
        summaryStatusIcon.innerHTML = isAllPassed ? 
            `<i class="fa-solid fa-shield-cat" style="color: var(--success-color);"></i>` : 
            `<i class="fa-solid fa-triangle-exclamation" style="color: var(--danger-color);"></i>`;

        summaryTitle.textContent = isAllPassed ? '驗證完全通過！' : '格式驗證失敗！';
        summaryTitle.className = isAllPassed ? 'success-text' : 'error-text';
        summaryDesc.textContent = `結構欄位測試統計：通過 ${passCount} / 共 ${total} 個必要項目。${isAllPassed ? '您的履歷格式完全符合驗收清單！' : '請檢查缺漏的結構標題。'}`;

        addLog(`=========================================`, 'info');
        addLog(`【測試統計】通過項目: ${passCount} / ${total} - ${isAllPassed ? '符合標準' : '不符合標準'}`, isAllPassed ? 'success' : 'error');

        setLoadingState(false, true);
        showToast(isAllPassed ? '履歷生成並驗證通過！' : '履歷生成完成，但格式驗證有缺漏！', isAllPassed ? 'success' : 'info');

        // Automatically switch to Preview Tab to let user see it
        document.querySelector('.output-tab[data-tab="preview-tab"]').click();
    }

    // --- Action Button Logics ---
    
    // 1. Copy Markdown
    copyBtn.addEventListener('click', async () => {
        if (!optimizedContent) return;
        try {
            await navigator.clipboard.writeText(optimizedContent);
            showToast('已複製 Markdown 原始碼至剪貼簿！', 'success');
            addLog('使用者複製了生成的 Markdown 履歷。', 'info');
        } catch (err) {
            showToast('複製失敗，請手動選取複製！', 'error');
        }
    });

    // 2. Download Markdown File
    downloadBtn.addEventListener('click', () => {
        if (!optimizedContent) return;
        const blob = new Blob([optimizedContent], { type: 'text/markdown;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', '客製化履歷_產出成果.md');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showToast('檔案下載成功！', 'success');
        addLog('下載客製化履歷檔案成功。', 'info');
    });

    // 3. Export PDF File
    exportPdfBtn.addEventListener('click', async () => {
        if (!optimizedContent) return;
        
        addLog('正在請求後端將履歷轉換為 PDF...', 'info');
        exportPdfBtn.disabled = true;
        exportPdfBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 轉換中...';
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/export_pdf`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: optimizedContent })
            });
            
            if (!response.ok) {
                let errorMsg = 'PDF 產生失敗';
                try {
                    const errData = await response.json();
                    errorMsg = errData.error || errorMsg;
                } catch (e) {}
                throw new Error(errorMsg);
            }
            
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', '客製化履歷_產出成果.pdf');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            showToast('PDF 匯出成功並已開始下載！', 'success');
            addLog('PDF 檔案匯出成功！', 'success');
        } catch (error) {
            showToast('PDF 匯出失敗: ' + error.message, 'error');
            addLog('PDF 匯出失敗: ' + error.message, 'error');
        } finally {
            exportPdfBtn.disabled = false;
            exportPdfBtn.innerHTML = '<i class="fa-solid fa-file-pdf"></i> 匯出 PDF';
        }
    });

    // 4. Save to backend filesystem
    saveLocalBtn.addEventListener('click', async () => {
        if (!optimizedContent) return;
        
        addLog('正在儲存客製化履歷到本地端檔案...', 'info');
        try {
            const response = await fetch(`${API_BASE_URL}/api/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: optimizedContent,
                    target: 'output'
                })
            });
            const data = await response.json();
            
            if (data.success) {
                showToast('已成功儲存至本地工作區！', 'success');
                addLog('已儲存至本地：客製化履歷_產出成果.md', 'success');
            } else {
                showToast('儲存失敗: ' + data.error, 'error');
                addLog('儲存失敗: ' + data.error, 'error');
            }
        } catch (error) {
            showToast('連線伺服器儲存失敗！', 'error');
            addLog('儲存失敗：無法連接後端伺服器 API。', 'error');
        }
    });

    // --- Toast Notification Helper ---
    function showToast(message, type = 'success') {
        const toastContainer = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let iconClass = 'fa-circle-check';
        if (type === 'error') iconClass = 'fa-triangle-exclamation';
        if (type === 'info') iconClass = 'fa-circle-info';
        
        toast.innerHTML = `
            <i class="fa-solid ${iconClass}"></i>
            <span>${message}</span>
        `;
        
        toastContainer.appendChild(toast);
        
        // Remove after 3.5 seconds
        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s forwards';
            toast.addEventListener('animationend', () => {
                toast.remove();
            });
        }, 3500);
    }

    // --- Utilities ---
    function escapeHtml(text) {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Initialize application
    loadSettings();
    loadInitialData();
});
