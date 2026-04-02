const API_BASE = '/api/meetings';

const app = {
    init() {
        this.form = document.getElementById('createMeetingForm');
        this.tableBody = document.getElementById('meetingsTableBody');
        this.submitBtn = document.getElementById('submitBtn');
        this.messageEl = document.getElementById('formMessage');

        this.tokenHistory = [];
        this.currentPage = 0;
        this.nextToken = null;

        this.setupEventListeners();
        this.setDefaultStartTime();
        this.loadMeetings();
    },

    setDefaultStartTime() {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(10, 0, 0, 0);

        const yyyy = tomorrow.getFullYear();
        const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
        const dd = String(tomorrow.getDate()).padStart(2, '0');
        document.getElementById('startDate').value = `${yyyy}-${mm}-${dd}`;

        document.getElementById('startTimeInput').value = '10:00';
    },

    setupEventListeners() {
        this.form.addEventListener('submit', async e => {
            e.preventDefault();
            await this.createMeeting();
        });
    },

    showMessage(text, isError = false) {
        this.messageEl.textContent = text;
        this.messageEl.className = `message ${isError ? 'error' : 'success'}`;
        this.messageEl.classList.remove('hidden');
        setTimeout(() => this.messageEl.classList.add('hidden'), 5000);
    },

    async loadMeetings(token = null) {
        try {
            this.tableBody.innerHTML =
                '<tr><td colspan="5" class="text-center text-muted py-4">Loading meetings...</td></tr>';

            const url = token ? `${API_BASE}?nextPageToken=${encodeURIComponent(token)}` : API_BASE;
            const response = await fetch(url);

            if (!response.ok) throw new Error(`Server returned ${response.status}`);

            const result = await response.json();

            this.nextToken = result.nextPageToken || null;
            this.renderMeetings(result.items || result);
            this.updatePaginationUI();
        } catch (error) {
            console.error(error);
            this.tableBody.innerHTML = `<tr><td colspan="5" class="text-center error py-4">
                    ⚠️ ${error.message}. Is the server running?
                </td></tr>`;
        }
    },

    nextPage() {
        if (!this.nextToken) return;
        this.tokenHistory.push(this.nextToken);
        this.currentPage++;
        this.loadMeetings(this.nextToken);
    },

    prevPage() {
        if (this.currentPage === 0) return;
        this.tokenHistory.pop();
        this.currentPage--;
        const previousToken =
            this.tokenHistory.length > 0 ? this.tokenHistory[this.tokenHistory.length - 1] : null;
        this.loadMeetings(previousToken);
    },

    updatePaginationUI() {
        const controls = document.getElementById('paginationControls');
        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');
        const info = document.getElementById('pageInfo');

        controls.style.display = 'flex';
        prevBtn.disabled = this.currentPage === 0;
        nextBtn.disabled = !this.nextToken;
        info.textContent = `Page ${this.currentPage + 1}`;
    },

    renderMeetings(meetings) {
        if (!meetings || meetings.length === 0) {
            this.tableBody.innerHTML =
                '<tr><td colspan="5" class="text-center text-muted py-4">No meetings found. Create one!</td></tr>';
            return;
        }

        this.tableBody.innerHTML = meetings
            .map(
                m => `
            <tr>
                <td>
                    <span style="font-weight:600;">${this.escHtml(m.topic)}</span>
                    ${
                        m.joinUrl
                            ? `<br><a href="${m.joinUrl}" class="join-link" target="_blank" rel="noopener">
                               Join &rarr;
                           </a>`
                            : ''
                    }
                </td>
                <td>${new Date(m.startTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</td>
                <td>${m.durationMinutes} min</td>
                <td><span class="status-badge status-${m.status}">${m.status}</span></td>
                <td>
                    <button class="btn btn-danger" onclick="app.deleteMeeting('${m.id}')"
                            title="Delete meeting">&#128465; Delete</button>
                </td>
            </tr>
        `,
            )
            .join('');
    },

    buildPayload() {
        const get = id => document.getElementById(id);
        const bool = id => get(id).checked;
        const val = id => get(id).value.trim();

        const dateVal = val('startDate');
        const timeVal = val('startTimeInput');
        const localDateTime = new Date(`${dateVal}T${timeVal}:00`); // parsed as browser-local time

        const payload = {
            topic: val('topic'),
            startTime: localDateTime.toISOString(),
            durationMinutes: parseInt(val('durationMinutes'), 10),
            timezone: val('timezone') || 'UTC',
            type: parseInt(val('meetingType'), 10),
            settings: {
                waitingRoom: bool('waitingRoom'),
                muteUponEntry: bool('muteUponEntry'),
                joinBeforeHost: bool('joinBeforeHost'),
                autoRecording: val('autoRecording'),
            },
        };

        const password = val('password');
        if (password) payload.password = password;

        const agenda = val('agenda');
        if (agenda) payload.agenda = agenda;

        return payload;
    },

    async createMeeting() {
        this.submitBtn.disabled = true;
        this.submitBtn.textContent = 'Creating...';

        try {
            const payload = this.buildPayload();
            const response = await fetch(API_BASE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (!response.ok) {
                if (result.status === 422) {
                    const msgs = Object.values(result.errors).flat().join(' · ');
                    throw new Error(msgs || 'Validation failed');
                }
                throw new Error(result.title || `Error ${response.status}`);
            }

            this.showMessage(`✅ "${result.topic}" created!`);
            this.form.reset();
            this.setDefaultStartTime();

            this.tokenHistory = [];
            this.currentPage = 0;
            this.nextToken = null;
            await this.loadMeetings();
        } catch (error) {
            console.error(error);
            this.showMessage(error.message, true);
        } finally {
            this.submitBtn.disabled = false;
            this.submitBtn.textContent = 'Create Meeting';
        }
    },

    async deleteMeeting(id) {
        if (!confirm('Delete this meeting? This cannot be undone.')) return;
        try {
            const response = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.message || `Delete failed (${response.status})`);
            }
            this.showMessage('Meeting deleted.');

            this.tokenHistory = [];
            this.currentPage = 0;
            this.nextToken = null;
            await this.loadMeetings();
        } catch (error) {
            console.error(error);
            this.showMessage(error.message, true);
        }
    },

    escHtml(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    },
};

document.addEventListener('DOMContentLoaded', () => app.init());
