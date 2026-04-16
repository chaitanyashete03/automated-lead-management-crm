/**
 * APP.JS - Energybae CRM System
 * Handles both the Front-end Form Logic and the Dashboard UI.
 * Connects LocalStorage with the external Google Apps Script Hook.
 */

// 1. Google Apps Script Web App URL
// REPLACE THIS URL WITH YOUR ACTUAL PUBLISHED WEB APP URL FROM GOOGLE APPS SCRIPT
const GOOGLE_APPS_SCRIPT_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbwoy..../exec";

// 2. Data Store Helper (LocalStorage)
const Store = {
    getLeads: () => JSON.parse(localStorage.getItem('energybae_leads')) || [],
    addLead: (leadFormData) => {
        const leads = Store.getLeads();
        
        // Lead Scoring Algorithm
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
    clearAll: () => {
        localStorage.removeItem('energybae_leads');
    },
    loadDemoData: () => {
        const demoLeads = [
            { id: "101", name: "Alice Solutions", email: "alice@corp.com", phone: "+91 91234 56780", city: "Mumbai", propertyType: "Commercial", billAmount: 25000, score: 100, status: "Converted", timestamp: new Date(Date.now() - 400000000).toISOString() },
            { id: "102", name: "Ravi Teja", email: "ravi@gmail.com", phone: "+91 99887 77665", city: "Pune", propertyType: "Residential", billAmount: 6000, score: 50, status: "New", timestamp: new Date(Date.now() - 200000000).toISOString() },
            { id: "103", name: "Sunshine Ind.", email: "info@sunshine.in", phone: "+91 98765 12345", city: "Ahmedabad", propertyType: "Industrial", billAmount: 85000, score: 100, status: "Proposal Sent", timestamp: new Date(Date.now() - 30000000).toISOString() },
            { id: "104", name: "Mohan Das", email: "mohan.d@yahoo.com", phone: "+91 91122 33445", city: "Pune", propertyType: "Residential", billAmount: 3000, score: 30, status: "Contacted", timestamp: new Date(Date.now() - 1000000).toISOString() }
        ];
        localStorage.setItem('energybae_leads', JSON.stringify(demoLeads));
    }
};

// 3. Google Apps Script Fetch Logic
const syncWithGoogleSheet = async (leadData) => {
    try {
        // Warning: This fetch uses 'no-cors' mode to bypass CORS preflight errors in Google Apps Script.
        // It's a "fire and forget" request. The response cannot be read programmatically.
        const response = await fetch(GOOGLE_APPS_SCRIPT_WEBHOOK_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'text/plain' // Must use text/plain for Apps Script without preflight
            },
            body: JSON.stringify(leadData)
        });
        console.log("Locally logged: Lead sent to Google successfully (no response data due to no-cors).");
    } catch (e) {
        console.error("Failed to sync with Google Sheets:", e);
    }
};

// 4. Form Page Logic (`index.html`)
const buildCapturePage = () => {
    const form = document.getElementById('leadForm');
    const successMsg = document.getElementById('successMessage');
    const submitBtn = document.getElementById('submitBtn');

    if (!form) return; // Not on the form page

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitBtn.innerHTML = "Processing...";
        submitBtn.disabled = true;

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        // 1. Save locally
        const newLead = Store.addLead(data);

        // 2. Sync to cloud (Google Sheets Webhook + Auto Emails)
        if(GOOGLE_APPS_SCRIPT_WEBHOOK_URL.includes("script.google.com/macros/s/AKfy")) {
             syncWithGoogleSheet(newLead);
        } else {
             console.warn("Skipping Google Webhook Fetch: Please add your real Apps Script URL in app.js.");
        }

        // 3. UI Update
        setTimeout(() => {
            form.classList.add('hidden');
            successMsg.classList.remove('hidden');
        }, 800);
    });
};

// 5. Dashboard Page Logic (`dashboard.html`)
let cityChartInstance = null;
let propertyChartInstance = null;

