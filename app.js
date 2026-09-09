const API_BASE = "https://obituaries-dana-tablets-admission.trycloudflare.com";

const tg = window.Telegram?.WebApp;

if (tg) {
    tg.ready();
    tg.expand();
}

let workers = [];
let state = {};
let currentDate = new Date().toISOString().slice(0, 10);


// ===============================
// INITIAL SETUP
// ===============================

document.getElementById("date").value = currentDate;

document.getElementById("date").addEventListener("change", async () => {
    currentDate = document.getElementById("date").value;
    await loadAttendance();
});


// Set current month in Reports
const reportMonth = document.getElementById("reportMonth");

if (reportMonth) {
    reportMonth.value = new Date().toISOString().slice(0, 7);
}


// Telegram user
if (tg?.initDataUnsafe?.user) {

    const u = tg.initDataUnsafe.user;

    document.getElementById("welcomeName").textContent =
        "Hello, " + (u.first_name || "User");

    document.getElementById("avatar").textContent =
        (u.first_name || "U")[0].toUpperCase();
}


// ===============================
// TELEGRAM HEADERS
// ===============================

function headers() {

    return {
        "X-Telegram-Init-Data": tg?.initData || ""
    };
}


// ===============================
// API GET
// ===============================

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


// ===============================
// API POST
// ===============================

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


// ===============================
// ERROR MESSAGE
// ===============================

function showError(message) {

    console.error(message);

    if (tg?.showPopup) {

        tg.showPopup({

            title: "HNCPL Attendance",

            message: message,

            buttons: [
                { type: "ok" }
            ]

        });

    } else {

        alert(message);

    }
}


// ===============================
// RENDER
// ===============================

function render() {


    // Attendance table

    document.getElementById("rows").innerHTML =

        workers.map(w => `

            <tr>

                <td>
                    <b>${w.employee_id}</b>
                </td>


                <td>

                    <b>${w.name}</b>

                    <br>

                    <small>
                        ${w.designation}
                    </small>

                </td>


                <td>

                    <div class="statuses">

                        ${["P","A","HD","L","WO","H"].map(s => `

                            <button

                                class="status ${
                                    state[w.id] === s
                                    ? "selected"
                                    : ""
                                }"

                                onclick="
                                    setStatus(
                                        ${w.id},
                                        '${s}'
                                    )
                                ">

                                ${s}

                            </button>

                        `).join("")}

                    </div>

                </td>

            </tr>

        `).join("");


    // Workers page

    document.getElementById("workersList").innerHTML =

        workers.map(w => `

            <div class="worker">

                <div>

                    <b>
                        ${w.name}
                    </b>

                    <small>
                        ${w.employee_id}
                        ·
                        ${w.designation}
                    </small>

                </div>


                <b>
                    ${state[w.id] || "-"}
                </b>

            </div>

        `).join("");


    // Dashboard counters

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


// ===============================
// SET ATTENDANCE STATUS
// ===============================

function setStatus(id, status) {

    state[id] = status;

    render();

}


// ===============================
// LOAD USER + WORKERS
// ===============================

async function loadData() {

    try {


        // User information

        const me = await apiGet("/api/me");


        if (me.name) {

            document.getElementById("welcomeName").textContent =
                "Hello, " + me.name;

        }


        // Site information

        if (me.site) {

            document.querySelector(".site h2").textContent =
                me.site.name || "Site";


            document.querySelector(".site p").textContent =
                me.site.location || "";

        }


        // Workers

        const data =
            await apiGet("/api/workers");


        workers =
            data.workers || [];


        // Attendance

        await loadAttendance();


        // Dashboard

        await loadDashboard();


    } catch (error) {

        showError(error.message);

    }

}


// ===============================
// LOAD ATTENDANCE
// ===============================

async function loadAttendance() {

    try {


        const date =
            document.getElementById("date").value;


        const data =
            await apiGet(
                "/api/attendance?date=" +
                encodeURIComponent(date)
            );


        state = {};


        (data.attendance || []).forEach(row => {

            state[row.worker_id] =
                row.status || "";

        });


        render();


    } catch (error) {

        showError(error.message);

    }

}


