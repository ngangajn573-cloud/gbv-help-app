/*
 * GBV Help App - Backend Server
 * 
 * This server handles:
 * - Serving the frontend static files
 * - Receiving and storing GBV reports (persisted to JSON file)
 * - Admin dashboard API for viewing reports
 * - Health check endpoint
 */

const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ── File-based storage path ──
const REPORTS_FILE = path.join(__dirname, 'reports.json');

// ── Middleware ──

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Report Storage Functions ──

function loadReports() {
    try {
        if (fs.existsSync(REPORTS_FILE)) {
            const data = fs.readFileSync(REPORTS_FILE, 'utf-8');
            return JSON.parse(data);
        }
    } catch (err) {
        console.error('Error loading reports file:', err.message);
    }
    return [];
}

function saveReports(reports) {
    try {
        fs.writeFileSync(REPORTS_FILE, JSON.stringify(reports, null, 2), 'utf-8');
        return true;
    } catch (err) {
        console.error('Error saving reports file:', err.message);
        return false;
    }
}

// Load existing reports on startup
let reports = loadReports();
console.log(`[STARTUP] Loaded ${reports.length} existing report(s) from file.`);

// ── Static file serving ──

app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ── API Routes ──

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        app: 'GBV Help App',
        totalReports: reports.length,
        storage: 'file-based (reports.json)',
        timestamp: new Date().toISOString()
    });
});

/**
 * POST /api/reports
 * Submit a new GBV report (saved to file)
 */
app.post('/api/reports', (req, res) => {
    const {
        anonymous = true,
        name,
        phone,
        type,
        description,
        location,
        authority,
        notifyContacts = false
    } = req.body;

    // Validation
    if (!type || !description || !authority) {
        return res.status(400).json({
            error: 'Missing required fields: type, description, and authority are required.'
        });
    }

    const report = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        receivedAt: new Date().toISOString(),
        anonymous,
        name: anonymous ? 'Anonymous' : (name || 'Not provided'),
        phone: anonymous ? '' : (phone || ''),
        type,
        description,
        location: location || 'Not provided',
        authority,
        notifyContacts,
        status: 'received',
        serverNote: 'Report received and saved by GBV Help App server'
    };

    reports.push(report);

    // Save to file immediately
    const saved = saveReports(reports);

    if (saved) {
        console.log(`[NEW REPORT] ID: ${report.id} | Type: ${report.type} | Authority: ${report.authority}`);
        console.log(`[NEW REPORT] Description: ${description.substring(0, 100)}...`);
        console.log(`[NEW REPORT] Total reports in storage: ${reports.length}`);

        res.status(201).json({
            success: true,
            message: 'Report submitted successfully. A trusted authority will follow up.',
            reportId: report.id,
            timestamp: report.timestamp,
            stored: true
        });
    } else {
        // Even if file save fails, still return success (in-memory)
        res.status(201).json({
            success: true,
            message: 'Report submitted but could not be saved to file. Please check server logs.',
            reportId: report.id,
            timestamp: report.timestamp,
            stored: false
        });
    }
});

/**
 * GET /api/reports
 * Get all reports (for admin use)
 */
app.get('/api/reports', (req, res) => {
    res.json({
        total: reports.length,
        reports: reports
    });
});

/**
 * GET /api/reports/stats
 * Get report statistics (must be before /:id to avoid route conflict)
 */
app.get('/api/reports/stats', (req, res) => {
    const byType = {};
    const byAuthority = {};
    reports.forEach(r => {
        byType[r.type] = (byType[r.type] || 0) + 1;
        byAuthority[r.authority] = (byAuthority[r.authority] || 0) + 1;
    });

    const today = new Date().toISOString().split('T')[0];
    const todayCount = reports.filter(r => r.timestamp.startsWith(today)).length;

    res.json({
        totalReports: reports.length,
        todayReports: todayCount,
        byType,
        byAuthority
    });
});

/**
 * GET /api/reports/:id
 * Get a single report by ID
 */
app.get('/api/reports/:id', (req, res) => {
    const report = reports.find(r => r.id === req.params.id);
    if (!report) {
        return res.status(404).json({ error: 'Report not found.' });
    }
    res.json(report);
});

/**
 * DELETE /api/reports/:id
 * Delete a report by ID
 */
app.delete('/api/reports/:id', (req, res) => {
    const index = reports.findIndex(r => r.id === req.params.id);
    if (index === -1) {
        return res.status(404).json({ error: 'Report not found.' });
    }
    const deleted = reports.splice(index, 1)[0];
    saveReports(reports);
    res.json({
        success: true,
        message: 'Report deleted.',
        deletedReport: deleted
    });
});

/**
 * GET /api/authorities
 * Get available authorities to send reports to
 */
app.get('/api/authorities', (req, res) => {
    const authorities = {
        police: {
            name: 'Police / Law Enforcement',
            phone: '999',
            email: 'reports@police.gov',
            description: 'Report crimes and request immediate police assistance.'
        },
        'gbv-helpline': {
            name: 'National GBV Helpline',
            phone: '116',
            email: 'help@gbvhelpline.org',
            description: '24/7 confidential support for gender-based violence survivors.'
        },
        'social-services': {
            name: 'Social Services',
            phone: '0800123456',
            email: 'support@socialservices.gov',
            description: 'Counselling, shelter referrals, and family support services.'
        },
        'legal-aid': {
            name: 'Legal Aid',
            phone: '0800789012',
            email: 'legal@aid.org',
            description: 'Free legal advice and assistance for GBV cases.'
        }
    };
    res.json(authorities);
});

/**
 * GET /api/resources
 * Get available resources and support services
 */
app.get('/api/resources', (req, res) => {
    const resources = [
        {
            name: 'Emergency Services',
            phone: '999',
            description: 'Police, ambulance, fire — immediate life-threatening emergencies.',
            type: 'emergency'
        },
        {
            name: 'GBV National Helpline',
            phone: '116',
            description: 'Confidential counselling and referral services, 24/7.',
            type: 'helpline'
        },
        {
            name: 'Women\'s Shelter Network',
            phone: '0800456789',
            description: 'Safe accommodation and support for survivors.',
            type: 'shelter'
        },
        {
            name: 'Legal Aid Society',
            phone: '0800789012',
            description: 'Free legal representation for GBV survivors.',
            type: 'legal'
        },
        {
            name: 'Child Protection Unit',
            phone: '0800111222',
            description: 'Support for children affected by violence.',
            type: 'support'
        }
    ];
    res.json(resources);
});

// ── Catch-all: serve index.html for any route ──
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// ── Start Server ──

app.listen(PORT, () => {
    console.log('═══════════════════════════════════════════');
    console.log('  GBV Help App - Backend Server');
    console.log('═══════════════════════════════════════════');
    console.log(`  Server running at: http://localhost:${PORT}`);
    console.log(`  Frontend: http://localhost:${PORT}`);
    console.log(`  Admin Dashboard: http://localhost:${PORT}/admin`);
    console.log(`  API Health: http://localhost:${PORT}/api/health`);
    console.log(`  Reports File: ${REPORTS_FILE}`);
    console.log(`  Stored Reports: ${reports.length}`);
    console.log('═══════════════════════════════════════════');
});
