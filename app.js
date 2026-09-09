const API_BASE = https://obituaries-dana-tablets-admission.trycloudflare.com;

const tg = window.Telegram?.WebApp;

if (tg) {
    tg.ready();
    tg.expand();
}

let workers = [];
let state = {};

document.getElementById("date").value =
    new Date().toISOString().slice(0, 10);

document.getElementById("date").addEventListener("change", loadAttendance);

if (tg?.initDataUnsafe?.user) {
    const u = tg.initDataUnsafe.user;

    document.getElementById("welcomeName").textContent =
        "Hello, " + (u.first_name || "User");

    document.getElementById("avatar").textContent =
        (u.first_name || "U")[0].toUpperCase();
}

function headers() {
    return {
        "X-Telegram-Init-Data": tg?.initData || ""
    };
}

async function apiGet(url) {
    const response = await fetch(API_BASE + url, {
        headers: headers()
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.detail || "API Error");
    }

    return data;
}

async function apiPost(url, body) {
    const response = await fetch(API_BASE + url, {
        method: "POST",
        headers: {
            ...headers(),
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.detail || "API Error");
    }

    return data;
}

function showError(message) {
    console.error(message);

    if (tg?.showPopup) {
        tg.showPopup({
            title: "HNCPL Attendance",
            message: message,
            buttons: [{ type: "ok" }]
        });
    } else {
        alert(message);
    }
}

function render() {

    document.getElementById("rows").innerHTML =
        workers.map(w => `
            <tr>
                <td><b>${w.employee_id}</b></td>

                <td>
                    <b>${w.name}</b><br>
                    <small>${w.designation}</small>
                </td>

                <td>
                    <div class="statuses">
                        ${["P","A","HD","L","WO","H"].map(s => `
                            <button
                                class="status ${state[w.id] === s ? "selected" : ""}"
                                onclick="setStatus(${w.id}, '${s}')">
                                ${s}
                            </button>
                        `).join("")}
                    </div>
                </td>
            </tr>
        `).join("");

    document.getElementById("workersList").innerHTML =
        workers.map(w => `
            <div class="worker">
                <div>
                    <b>${w.name}</b>
                    <small>
                        ${w.employee_id} · ${w.designation}
                    </small>
                </div>

                <b>${state[w.id] || "-"}</b>
            </div>
        `).join("");

    const values = Object.values(state);

    document.getElementById("present").textContent =
        values.filter(x => x === "P").length;

    document.getElementById("absent").textContent =
        values.filter(x => x === "A").length;

    document.getElementById("leave").textContent =
        values.filter(x => x === "L").length;

    document.getElementById("total").textContent =
        workers.length;
}

function setStatus(id, status) {
    state[id] = status;
    render();
}

async function loadData() {

    try {

        const me = await apiGet("/api/me");

        if (me.name) {
            document.getElementById("welcomeName").textContent =
                "Hello, " + me.name;
        }

        if (me.site) {
            document.querySelector(".site h2").textContent =
                me.site.name || "Site";

            document.querySelector(".site p").textContent =
                me.site.location || "";
        }

        const data = await apiGet("/api/workers");

        workers = data.workers || [];

        await loadAttendance();

    } catch (error) {

        showError(error.message);
    }
}

async function loadAttendance() {

    try {

        const date =
            document.getElementById("date").value;

        const data =
            await apiGet("/api/attendance?date=" +
                encodeURIComponent(date));

        state = {};

        (data.attendance || []).forEach(row => {
            state[row.worker_id] = row.status;
        });

        render();

    } catch (error) {

        showError(error.message);
    }
}

async function saveAttendance() {

    try {

        const date =
            document.getElementById("date").value;

        const selectedWorkers =
            workers.filter(w => state[w.id]);

        if (!selectedWorkers.length) {

            showError(
                "Please select attendance status first."
            );

            return;
        }

        for (const worker of selectedWorkers) {

            await apiPost("/api/attendance", {

                worker_id: worker.id,

                attendance_date: date,

                status: state[worker.id]
            });
        }

        if (tg?.showPopup) {

            tg.showPopup({
                title: "Attendance",
                message: "Attendance saved successfully.",
                buttons: [{ type: "ok" }]
            });

        } else {

            alert("Attendance saved successfully.");
        }

        await loadAttendance();

    } catch (error) {

        showError(error.message);
    }
}

function showPage(id) {

    document
        .querySelectorAll(".page")
        .forEach(x => x.classList.remove("active"));

    document
        .getElementById(id)
        .classList.add("active");

    document
        .querySelectorAll("nav button")
        .forEach(x =>
            x.classList.toggle(
                "active",
                x.dataset.page === id
            )
        );

    scrollTo(0, 0);
}

render();

showPage("home");

loadData();
