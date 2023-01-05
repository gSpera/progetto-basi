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

const producerRole = 1
const receiverRole = 2

const ordersTableRef = React.createRef();
const infoOrderRef = React.createRef();
const insertOrderRef = React.createRef();

const info_order = document.querySelector("#info-order-root")
ReactDOM.createRoot(info_order).render(<InfoOrder ref={infoOrderRef} />)

const ordersRoot = ReactDOM.createRoot(document.querySelector("#orders-root"))
ordersRoot.render(<OrdersTable ref={ordersTableRef} infoOrderRef={infoOrderRef} />)

fetch("/api/me")
    .then(r => r.json())
    .then(r => {
        document.getElementById("azienda-nome").innerText = r.CompanyName
        document.getElementById("navbar-username").innerText = r.Username
        document.getElementById("navbar-company").innerText = r.CompanyName
        if (r.CompanyID < 0 || r.CompanyRole == producerRole) Array.from(document.getElementsByClassName("only-producer")).forEach(el => el.classList.remove("is-hidden"))
        if (r.CompanyID < 0 || r.CompanyRole == receiverRole) Array.from(document.getElementsByClassName("only-receiver")).forEach(el => el.classList.remove("is-hidden"))
        if (r.CompanyID < 0) Array.from(document.getElementsByClassName("only-admin")).forEach(el => el.classList.remove("is-hidden"))

        ReactDOM.createRoot(insert_order).render(<InsertOrder ref={insertOrderRef} sender={Math.max(r.CompanyID, 0)} orderTableRef={ordersTableRef} />)
    })
    .catch(err => console.error(err))

const insert_order = document.querySelector("#insert-order-root")
const insert_azienda = document.querySelector("#insert-azienda-root")
ReactDOM.createRoot(insert_azienda).render(<InsertAzienda onSuccess={() => insertOrderRef.current.updateReceivers()} />)

insert_order.style.display = 'none'
insert_azienda.style.display = 'none'

function add_order_button() {
    insert_order.style.display = 'block'
}

function hide_order_button() {
    insert_order.style.display = 'none'
}

function add_azienda_button() {
    insert_azienda.style.display = 'block';
}

function hide_azienda_button() {
    insert_azienda.style.display = 'none'
}