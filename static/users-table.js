class UsersTable extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            users: [],
            receivers: [],
            search: {
                name: "",
                role: "",
                region: "",
                store: "",
            },
            searchedUsers: [],
            deleteUser: {show: false},
            currentPage: 0,
        };
        this.update = this.update.bind(this);
        this.handleChange = this.handleChange.bind(this);
        this.handleSearch = this.handleSearch.bind(this);
        this.searchUsers = this.searchUsers.bind(this);
        this.editUser = this.editUser.bind(this);
        this.deleteUserButton = this.deleteUserButton.bind(this);
        this.deleteUserDelete = this.deleteUserDelete.bind(this);
        this.deleteUserClose = this.deleteUserClose.bind(this);
        this.loadReceivers = this.loadReceivers.bind(this);
        this.storeName = this.storeName.bind(this);
        this.storesToString =  this.storesToString.bind(this);

        this.loadReceivers();

        setInterval(() => { this.update() }, 5000);
        this.update();
    }

    update() {
        fetch("/api/users-for-company?id="+this.props.companyID)
            .then(r => r.json())
            .then(r => this.setState({
                ...this.state,
                users: r,
            }, this.searchUsers))
            .catch(err => this.props.notificationRef.current.notify("Tabella utenti:" + err))
    }

    handleChange(event) {
        const value = event.target.value;

        switch (event.target.name) {
            default:
                this.props.notificationRef.current.notify("Errore interno tabella ordini")
        }

        this.setState(this.state);
    }

    handleSearch(event) {
        const name = event.target.name.substring("search-".length)
        const value = event.target.value

        this.state.search[name] = value
        this.state.currentPage = 0
        this.setState(this.state, this.searchUsers)
    }

    storesToString(user) {
        if (user.CompanyID != 0) return this.storeName(user.CompanyID);
        if (user.Stores == null) return "";
        return user.Stores.map(r => this.storeName(r)).join(", ")
    }

    searchUsers() {
        const users = this.state.users
        const search = this.state.search

        const strIncludes = (a, b) => a != null && b != null && a.toLowerCase().includes(b.toLowerCase())
        const filtered = users
            .filter(u => search.name.length > 0 ? strIncludes(u.Name, search.name) : true)
            .filter(u => search.role.length > 0 ? strIncludes(userRoleString[u.Role], search.role) : true)
            .filter(u => search.region.length > 0 ? strIncludes(regioni[u.Region].Name, search.region) : true)
            .filter(u => search.store.length > 0 ? strIncludes(this.storesToString(u), search.store) : true)
        this.setState({
            ...this.state,
            searchedUsers: filtered,
        })
    }

    loadReceivers() {
        fetch("/api/avaible-receivers")
            .then(r => r.json())
            .then(r => this.setState({
                ...this.state,
                receivers:  r.Receivers,
            }))
            .catch(err => this.props.notificationRef.current.notify("Impossibile caricare i rivenditori: " + err))
    }
    storeName(id) {
        if (id === "") return "";
        id = Number(id);
        const store = this.state.receivers.find(r => id === r.ID);
        if (store == undefined) return "";
        return store.Name;
    }

    newUser() {
        this.props.editUserRef.current.newUser()
    }
    editUser(user) {
        this.props.editUserRef.current.editUser(user)
    }

    deleteUserButton(user) {
        this.setState({
            ...this.state,
            deleteUser: {show: true, user},
        })
    }

    deleteUserClose() {
        this.setState({
            ...this.state,
            deleteUser: { show: false },
        })
    }

    deleteUserDelete() {
        fetch("/api/delete-user?user="+this.state.deleteUser.user.Name)
            .then(_ => {
                this.update()
                this.deleteUserClose()
            })
            .catch(err => this.props.notificationRef.current.notify("Impossibile cancellare l'utente:" + err))
    }

    render() {
        const searchInput = (name, classes) => <th key={name} className={classes ? classes : ""}>
            <span className="control has-icons-right">
                <input className="input is-small" name={"search-" + name} value={this.state.search[name] || ""} onChange={this.handleSearch} />
                <span className="icon is-small is-right">
                    <i className="mdi mdi-magnify"></i>
                </span>
            </span>
        </th>
        const userRegione = (user) => user.Region != null ? regioni[user.Region].Name : ""

        return <React.Fragment>
            <table className="table is-striped is-narrow is-hoverable is-fullwidth">
                <thead>
                    <tr>
                        <th>Utente</th>
                        <th>Ruolo</th>
                        <th>Regione</th>
                        <th>Rivenditore</th>
                        <th></th>
                    </tr>
                    <tr>
                        {searchInput('name')}
                        {searchInput('role')}
                        {searchInput('region')}
                        {searchInput('store')}
                        <td></td>
                    </tr>
                </thead>
                <tbody>
                    {
                        this.state.searchedUsers.slice(this.state.currentPage*100, (this.state.currentPage+1)*100).map(user =>
                            <tr key={user.Name}>
                                <td>{user.Name}</td>
                                <td>{userRoleString[user.Role]}</td>
                                <td>{userRegione(user)}</td>
                                <td>
                                    {user.Role == roleRivenditore &&
                                        this.storeName(user.CompanyID)}
                                    {user.Stores && this.storesToString(user)}
                                </td>
                                <td>
                                    {(user.Name != this.props.name) && <span>
                                        <span className="icon is-medium is-clickable" onClick={() => this.editUser(user)}>
                                            <span className="mdi mdi-pencil"></span>
                                        </span>
                                        <span className="icon is-medium is-clickable" onClick={() => this.deleteUserButton(user)}>
                                            <span className="mdi mdi-delete"></span>
                                        </span></span>
                                    }
                                </td>
                            </tr>
                        )
                    }
                </tbody>
            </table>

            <div className="container">
                <div className="field has-addons is-flex is-justify-content-center"> {/* Pagination */}
                    <p className="control">
                        <button className="button" disabled={this.state.currentPage <= 0}
                         onClick={() => {
                            this.setState({...this.state, currentPage: this.state.currentPage-1})
                            window.scroll(0, 0)
                         }}>
                            Pagina precedente
                            {/*<span className="icon is-small"><span className="mdi mdi-chevron-left align-center"></span></span>*/}
                        </button>
                    </p>
                    <p className="control">
                        <input
                            className="input"
                            type="number"
                            value={this.state.currentPage >= 0 ? this.state.currentPage +1 : ""}
                            onChange={ev => {
                                this.setState({
                                    ...this.state,
                                    currentPage: Number(ev.target.value)-1,
                                })
                            }
                        }></input>
                    </p>
                    <p className="control">
                        <button className="button" onClick={() => {
                            this.setState({...this.state, currentPage: this.state.currentPage+1})
                            window.scroll(0, 0)
                        }} disabled={this.state.searchedUsers.slice((this.currentPage+1)*100).length == 0}>
                            {/*<span className="icon is-small"><span className="mdi mdi-chevron-right align-center"></span></span>*/}
                            Pagina successiva
                        </button>
                    </p>
                </div>
            </div>

            {this.state.deleteUser.show &&
                <div className="modal is-active">
                    <div className="modal-background"></div>
                    <div className="modal-card">
                        <header className="modal-card-head">
                            <div className="modal-card-title">Sicuro di voler eliminare l'utente: {this.state.deleteUser.user.Name}??</div>
                        </header>

                        <div className="modal-card-body">
                            <p>
                                <b>Ruolo:</b> {userRoleString[this.state.deleteUser.user.Role]}
                            </p>
                            <p>
                                {this.state.deleteUser.user.Role != null &&
                                    <span><b>Regione:</b> {userRegione(this.state.deleteUser.user)}</span>
                                }
                            </p>
                        </div>
                        <div className="modal-card-foot">
                            <button className="button is-danger" onClick={this.deleteUserDelete}>Elimina</button>
                            <button className="button" onClick={this.deleteUserClose}>Annulla</button>
                        </div>
                    </div>
                </div>
            }
        </React.Fragment>
    }
}