// ===============================
// SAVE ATTENDANCE
// ===============================

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

            await apiPost(

                "/api/attendance",

                {

                    worker_id:
                        worker.id,

                    attendance_date:
                        date,

                    status:
                        state[worker.id]

                }

            );

        }


        if (tg?.showPopup) {

            tg.showPopup({

                title: "Attendance",

                message:
                    "Attendance saved successfully.",

                buttons: [
                    { type: "ok" }
                ]

            });

        } else {

            alert(
                "Attendance saved successfully."
            );

        }


        await loadAttendance();

        await loadDashboard();


    } catch (error) {

        showError(error.message);

    }

}


// ===============================
// LOAD DASHBOARD
// ===============================

async function loadDashboard() {

    try {


        const data =
            await apiGet("/api/dashboard");


        const summary =
            data.summary || {};


        document.getElementById("present").textContent =
            summary.present || 0;


        document.getElementById("absent").textContent =
            summary.absent || 0;


        document.getElementById("leave").textContent =
            summary.leave || 0;


        document.getElementById("total").textContent =
            summary.total || 0;


        if (data.site) {

            document.querySelector(".site h2").textContent =
                data.site.name || "Site";


            document.querySelector(".site p").textContent =
                data.site.location || "";

        }


    } catch (error) {

        console.error(
            "Dashboard error:",
            error
        );

    }

}


// ===============================
// MONTHLY REPORT
// ===============================

async function loadMonthlyReport() {

    try {


        const month =
            document.getElementById(
                "reportMonth"
            ).value;


        if (!month) {

            showError(
                "Please select a month."
            );

            return;

        }


        const data =
            await apiGet(
                "/api/monthly-report?month=" +
                encodeURIComponent(month)
            );


        const reportRows =
            document.getElementById(
                "reportRows"
            );


        const reportSummary =
            document.getElementById(
                "reportSummary"
            );


        const reportWorkers =
            data.workers || [];


        // =========================
        // TOTAL SUMMARY
        // =========================

        let totalP = 0;
        let totalA = 0;
        let totalHD = 0;
        let totalL = 0;
        let totalWO = 0;
        let totalH = 0;


        reportWorkers.forEach(w => {

            totalP += Number(w.present || 0);

            totalA += Number(w.absent || 0);

            totalHD += Number(w.half_day || 0);

            totalL += Number(w.leave || 0);

            totalWO += Number(w.week_off || 0);

            totalH += Number(w.holiday || 0);

        });


        // Summary cards

        reportSummary.innerHTML = `

            <div>

                <b>${totalP}</b>

                <small>
                    Present
                </small>

            </div>


            <div>

                <b>${totalA}</b>

                <small>
                    Absent
                </small>

            </div>


            <div>

                <b>${totalHD}</b>

                <small>
                    Half Day
                </small>

            </div>


            <div>

                <b>${totalL}</b>

                <small>
                    Leave
                </small>

            </div>

        `;


        // =========================
        // REPORT TABLE
        // =========================

        if (!reportWorkers.length) {

            reportRows.innerHTML = `

                <tr>

                    <td colspan="8">

                        No workers found.

                    </td>

                </tr>

            `;

            return;

        }


        reportRows.innerHTML =

            reportWorkers.map(w => `

                <tr>

                    <td>
                        <b>
                            ${w.employee_id}
                        </b>
                    </td>


                    <td>

                        <b>
                            ${w.name}
                        </b>

                        <br>

                        <small>
                            ${w.designation}
                        </small>

                    </td>


                    <td>
                        ${w.present || 0}
                    </td>


                    <td>
                        ${w.absent || 0}
                    </td>


                    <td>
                        ${w.half_day || 0}
                    </td>


                    <td>
                        ${w.leave || 0}
                    </td>


                    <td>
                        ${w.week_off || 0}
                    </td>


                    <td>
                        ${w.holiday || 0}
                    </td>

                </tr>

            `).join("");


    } catch (error) {

        showError(
            error.message
        );

    }

}


// ===============================
// PAGE NAVIGATION
// ===============================

function showPage(id) {

    document
        .querySelectorAll(".page")
        .forEach(x =>
            x.classList.remove("active")
        );


    const page =
        document.getElementById(id);


    if (page) {

        page.classList.add("active");

    }


    document
        .querySelectorAll("nav button")
        .forEach(x =>

            x.classList.toggle(

                "active",

                x.dataset.page === id

            )

        );


    // Automatically load report
    if (id === "reports") {

        const month =
            document.getElementById(
                "reportMonth"
            );

        if (month && month.value) {

            loadMonthlyReport();

        }

    }


    scrollTo(0, 0);

}


// ===============================
// START APP
// ===============================

render();

showPage("home");

loadData();
