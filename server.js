/*
 * GBV Help App - Backend Server
 * 
 * This server handles:
 * - Serving the frontend static files
 * - Receiving and storing GBV reports (persisted to JSON file)
 * - Admin dashboard API for viewing and managing reports
 * - Real-time messaging via WebSockets (Socket.io)
 * - Health check endpoint
 */

const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

// ── File-based storage paths ──
const REPORTS_FILE = path.join(__dirname, 'reports.json');
const MESSAGES_FILE = path.join(__dirname, 'messages.json');

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

// ── Message Storage Functions ──

function loadMessages() {
    try {
        if (fs.existsSync(MESSAGES_FILE)) {
            const data = fs.readFileSync(MESSAGES_FILE, 'utf-8');
            return JSON.parse(data);
        }
    } catch (err) {
        console.error('Error loading messages file:', err.message);
    }
    return [];
}

function saveMessages(messages) {
    try {
        fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2), 'utf-8');
        return true;
    } catch (err) {
        console.error('Error saving messages file:', err.message);
        return false;
    }
}

// Load existing data on startup
let reports = loadReports();
let messages = loadMessages();
console.log(`[STARTUP] Loaded ${reports.length} report(s) and ${messages.length} message(s) from files.`);

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
        totalMessages: messages.length,
        storage: 'file-based (reports.json, messages.json)',
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
        priority: 'normal',
        adminNotes: '',
        lastUpdated: new Date().toISOString(),
        serverNote: 'Report received and saved by GBV Help App server'
    };

    reports.push(report);

    // Save to file immediately
    const saved = saveReports(reports);

    if (saved) {
        console.log(`[NEW REPORT] ID: ${report.id} | Type: ${report.type} | Authority: ${report.authority}`);
        console.log(`[NEW REPORT] Description: ${description.substring(0, 100)}...`);
        console.log(`[NEW REPORT] Total reports in storage: ${reports.length}`);

        // Notify admins via WebSocket
        io.emit('new_report', report);

        res.status(201).json({
            success: true,
            message: 'Report submitted successfully. A trusted authority will follow up.',
            reportId: report.id,
            timestamp: report.timestamp,
            stored: true
        });
    } else {
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
 * GET /api/reports/:id/messages
 * Get all messages for a specific report
 */
app.get('/api/reports/:id/messages', (req, res) => {
    const reportMessages = messages.filter(m => m.reportId === req.params.id);
    res.json({
        reportId: req.params.id,
        total: reportMessages.length,
        messages: reportMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    });
});

/**
 * POST /api/reports/:id/messages
 * Send a message for a specific report
 */
app.post('/api/reports/:id/messages', (req, res) => {
    const { sender, senderRole, message } = req.body;

    if (!sender || !senderRole || !message) {
        return res.status(400).json({
            error: 'Missing required fields: sender, senderRole, and message are required.'
        });
    }

    const newMessage = {
        id: uuidv4(),
        reportId: req.params.id,
        sender,
        senderRole, // 'admin' or 'victim'
        message,
        timestamp: new Date().toISOString(),
        read: false
    };

    messages.push(newMessage);
    saveMessages(messages);

    console.log(`[NEW MESSAGE] Report: ${req.params.id} | From: ${sender} (${senderRole})`);

    // Broadcast message via WebSocket
    io.emit('new_message', newMessage);

    res.status(201).json({
        success: true,
        message: 'Message sent successfully.',
        data: newMessage
    });
});

/**
 * PATCH /api/reports/:id
 * Update a report's status, priority, or admin notes
 */
app.patch('/api/reports/:id', (req, res) => {
    const { status, priority, adminNotes } = req.body;
    const report = reports.find(r => r.id === req.params.id);

    if (!report) {
        return res.status(404).json({ error: 'Report not found.' });
    }

    if (status) report.status = status;
    if (priority) report.priority = priority;
    if (adminNotes !== undefined) report.adminNotes = adminNotes;
    
    report.lastUpdated = new Date().toISOString();

    saveReports(reports);

    // Notify admins and victims of status change
    io.emit('report_updated', report);

    res.json({
        success: true,
        message: 'Report updated successfully.',
        report
    });
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
    const urgentCount = reports.filter(r => r.priority === 'high').length;

    res.json({
        totalReports: reports.length,
        todayReports: todayCount,
        urgentReports: urgentCount,
        byType,
        byAuthority
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

/**
 * GET /api/response-templates
 * Get quick response templates for admins
 */
app.get('/api/response-templates', (req, res) => {
    const templates = [
        {
            id: 'template-1',
            title: 'Help is on the way',
            message: 'We have received your report and help is on the way. Please stay in a safe place if possible.'
        },
        {
            id: 'template-2',
            title: 'We are investigating',
            message: 'Thank you for reporting this. We are actively investigating your case and will follow up with you soon.'
        },
        {
            id: 'template-3',
            title: 'Resources available',
            message: 'We have resources available to help you. Please contact the helpline at 116 for immediate support and shelter options.'
        },
        {
            id: 'template-4',
            title: 'Case resolved',
            message: 'Your case has been resolved. We have taken appropriate action and will continue to monitor your safety.'
        },
        {
            id: 'template-5',
            title: 'Urgent assistance needed',
            message: 'Your case has been marked as urgent. A specialist will contact you immediately to provide emergency assistance.'
        },
        {
            id: 'template-6',
            title: 'Legal support available',
            message: 'Legal aid is available for your case. Please contact our legal team at 0800789012 to discuss your options.'
        }
    ];
    res.json(templates);
});

// ── WebSocket Events ──

io.on('connection', (socket) => {
    console.log(`[SOCKET] New client connected: ${socket.id}`);

    // Send all reports to newly connected client
    socket.emit('load_reports', reports);

    // Listen for new messages
    socket.on('send_message', (data) => {
        const newMessage = {
            id: uuidv4(),
            reportId: data.reportId,
            sender: data.sender,
            senderRole: data.senderRole,
            message: data.message,
            timestamp: new Date().toISOString(),
            read: false
        };

        messages.push(newMessage);
        saveMessages(messages);

        // Broadcast to all connected clients
        io.emit('new_message', newMessage);
    });

    // Listen for report status updates
    socket.on('update_report', (data) => {
        const report = reports.find(r => r.id === data.id);
        if (report) {
            if (data.status) report.status = data.status;
            if (data.priority) report.priority = data.priority;
            if (data.adminNotes !== undefined) report.adminNotes = data.adminNotes;
            report.lastUpdated = new Date().toISOString();

            saveReports(reports);
            io.emit('report_updated', report);
        }
    });

    socket.on('disconnect', () => {
        console.log(`[SOCKET] Client disconnected: ${socket.id}`);
    });
});

// ── Catch-all: serve index.html for any route ──
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// ── Start Server ──

server.listen(PORT, () => {
    console.log('═══════════════════════════════════════════');
    console.log('  GBV Help App - Backend Server');
    console.log('═══════════════════════════════════════════');
    console.log(`  Server running at: http://localhost:${PORT}`);
    console.log(`  Frontend: http://localhost:${PORT}`);
    console.log(`  Admin Dashboard: http://localhost:${PORT}/admin.html`);
    console.log(`  API Health: http://localhost:${PORT}/api/health`);
    console.log(`  Reports File: ${REPORTS_FILE}`);
    console.log(`  Messages File: ${MESSAGES_FILE}`);
    console.log(`  Stored Reports: ${reports.length}`);
    console.log(`  Stored Messages: ${messages.length}`);
    console.log('═══════════════════════════════════════════');
});