const buildDashboardPage = () => {
    const tableBody = document.getElementById('tableBody');
    if (!tableBody) return; // Not on dashboard page

    const authOverlay = document.getElementById('authOverlay');
    const dashboardMain = document.getElementById('dashboardMain');
    const loginBtn = document.getElementById('loginBtn');
    const adminPassword = document.getElementById('adminPassword');
    const authError = document.getElementById('authError');

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
                renderDashboard(); // Initial render after login
            } else {
                authError.style.display = 'block';
            }
        });
    }

    const renderDashboard = () => {
        const leads = Store.getLeads();
        
        // KPI Metrics
        document.getElementById('kpiTotal').innerText = leads.length;
        
        const converted = leads.filter(l => l.status === 'Converted').length;
        document.getElementById('kpiConverted').innerText = converted;
        
        const rate = leads.length > 0 ? ((converted / leads.length) * 100).toFixed(1) : 0;
        document.getElementById('kpiRate').innerText = `${rate}%`;
        
        const pending = leads.filter(l => l.status === 'New').length;
        document.getElementById('kpiPending').innerText = pending;

        // Render Table
        tableBody.innerHTML = '';
        leads.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)).forEach(lead => {
            
            const diffTime = Math.abs(new Date() - new Date(lead.timestamp));
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            
            // Score formatting
            let scoreClass = 'score-high';
            if(lead.score < 80) scoreClass = 'score-med';
            if(lead.score < 40) scoreClass = 'score-low';

            // Select Status Mapping
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${lead.name}</strong></td>
                <td><small>${lead.phone}<br/>${lead.email}</small></td>
                <td>${lead.city}</td>
                <td>${lead.propertyType}</td>
                <td>₹${lead.billAmount.toLocaleString()}</td>
                <td class="${scoreClass}">${lead.score}/100</td>
                <td>
                    <select class="status-select select-${lead.status.toLowerCase().replace(' ', '')}" data-id="${lead.id}">
                        <option value="New" ${lead.status === 'New' ? 'selected' : ''}>New</option>
                        <option value="Contacted" ${lead.status === 'Contacted' ? 'selected' : ''}>Contacted</option>
                        <option value="Proposal Sent" ${lead.status === 'Proposal Sent' ? 'selected' : ''}>Proposal Sent</option>
                        <option value="Converted" ${lead.status === 'Converted' ? 'selected' : ''}>Converted</option>
                        <option value="Lost" ${lead.status === 'Lost' ? 'selected' : ''}>Lost</option>
                    </select>
                </td>
                <td>${diffDays} day(s)</td>
            `;
            tableBody.appendChild(tr);
        });

        // Add Event Listeners to the newly rendered dropdowns
        document.querySelectorAll('.status-select').forEach(select => {
            select.addEventListener('change', (e) => {
                const id = e.target.getAttribute('data-id');
                const newStatus = e.target.value;
                Store.updateLeadStatus(id, newStatus);
                renderDashboard(); // Re-render to update charts and KPIs natively
            });
        });

        // Render Charts
        renderCharts(leads);
    };

    const renderCharts = (leads) => {
        // Prepare City Data
        const cityMap = {};
        const pTypeMap = { 'Residential': 0, 'Commercial': 0, 'Industrial': 0 };

        leads.forEach(l => {
            cityMap[l.city] = (cityMap[l.city] || 0) + 1;
            if(pTypeMap[l.propertyType] !== undefined) pTypeMap[l.propertyType]++;
        });

        const chartColors = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444'];

        if (cityChartInstance) cityChartInstance.destroy();
        const ctxCity = document.getElementById('cityChart').getContext('2d');
        cityChartInstance = new Chart(ctxCity, {
            type: 'bar',
            data: {
                labels: Object.keys(cityMap),
                datasets: [{
                    label: 'Leads by City',
                    data: Object.values(cityMap),
                    backgroundColor: chartColors[1],
                    borderRadius: 5
                }]
            },
            options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: {color: "#fff"} }, x: { ticks: {color:"#fff"} } }}
        });

        if (propertyChartInstance) propertyChartInstance.destroy();
        const ctxProp = document.getElementById('propertyChart').getContext('2d');
        propertyChartInstance = new Chart(ctxProp, {
            type: 'doughnut',
            data: {
                labels: Object.keys(pTypeMap),
                datasets: [{
                    data: Object.values(pTypeMap),
                    backgroundColor: chartColors,
                    borderWidth: 0
                }]
            },
            options: { plugins: { legend: { position: 'bottom', labels: {color: "#fff"} } } }
        });
    };

    // Initialize Dashboard
    if (authCheck()) {
        renderDashboard();
    }

    // Data Management Buttons
    document.getElementById('demoDataBtn').addEventListener('click', () => {
        Store.loadDemoData();
        renderDashboard();
    });

    document.getElementById('clearDataBtn').addEventListener('click', () => {
        if(confirm("Are you sure you want to wipe all local leads?")) {
            Store.clearAll();
            renderDashboard();
        }
    });

    // Search Filtering
    document.getElementById('searchTable').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const rows = tableBody.querySelectorAll('tr');
        rows.forEach(row => {
            const name = row.children[0].innerText.toLowerCase();
            const city = row.children[2].innerText.toLowerCase();
            if (name.includes(query) || city.includes(query)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    });
};

// Initialization Router
document.addEventListener("DOMContentLoaded", () => {
    buildCapturePage();
    buildDashboardPage();
});
