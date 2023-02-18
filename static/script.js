let stateIcons = {
    0: "package-variant",
    1: "package-variant-closed",
    2: "package-variant-closed-check",
    3: "archive",
    4: "archive-clock",
    5: "dolly",
    6: "truck",
    7: "check",
    8: "close",
    9: "warehouse",
    10: "warehouse",
    11: "warehouse",
    12: "warehouse",
    13: "warehouse",
}
const stateColors = {
    0: "",
    1: "",
    2: "",
    3: "has-text-info",
    4: "has-text-info",
    5: "",
    6: "has-text-link",
    7: "has-text-success",
    8: "has-text-danger",
    9: "has-text-info",
    10: "has-text-info",
    11: "has-text-info",
    12: "has-text-info",
    13: "has-text-info",
}

const states = [
    { ID: 0, Name: "In ricezione" },
    { ID: 1, Name: "Pronto per essere ricevuto" },
    { ID: 2, Name: "Trasporto in deposito" },
    { ID: 3, Name: "In deposito" },
    { ID: 4, Name: "In archivio" },
    { ID: 5, Name: "Pronto per essere spedito" },
    { ID: 6, Name: "Spedito" },
    { ID: 7, Name: "Consegnato" },
    { ID: 8, Name: "Annullato" },
    { ID: 9, Name: "Hub Sicilia" },
    { ID: 10, Name: "Hub Lombardia" },
    { ID: 11, Name: "Hub Veneto" },
    { ID: 12, Name: "Hub Piemonte" },
    { ID: 13, Name: "Hub Sardegna" },
]

const regioni = [
    { ID: 0, Name: "Abruzzo" },
    { ID: 1, Name: "Basilicata" },
    { ID: 2, Name: "Calabria" },
    { ID: 3, Name: "Campania" },
    { ID: 4, Name: "Emilia Romagna" },
    { ID: 5, Name: "Friuli Venezia Giulia" },
    { ID: 6, Name: "Lazio" },
    { ID: 7, Name: "Liguria" },
    { ID: 8, Name: "Lombardia" },
    { ID: 9, Name: "Marche" },
    { ID: 10, Name: "Molise" },
    { ID: 11, Name: "Piemonte" },
    { ID: 12, Name: "Puglia" },
    { ID: 13, Name: "Sardegna" },
    { ID: 14, Name: "Sicilia" },
    { ID: 15, Name: "Toscana" },
    { ID: 16, Name: "Trentino Alto Adige" },
    { ID: 17, Name: "Umbria" },
    { ID: 18, Name: "Valle d'Aosta" },
    { ID: 19, Name: "Veneto" },
]

const producerRole = 1
const receiverRole = 2

const ordersTableRef = React.createRef();
const infoOrderRef = React.createRef();
const insertOrderRef = React.createRef();
const insertAziendaRef = React.createRef();
const updateOrderRef = React.createRef();
const notificationRef = React.createRef();
const attachmentsRef = React.createRef();


const notificationRoot = ReactDOM.createRoot(document.querySelector("#notification-root"))
notificationRoot.render(<Notification ref={notificationRef} />)

const info_order = document.querySelector("#info-order-root")
ReactDOM.createRoot(info_order).render(<InfoOrder ref={infoOrderRef} notificationRef={notificationRef} />)

const updateOrder = document.querySelector("#update-order-root")
ReactDOM.createRoot(updateOrder).render(<UpdateOrder ref={updateOrderRef} orderTableRef={ordersTableRef} notificationRef={notificationRef} />)

const ordersRoot = ReactDOM.createRoot(document.querySelector("#orders-root"))
ordersRoot.render(<OrdersTable ref={ordersTableRef} infoOrderRef={infoOrderRef} updateOrderRef={updateOrderRef} insertOrderRef={insertOrderRef} attachmentsRef={attachmentsRef} notificationRef={notificationRef} />)

fetch("/api/me")
    .then(r => r.json())
    .then(r => {
        document.getElementById("azienda-nome").innerText = r.CompanyName
        document.getElementById("navbar-username").innerText = r.Username
        document.getElementById("navbar-company").innerText = r.CompanyName
        if (r.CompanyID < 0 || r.CompanyRole == producerRole) Array.from(document.getElementsByClassName("only-producer")).forEach(el => el.classList.remove("is-hidden"))
        if (r.CompanyID < 0 || r.CompanyRole == receiverRole) Array.from(document.getElementsByClassName("only-receiver")).forEach(el => el.classList.remove("is-hidden"))
        if (r.CompanyID >= 0) Array.from(document.getElementsByClassName("only-admin")).forEach(el => el.classList.remove("is-hidden"))
        else {
            document.getElementById("only-admin-css").remove()
        }

        ReactDOM.createRoot(insert_order).render(<InsertOrder ref={insertOrderRef} sender={Math.max(r.CompanyID, 0)} orderTableRef={ordersTableRef} insertAziendaRef={insertAziendaRef} notificationRef={notificationRef} />)
    })
    .catch(err => notificationRef.current.notify("Informazioni: " + err))

const insert_order = document.querySelector("#insert-order-root")
const insert_azienda = document.querySelector("#insert-azienda-root")
const attachments = document.querySelector("#attachments-root")
ReactDOM.createRoot(insert_azienda).render(<InsertAzienda ref={insertAziendaRef} onSuccess={() => insertOrderRef.current.updateReceivers()} notificationRef={notificationRef} />)
ReactDOM.createRoot(attachments).render(<AttachmentModal ref={attachmentsRef} notificationRef={notificationRef} />)

document.getElementById("order-header-date").innerText = "Aggiornati al " + new Date().toLocaleString()

function add_order_button() {
    insertOrderRef.current.show()
}

function hide_order_button() {
    insertOrderRef.current.close()
}

function add_azienda_button() {
    insertAziendaRef.current.addAzienda("")
}

function hide_azienda_button() {
    insertAziendaRef.current.close()
}

function edit_company_button() {
    insertAziendaRef.current.openEdit()
}

// Used HTML input tag
function dateToISO8601(date) {
    // yyyy-mm-dd
    return `${date.getFullYear()}-${String((date.getMonth()) + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
function dateToRFC339Nano(date) {
    // 2006-01-02T15:04:05Z07:00
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}T${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}:${String(date.getUTCSeconds()).padStart(2, '0')}.${date.getUTCMilliseconds()}Z`
}