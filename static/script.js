let stateIcons = {
    0: "package-variant",
    1: "package-variant-closed",
    2: "package-variant-closed-check",
    3: "archive",
    4: "archive-clock",
    5: "dolly",
    6: "truck",
    7: "check",
}
const states = [
    { ID: 0, Name: "Creato" },
    { ID: 1, Name: "Pronto per essere ricevuto" },
    { ID: 2, Name: "In ricezione" },
    { ID: 3, Name: "In deposito" },
    { ID: 4, Name: "In archivio" },
    { ID: 5, Name: "Pronto per essere spedito" },
    { ID: 6, Name: "Spedito" },
    { ID: 7, Name: "Consegnato" },
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
const updateOrderRef = React.createRef();
const notificationRef = React.createRef();


const notificationRoot = ReactDOM.createRoot(document.querySelector("#notification-root"))
notificationRoot.render(<Notification ref={notificationRef} />)

const info_order = document.querySelector("#info-order-root")
ReactDOM.createRoot(info_order).render(<InfoOrder ref={infoOrderRef} notificationRef={notificationRef} />)

const updateOrder = document.querySelector("#update-order-root")
ReactDOM.createRoot(updateOrder).render(<UpdateOrder ref={updateOrderRef} orderTableRef={ordersTableRef} notificationRef={notificationRef} />)

const ordersRoot = ReactDOM.createRoot(document.querySelector("#orders-root"))
ordersRoot.render(<OrdersTable ref={ordersTableRef} infoOrderRef={infoOrderRef} updateOrderRef={updateOrderRef} insertOrderRef={insertOrderRef} notificationRef={notificationRef} />)

fetch("/api/me")
    .then(r => r.json())
    .then(r => {
        document.getElementById("azienda-nome").innerText = r.CompanyName
        document.getElementById("navbar-username").innerText = r.Username
        document.getElementById("navbar-company").innerText = r.CompanyName
        if (r.CompanyID < 0 || r.CompanyRole == producerRole) Array.from(document.getElementsByClassName("only-producer")).forEach(el => el.classList.remove("is-hidden"))
        if (r.CompanyID < 0 || r.CompanyRole == receiverRole) Array.from(document.getElementsByClassName("only-receiver")).forEach(el => el.classList.remove("is-hidden"))
        if (r.CompanyID < 0) Array.from(document.getElementsByClassName("only-admin")).forEach(el => el.classList.remove("is-hidden"))

        ReactDOM.createRoot(insert_order).render(<InsertOrder ref={insertOrderRef} sender={Math.max(r.CompanyID, 0)} orderTableRef={ordersTableRef} notificationRef={notificationRef} />)
    })
    .catch(err => notificationRef.current.notify("Informazioni"))

const insert_order = document.querySelector("#insert-order-root")
const insert_azienda = document.querySelector("#insert-azienda-root")
ReactDOM.createRoot(insert_azienda).render(<InsertAzienda onSuccess={() => insertOrderRef.current.updateReceivers()} notificationRef={notificationRef} />)

insert_azienda.style.display = 'none'

function add_order_button() {
    insertOrderRef.current.show()
}

function hide_order_button() {
    alert("Hide order")
    insertOrderRef.current.close()
}

function add_azienda_button() {
    insert_azienda.style.display = 'block';
}

function hide_azienda_button() {
    insert_azienda.style.display = 'none'
}