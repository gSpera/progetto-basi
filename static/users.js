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

const roleProduttore = 1
const roleRicevitore = 2
const roleRegione = 3
const roleZona = 4
const roleRivenditore = 5

const userRoleString = [
    "X",
    "X - Produttore",
    "X - Ricevitore",
    "Agente di regione",
    "Agente di zona",
    "Rivenditore",
]
userRoleString[-1] = "Amministratore"

const usersTableRef = React.createRef();
const editUserRef = React.createRef();
const notificationRef = React.createRef();

const userTableRoot = document.querySelector("#users-root")
const editUserRoot = ReactDOM.createRoot(document.querySelector("#edit-user-root"))
const notificationRoot = ReactDOM.createRoot(document.querySelector("#notification-root"))

function editUserOnSuccess() {
    usersTableRefRef.current.update()
}

notificationRoot.render(<Notification ref={notificationRef} />)
editUserRoot.render(<EditUser ref={editUserRef} notificationRef={notificationRef} onSuccess={editUserOnSuccess}/>)

fetch("/api/me")
    .then(r => r.json())
    .then(r => {
        document.getElementById("azienda-nome").innerText = r.CompanyName
        document.getElementById("navbar-username").innerText = r.Username
        document.getElementById("navbar-company").innerText = r.CompanyName
        if (r.CompanyID < 0 || r.CompanyRole == roleProduttore) Array.from(document.getElementsByClassName("only-producer")).forEach(el => el.classList.remove("is-hidden"))
        if (r.CompanyID < 0 || r.CompanyRole == roleRicevitore) Array.from(document.getElementsByClassName("only-receiver")).forEach(el => el.classList.remove("is-hidden"))
        if (r.CompanyID >= 0) Array.from(document.getElementsByClassName("only-admin")).forEach(el => el.classList.remove("is-hidden"))
        else {
            document.getElementById("only-admin-css").remove()
        }

        ReactDOM.createRoot(userTableRoot).render(
            <UsersTable ref={usersTableRef} notificationRef={notificationRef} editUserRef={editUserRef} name={r.Username} companyID={r.CompanyID}/>
        )
    })
    .catch(err => notificationRef.current.notify("Informazioni: " + err))

document.getElementById("users-header-date").innerText = "Aggiornati al " + new Date().toLocaleString()

function add_user_button() {
    editUserRef.current.newUser()
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