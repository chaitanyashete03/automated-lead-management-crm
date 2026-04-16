/**
 * APP.JS - Energybae CRM System
 * Logic updated for Next-Gen Vercel/Linear Aesthetic Theme
 */

const GOOGLE_APPS_SCRIPT_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbwho0HSH0pPTYGPKsJd2hT9j1KVp5E1OptFQ4vRTtxfRaUwM_8NaUEkTXDjFo8fAIV4bQ/exec";

// --- Theme Management ---
const initTheme = () => {
    const isDark = localStorage.getItem('theme') === 'dark' || 
                  (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    return isDark;
};

const setupThemeToggle = () => {
    const btn = document.getElementById('themeToggle');
    if (!btn) return;

    const updateIcons = (isDark) => {
        document.querySelector('.moon-icon').classList.toggle('hidden', isDark);
        document.querySelector('.sun-icon').classList.toggle('hidden', !isDark);
    };

    let isDark = initTheme();
    updateIcons(isDark);

    btn.addEventListener('click', () => {
        isDark = !isDark;
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        updateIcons(isDark);
        
        // Trigger chart re-render if we are on the dashboard
        if (typeof renderChartsFunc === 'function') {
            renderChartsFunc(); 
        }
    });
};

initTheme();

// --- Local Data Store ---
const Store = {
    getLeads: () => JSON.parse(localStorage.getItem('energybae_leads')) || [],
    addLead: (leadFormData) => {
        const leads = Store.getLeads();
        
        let score = 0;
        const pType = leadFormData.propertyType.toLowerCase();
        const bill = parseFloat(leadFormData.billAmount);
        
        if (pType === "commercial" || pType === "industrial") score += 50;
        else score += 20;
        
        if (bill >= 15000) score += 50;
        else if (bill >= 5000) score += 30;
        else score += 10;

        const newLead = {
            id: Date.now().toString(),
            name: leadFormData.name,
            email: leadFormData.email,
            phone: leadFormData.phone,
            city: leadFormData.city,
            propertyType: leadFormData.propertyType,
            billAmount: bill,
            score: score,
            status: "New",
            timestamp: new Date().toISOString()
        };

        leads.push(newLead);
        localStorage.setItem('energybae_leads', JSON.stringify(leads));
        return newLead;
    },
    updateLeadStatus: (id, newStatus) => {
        const leads = Store.getLeads();
        const index = leads.findIndex(l => l.id === id);
        if (index !== -1) {
            leads[index].status = newStatus;
            localStorage.setItem('energybae_leads', JSON.stringify(leads));
        }
    },
    clearAll: () => localStorage.removeItem('energybae_leads'),
    loadDemoData: () => {
        const demoLeads = [
            { id: "101", name: "Alice Solutions", email: "alice@corp.com", phone: "+1 555 1234", city: "San Francisco", propertyType: "Commercial", billAmount: 25000, score: 100, status: "Converted", timestamp: new Date(Date.now() - 400000000).toISOString() },
            { id: "102", name: "Ravi Teja", email: "ravi@gmail.com", phone: "+1 555 5678", city: "Austin", propertyType: "Residential", billAmount: 600, score: 50, status: "New", timestamp: new Date(Date.now() - 200000000).toISOString() },
            { id: "103", name: "Sunshine Ind.", email: "info@sunshine.in", phone: "+1 555 9012", city: "Seattle", propertyType: "Industrial", billAmount: 85000, score: 100, status: "Proposal Sent", timestamp: new Date(Date.now() - 30000000).toISOString() },
            { id: "104", name: "Mohan Das", email: "mohan.d@yahoo.com", phone: "+1 555 3456", city: "Austin", propertyType: "Residential", billAmount: 300, score: 30, status: "Contacted", timestamp: new Date(Date.now() - 1000000).toISOString() }
        ];
        localStorage.setItem('energybae_leads', JSON.stringify(demoLeads));
    }
};

// --- API Sync ---
const syncWithGoogleSheet = async (leadData) => {
    try {
        await fetch(GOOGLE_APPS_SCRIPT_WEBHOOK_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(leadData)
        });
        console.log("Locally logged: Lead sent to Google via text/plain mode.");
    } catch (e) {
        console.error("Failed to sync:", e);
    }
};

// --- Pages Logic ---

const buildCapturePage = () => {
    const form = document.getElementById('leadForm');
    const successMsg = document.getElementById('successMessage');
    const submitBtn = document.getElementById('submitBtn');

    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitBtn.innerHTML = "Processing...";
        submitBtn.disabled = true;

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        const newLead = Store.addLead(data);
        syncWithGoogleSheet(newLead);

        setTimeout(() => {
            form.classList.add('hidden');
            successMsg.classList.remove('hidden');
        }, 600);
    });
};

// Expose rendering function globally so theme switcher can trigger it
let renderChartsFunc = null;

