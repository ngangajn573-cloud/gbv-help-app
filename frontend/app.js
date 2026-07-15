/* GBV Help App - Core functionality */

const STORAGE_KEYS = {
    contacts: 'gbv_trusted_contacts',
    reports: 'gbv_reports_log'
};

const AUTHORITIES = {
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

const RESOURCES = [
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

document.addEventListener('DOMContentLoaded', init);

function init() {
    setupNavigation();
    setupQuickExit();
    setupDisguiseMode();
    setupReportForm();
    setupContacts();
    setupSOS();
    renderResources();
    setupAnonymousToggle();
}

/* ── Navigation ── */

function setupNavigation() {
    const links = document.querySelectorAll('.nav-link');
    const toggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');

    links.forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            const target = link.getAttribute('href').slice(1);
            showPage(target);
            links.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            navLinks.classList.remove('open');
        });
    });

    toggle.addEventListener('click', () => {
        navLinks.classList.toggle('open');
    });
}

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const page = document.getElementById(pageId);
    if (page) page.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ── Quick Exit ── */

function setupQuickExit() {
    document.getElementById('quickExit').addEventListener('click', () => {
        window.location.replace('https://www.google.com/search?q=weather');
    });
}

/* ── Disguise Mode ── */

function setupDisguiseMode() {
    const disguiseScreen = document.getElementById('disguiseScreen');
    const mainApp = document.getElementById('mainApp');
    const navLogo = document.getElementById('navLogo');
    let tapCount = 0;
    let tapTimer = null;

    function enableDisguise() {
        disguiseScreen.classList.remove('hidden');
        mainApp.classList.add('hidden');
    }

    function disableDisguise() {
        disguiseScreen.classList.add('hidden');
        mainApp.classList.remove('hidden');
        tapCount = 0;
    }

    document.getElementById('enableDisguise').addEventListener('click', enableDisguise);
    document.getElementById('toggleDisguise').addEventListener('click', enableDisguise);

    disguiseScreen.addEventListener('click', () => {
        tapCount++;
        clearTimeout(tapTimer);
        tapTimer = setTimeout(() => { tapCount = 0; }, 800);
        if (tapCount >= 3) disableDisguise();
    });

    navLogo.addEventListener('click', () => {
        tapCount++;
        clearTimeout(tapTimer);
        tapTimer = setTimeout(() => { tapCount = 0; }, 800);
        if (tapCount >= 3) disableDisguise();
    });
}

/* ── Trusted Contacts ── */

function getContacts() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.contacts)) || [];
    } catch {
        return [];
    }
}

function saveContacts(contacts) {
    localStorage.setItem(STORAGE_KEYS.contacts, JSON.stringify(contacts));
}

function setupContacts() {
    const form = document.getElementById('contactForm');
    form.addEventListener('submit', e => {
        e.preventDefault();
        const contact = {
            id: Date.now().toString(),
            name: document.getElementById('contactName').value.trim(),
            phone: document.getElementById('contactPhone').value.trim(),
            relation: document.getElementById('contactRelation').value.trim()
        };
        const contacts = getContacts();
        contacts.push(contact);
        saveContacts(contacts);
        form.reset();
        renderContacts();
        updateSOSStatus();
    });
    renderContacts();
}

function renderContacts() {
    const list = document.getElementById('contactsList');
    const contacts = getContacts();

    if (contacts.length === 0) {
        list.innerHTML = '<li class="contacts-empty">No trusted contacts yet. Add at least one for SOS to work.</li>';
        return;
    }

    list.innerHTML = contacts.map(c => `
        <li class="contact-item">
            <div class="contact-info">
                <strong>${escapeHtml(c.name)}</strong>
                <span>${escapeHtml(c.phone)}</span>
                ${c.relation ? `<span class="contact-relation">${escapeHtml(c.relation)}</span>` : ''}
            </div>
            <button type="button" class="btn btn-small btn-danger-outline" data-id="${c.id}">Remove</button>
        </li>
    `).join('');

    list.querySelectorAll('button[data-id]').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            saveContacts(getContacts().filter(c => c.id !== id));
            renderContacts();
            updateSOSStatus();
        });
    });
}

