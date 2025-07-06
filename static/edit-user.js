class EditUser extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            show: false,
            edit: false,
            receivers: [],

            username: "",
            password: "",
            role: "X",
            region: 0,
            storeInput: "",
            storeID: undefined,
            storeZonaInput: "",
            storeZonaID: undefined,
            stores: [],
        };

        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
        this.loadReceivers = this.loadReceivers.bind(this);
        this.storeName = this.storeName.bind(this);
        this.findStore = this.findStore.bind(this);
        this.zonaAddStore = this.zonaAddStore.bind(this);

        this.newUser = this.newUser.bind(this);
        this.editUser = this.editUser.bind(this);
        this.close = this.close.bind(this);

        this.loadReceivers();
    }

    handleChange(event) {
        const value = event.target.value;

        switch (event.target.name) {
            case "name":
                this.state.username = value;
                break;
            case "password":
                this.state.password = value;
                break;
            case "role":
                this.state.role = value;
                break;
            case "region":
                this.state.region = value;
                break;
            case "store":
                this.state.storeInput = value;
                this.state.stores = [this.findStore(value)];
                break;
            case "store-zona":
                this.state.storeZonaInput = value;
                this.state.storeZonaID = this.findStore(value);
                break;
            default:
                alert("Errore");
                this.props.notificationRef.current.notify("Errore interno update gestisci utenze")

        }

        this.setState(this.state, this.validate);
    }

    handleSubmit() {
        fetch("/api/edit-or-create-user", {
            method: "POST",
            cache: "no-cache",
            body: JSON.stringify({
                username: this.state.username.trim(),
                password: this.state.password.trim(),
                role: String(this.state.role),
                region: this.state.region == "X" ? "-1" : String(this.state.region),
                stores: this.state.stores,
            }),
        })
            .then(resp => {
                if (!resp.ok) {
                    this.props.notificationRef.current.notify("Impossibile modificare o aggiungere la nuova utenza")
                    console.error("Modifica o nuova utenza:" + resp)
                    return
                }
                this.props.onSuccess()
                this.close()
            })
            .catch(err => this.props.notificationRef.current.notify("Errore in modifica o aggiunta utenza:" + err))
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
    findStore(name) {
        const store = this.state.receivers.find(r => name === r.Name.trim())
        if (store == undefined) return undefined;
        return store.ID;
    }

    newUser() {
        this.setState({
            ...this.state,
            show: true,
            edit: false,

            username: "",
            password: "",
            role: "X",
            region: "X",
            storeInput: "",
            storeZonaInput: "",
            storeZonaID: undefined,
            stores: [],
        })
    }
    editUser(user) {
        this.setState({
            ...this.state,
            show: true,
            edit: true,

            username: user.Name,
            password: "",
            role: user.Role,
            region: user.Region,
            storeInput: this.storeName(user.CompanyID),
            storeID: user.CompanyID,
            storeZonaInput: "",
            storeZonaID: undefined,
            stores: [],
        }, this.validate)
    }

    close() {
        this.setState({
            ...this.state,
            show: false,
        })
    }

    validate() {
        this.state.usernameValid = true
        this.state.passwordValid = true
        this.state.storeValid = true
        this.state.storeZonaValid = true
        this.state.isValid = true

        if (this.state.username.trim().length < 2) {
            this.state.usernameValid = false
            this.state.isValid = false
        }

        // If edit password could be empty
        if (!(this.state.edit && this.state.password.trim().length == 0) && this.state.password.trim().length < 8) {
            this.state.passwordValid = false
            this.state.isValid = false
        }

        if (this.state.role == roleRivenditore && this.findStore(this.state.storeInput) == undefined) {
            this.state.storeValid = false
            this.state.isValid = false
        }

        if (this.state.role == roleZona && this.findStore(this.state.storeZonaInput) == undefined) {
            this.state.storeZonaValid = false
            this.state.isValid = false
        }

        this.setState(this.state)
    }

    zonaAddStore(event) {
        event.preventDefault()
        const storeID = this.state.storeZonaID
        if (storeID == undefined) {
            this.props.notificationRef.current.notify("Rivenditore non trovato")
            return;
        }

        if (this.state.stores.indexOf(storeID) != -1) {
            this.props.notificationRef.current.notify("Rivenditore già inserito")
            return
        }

        let storesWithName = [
            {id: storeID, name: this.storeName(storeID)},
            ...this.state.stores.map(s => ({id: s, name: this.storeName(s)}))
        ]
        storesWithName.sort((a, b) => a.name < b.name ? -1 : 1)
        let stores = storesWithName.map(s => s.id)

        this.setState({
            ...this.state,
            storeZonaInput: "",
            stores,
        })
    }

    render() {
        if (!this.state.show) {
            return <div></div>
        }
        const errorBorder = (valid) => (!valid) ? " is-danger" : ""

        return <div className="modal is-active">
            <div className="modal-background"></div>
            <div className="modal-card">
                <header className="modal-card-head">
                    <div className="modal-card-title">{this.state.edit ? "Modifica" : "Aggiungi"} utente</div>
                </header>

                <div className="modal-card-body">
                    <form>
                        <div className="field is-horizontal">
                            <label htmlFor="username" className="field-label label">Nome:</label>
                            <div className="field-body control">
                                <input name="name" className={"input" + errorBorder(this.state.usernameValid)} value={this.state.username} disabled={this.state.edit} minLength={2} onChange={this.handleChange} />
                            </div>
                        </div>
                        <div className="field is-horizontal">
                            <label htmlFor="password" className="field-label label">Password:</label>
                            <div className="field-body control">
                                <input name="password" type="password" className={"input" + errorBorder(this.state.passwordValid)} value={this.state.password} minLength={this.edit ? 8 : null} placeholder={this.state.edit ? "Invariata" : "Richiesta"} onChange={this.handleChange} />
                            </div>
                        </div>
                        <div className="field is-horizontal">
                            <label htmlFor="role" className="field-label label">Impiego: </label>
                            <div className="field-body control select">
                                <select name="role" value={this.state.role} onChange={this.handleChange}>
                                    <option value="X">-- Selectiona un impiego --</option>
                                    <option value="5">Rivenditore</option>
                                    <option value="3">Agente di regione</option>
                                    <option value="4">Agente di zona</option>
                                </select>
                            </div>
                        </div>

                        {this.state.role == roleRivenditore &&
                            <div className="field is-horizontal">
                                <label htmlFor="store" className="field-label label">Negozio: </label>
                                <div className="field-body control">
                                    <input name="store" className={"input" + errorBorder(this.state.storeValid)} value={this.state.storeInput} list="edit-user-store" onChange={this.handleChange}/>

                                    <datalist id="edit-user-store">
                                        {this.state.receivers.map(r => <option label={r.Name} key={r.ID}>{r.Name}</option>)}
                                    </datalist>
                                </div>
                            </div>
                        }
                        {this.state.role == roleRegione &&
                            <div className="field is-horizontal">
                                <label htmlFor="region" className="field-label label">Regione: </label>
                                <div className="field-body control select">
                                    <select name="region" value={this.state.region ? this.state.region : 0} onChange={this.handleChange}>
                                        <option value="X">-- Seleziona una regione --</option>
                                        {regioni.map(r => <option value={r.ID} key={r.ID}>{r.Name}</option>)}
                                    </select>
                                </div>
                            </div>
                        }
                        {this.state.role == roleZona &&
                            <React.Fragment>
                            <div className="field is-horizontal">
                                <label htmlFor="store-zona" className="field-label label">Aggiungi negozio: </label>
                                <div className="field-body control">
                                    <input name="store-zona" className={"input" + errorBorder(this.state.storeZonaValid)} value={this.state.storeZonaInput} list="edit-user-store-zona" onChange={this.handleChange}/>

                                    <datalist id="edit-user-store-zona">
                                        {this.state.receivers.map(r => <option label={r.Name} key={r.ID}>{r.Name}</option>)}
                                    </datalist>
                                </div>
                                <button type="button" className="button is-success is-light ml-2" onClick={this.zonaAddStore}>
                                    <span className="icon is-small is-right">
                                        <i className="mdi mdi-plus"></i>
                                    </span>
                                </button>
                            </div>

                            {this.state.stores.length == 0 ?
                                <span>Nessun rivenditore selezionato</span>
                            :
                                <React.Fragment>
                                    <hr />
                                    <b>Rivenditori:</b>
                                    <ul>
                                        {this.state.stores.map(r => <li key={r}>{this.storeName(r)}</li>)}
                                    </ul>
                                </React.Fragment>
                            }
                            </React.Fragment>
                        }
                    </form>
                </div>

                <div className="modal-card-foot">
                    <button className="button is-success" onClick={this.handleSubmit} disabled={!this.state.isValid}>{this.state.edit ? "Modifica" : "Aggiungi"}</button>
                    <button className="button" onClick={this.close}>Chiudi</button>
                </div>
            </div>
        </div>;
    }
}