const buildDashboardPage = () => {
    const tableBody = document.getElementById('tableBody');
    if (!tableBody) return;

    // --- Admin Security ---
    const authOverlay = document.getElementById('authOverlay');
    const dashboardMain = document.getElementById('dashboardMain');
    const loginBtn = document.getElementById('loginBtn');
    const adminPassword = document.getElementById('adminPassword');
    const authError = document.getElementById('authError');
    const logoutBtn = document.getElementById('logoutBtn');

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            sessionStorage.removeItem('energybae_admin');
            window.location.reload();
        });
    }

    const authCheck = () => {
        if (sessionStorage.getItem('energybae_admin') !== 'true') return false;
        authOverlay.style.display = 'none';
        dashboardMain.classList.remove('blurred');
        return true;
    };

    if (!authCheck()) {
        loginBtn.addEventListener('click', () => {
            if (adminPassword.value === 'admin123') {
                sessionStorage.setItem('energybae_admin', 'true');
                authCheck();
                initDashboard();
            } else {
                authError.style.display = 'block';
            }
        });
    } else {
        // Schedule initDashboard to run immediately after definition using closure to avoid ReferenceError
        setTimeout(() => initDashboard(), 0);
    }

    // --- Dashboard Core ---
    let cityChartInstance = null;
    let propertyChartInstance = null;

    const initDashboard = () => {
        const renderDashboard = () => {
            const leads = Store.getLeads();
            
            document.getElementById('kpiTotal').innerText = leads.length;
            const converted = leads.filter(l => l.status === 'Converted').length;
            document.getElementById('kpiConverted').innerText = converted;
            const rate = leads.length > 0 ? ((converted / leads.length) * 100).toFixed(1) : 0;
            document.getElementById('kpiRate').innerText = `${rate}%`;
            document.getElementById('kpiPending').innerText = leads.filter(l => l.status === 'New').length;

            tableBody.innerHTML = '';
            leads.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)).forEach(lead => {
                
                let scoreColor = lead.score >= 80 ? 'var(--success)' : (lead.score >= 40 ? 'var(--accent)' : 'var(--text-muted)');

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>
                        <div style="font-weight: 500">${lead.name}</div>
                        <div class="text-xs text-muted">${lead.email}</div>
                    </td>
                    <td class="text-sm">${lead.city}</td>
                    <td class="text-sm">${lead.propertyType}</td>
                    <td class="text-sm font-mono">$${lead.billAmount.toLocaleString()}</td>
                    <td class="text-sm" style="color: ${scoreColor}; font-weight: 600;">${lead.score} / 100</td>
                    <td>
                        <select class="status-badge" data-id="${lead.id}">
                            <option value="New" ${lead.status === 'New' ? 'selected' : ''}>New</option>
                            <option value="Contacted" ${lead.status === 'Contacted' ? 'selected' : ''}>Contacted</option>
                            <option value="Proposal Sent" ${lead.status === 'Proposal Sent' ? 'selected' : ''}>Proposal Sent</option>
                            <option value="Converted" ${lead.status === 'Converted' ? 'selected' : ''}>Converted</option>
                            <option value="Lost" ${lead.status === 'Lost' ? 'selected' : ''}>Lost</option>
                        </select>
                    </td>
                `;
                tableBody.appendChild(tr);
            });

            document.querySelectorAll('.status-badge').forEach(select => {
                select.addEventListener('change', (e) => {
                    Store.updateLeadStatus(e.target.getAttribute('data-id'), e.target.value);
                    renderDashboard();
                });
            });

            renderChartsFunc = () => renderCharts(leads);
            renderChartsFunc();
        };

        const renderCharts = (leads) => {
            const cityMap = {};
            const pTypeMap = { 'Residential': 0, 'Commercial': 0, 'Industrial': 0 };

            leads.forEach(l => {
                cityMap[l.city] = (cityMap[l.city] || 0) + 1;
                if(pTypeMap[l.propertyType] !== undefined) pTypeMap[l.propertyType]++;
            });

            // Modern chart settings
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
            const textColor = isDark ? '#a1a1aa' : '#71717a';
            const primaryBarColor = isDark ? '#ededed' : '#09090b';

            if (cityChartInstance) cityChartInstance.destroy();
            const ctxCity = document.getElementById('cityChart').getContext('2d');
            cityChartInstance = new Chart(ctxCity, {
                type: 'bar',
                data: {
                    labels: Object.keys(cityMap),
                    datasets: [{
                        data: Object.values(cityMap),
                        backgroundColor: primaryBarColor,
                        borderRadius: 4,
                        barThickness: 32
                    }]
                },
                options: { 
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } }, 
                    scales: { 
                        y: { border: {display: false}, grid: { color: gridColor }, ticks: {color: textColor, stepSize: 1} }, 
                        x: { border: {display: false}, grid: { display: false }, ticks: {color: textColor} } 
                    }
                }
            });

            if (propertyChartInstance) propertyChartInstance.destroy();
            const ctxProp = document.getElementById('propertyChart').getContext('2d');
            propertyChartInstance = new Chart(ctxProp, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(pTypeMap),
                    datasets: [{
                        data: Object.values(pTypeMap),
                        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b'],
                        borderWidth: 0,
                        hoverOffset: 4
                    }]
                },
                options: { 
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '75%',
                    plugins: { legend: { position: 'right', labels: {color: textColor, usePointStyle: true, boxWidth: 8} } } 
                }
            });
        };

        renderDashboard();

        document.getElementById('demoDataBtn').addEventListener('click', () => { Store.loadDemoData(); renderDashboard(); });
        document.getElementById('clearDataBtn').addEventListener('click', () => {
            if(confirm("Confirm extreme data wipe?")) { Store.clearAll(); renderDashboard(); }
        });

        document.getElementById('searchTable').addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            tableBody.querySelectorAll('tr').forEach(row => {
                const textContext = row.innerText.toLowerCase();
                row.style.display = textContext.includes(query) ? '' : 'none';
            });
        });
    };

    // initDashboard called above via setTimeout if already authorized
};

document.addEventListener("DOMContentLoaded", () => {
    setupThemeToggle();
    buildCapturePage();
    buildDashboardPage();
});