/* ── SOS Emergency ── */

function setupSOS() {
    const btn = document.getElementById('sosButton');
    let holdTimer = null;
    let holding = false;

    btn.addEventListener('mousedown', startHold);
    btn.addEventListener('mouseup', cancelHold);
    btn.addEventListener('mouseleave', cancelHold);
    btn.addEventListener('touchstart', e => { e.preventDefault(); startHold(); });
    btn.addEventListener('touchend', cancelHold);

    function startHold() {
        holding = true;
        btn.classList.add('holding');
        document.getElementById('sosStatus').textContent = 'Hold... releasing will cancel';
        holdTimer = setTimeout(() => {
            if (holding) triggerSOS();
        }, 2000);
    }

    function cancelHold() {
        holding = false;
        btn.classList.remove('holding');
        clearTimeout(holdTimer);
        updateSOSStatus();
    }

    updateSOSStatus();
}

function updateSOSStatus() {
    const contacts = getContacts();
    const status = document.getElementById('sosStatus');
    if (contacts.length === 0) {
        status.textContent = 'Add trusted contacts first for SOS to work.';
    } else {
        status.textContent = `Ready — will alert ${contacts.length} contact(s). Hold SOS for 2 seconds.`;
    }
}

async function triggerSOS() {
    const contacts = getContacts();
    const status = document.getElementById('sosStatus');
    const btn = document.getElementById('sosButton');

    btn.classList.remove('holding');
    btn.classList.add('triggered');

    if (contacts.length === 0) {
        status.textContent = 'No trusted contacts. Add contacts first.';
        btn.classList.remove('triggered');
        return;
    }

    status.textContent = 'Sending alerts...';

    let message = document.getElementById('emergencyMessage').value.trim();
    const includeLocation = document.getElementById('includeLocation').checked;

    if (includeLocation) {
        try {
            const pos = await getCurrentPosition();
            const mapsLink = `https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`;
            message += `\n\nMy location: ${mapsLink}`;
        } catch {
            message += '\n\n(Location unavailable — please call me.)';
        }
    }

    let sent = 0;
    for (const contact of contacts) {
        const smsSent = openSMS(contact.phone, `[GBV SOS] ${message}`);
        if (smsSent) sent++;
    }

    if (sent > 0) {
        status.textContent = `Alert opened for ${sent} contact(s). Confirm send on your phone.`;
    } else {
        status.textContent = 'Could not open SMS. Try on a mobile device or copy the message below.';
        fallbackShare(message, contacts);
    }

    if (document.getElementById('callPoliceAfterSOS').checked) {
        setTimeout(() => {
            if (confirm('Do you want to call emergency services (999)?')) {
                window.location.href = 'tel:999';
            }
        }, 1500);
    }

    setTimeout(() => btn.classList.remove('triggered'), 3000);
}

function fallbackShare(message, contacts) {
    const numbers = contacts.map(c => c.phone).join(', ');
    const fullText = `Send to: ${numbers}\n\n${message}`;

    if (navigator.share) {
        navigator.share({ title: 'GBV Emergency SOS', text: fullText }).catch(() => {});
    } else if (navigator.clipboard) {
        navigator.clipboard.writeText(fullText);
        alert('Message copied to clipboard. Paste and send manually.');
    }
}

function openSMS(phone, body) {
    const cleanPhone = phone.replace(/\s/g, '');
    const uri = `sms:${cleanPhone}?body=${encodeURIComponent(body)}`;
    try {
        window.open(uri, '_self');
        return true;
    } catch {
        return false;
    }
}

function getCurrentPosition() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) return reject(new Error('No geolocation'));
        navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000
        });
    });
}

/* ── Report Form ── */

function setupAnonymousToggle() {
    const checkbox = document.getElementById('anonymousReport');
    const fields = document.getElementById('identityFields');

    checkbox.addEventListener('change', () => {
        fields.style.display = checkbox.checked ? 'none' : 'grid';
    });
    fields.style.display = 'none';
}

function setupReportForm() {
    const form = document.getElementById('reportForm');
    const useLocationBtn = document.getElementById('useMyLocation');

    useLocationBtn.addEventListener('click', async () => {
        useLocationBtn.textContent = 'Getting location...';
        try {
            const pos = await getCurrentPosition();
            const { latitude, longitude } = pos.coords;
            document.getElementById('incidentLocation').value =
                `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
        } catch {
            alert('Could not get location. Please enter it manually or check permissions.');
        }
        useLocationBtn.textContent = 'Use my current location';
    });

    form.addEventListener('submit', async e => {
        e.preventDefault();
        await submitReport();
    });
}

async function submitReport() {
    const anonymous = document.getElementById('anonymousReport').checked;
    const authorityKey = document.getElementById('authoritySelect').value;
    const authority = AUTHORITIES[authorityKey];

    const report = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        anonymous,
        name: anonymous ? 'Anonymous' : document.getElementById('reporterName').value.trim(),
        phone: anonymous ? '' : document.getElementById('reporterPhone').value.trim(),
        type: document.getElementById('incidentType').value,
        description: document.getElementById('incidentDescription').value.trim(),
        location: document.getElementById('incidentLocation').value.trim(),
        authority: authorityKey,
        status: 'submitted'
    };

    saveReportLocally(report);

    const emailBody = buildReportEmail(report, authority);
    const subject = encodeURIComponent(`GBV Report - ${report.type} - ${report.anonymous ? 'Anonymous' : report.name}`);
    const body = encodeURIComponent(emailBody);

    window.open(`mailto:${authority.email}?subject=${subject}&body=${body}`, '_self');

    const successEl = document.getElementById('reportSuccess');
    const successText = document.getElementById('reportSuccessText');
    successText.textContent =
        `Your report has been saved and an email draft opened for ${authority.name}. ` +
        'Send the email to complete submission. You can also call them directly.';
    successEl.classList.remove('hidden');
    document.getElementById('reportForm').classList.add('hidden');

    if (document.getElementById('notifyTrustedContacts').checked) {
        const contacts = getContacts();
        const alertMsg = `Someone I trust submitted a GBV report. I may need support. Location: ${report.location || 'not provided'}`;
        for (const contact of contacts) {
            openSMS(contact.phone, alertMsg);
        }
    }
}

function buildReportEmail(report, authority) {
    return [
        `GBV INCIDENT REPORT`,
        `Sent to: ${authority.name}`,
        `Date: ${new Date(report.timestamp).toLocaleString()}`,
        ``,
        `Reporter: ${report.anonymous ? 'Anonymous' : report.name}`,
        report.phone ? `Phone: ${report.phone}` : '',
        `Incident type: ${report.type}`,
        `Location: ${report.location || 'Not provided'}`,
        ``,
        `DESCRIPTION:`,
        report.description,
        ``,
        `---`,
        `This report was submitted via GBV Help App.`
    ].filter(Boolean).join('\n');
}

function saveReportLocally(report) {
    try {
        const reports = JSON.parse(localStorage.getItem(STORAGE_KEYS.reports)) || [];
        reports.push(report);
        localStorage.setItem(STORAGE_KEYS.reports, JSON.stringify(reports));
    } catch { /* storage full or unavailable */ }
}

/* ── Resources ── */

function renderResources() {
    const grid = document.getElementById('resourcesGrid');
    grid.innerHTML = RESOURCES.map(r => `
        <article class="resource-card ${r.type}">
            <h3>${escapeHtml(r.name)}</h3>
            <p>${escapeHtml(r.description)}</p>
            <div class="resource-actions">
                <a href="tel:${r.phone.replace(/\s/g, '')}" class="btn btn-primary btn-small">Call ${escapeHtml(r.phone)}</a>
                <a href="sms:${r.phone.replace(/\s/g, '')}" class="btn btn-outline btn-small">Text</a>
            </div>
        </article>
    `).join('');
}

/* ── Utilities ── */

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
