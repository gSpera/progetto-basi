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
            stores: [],
        };

        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
        this.loadReceivers = this.loadReceivers.bind(this);
        this.storeName = this.storeName.bind(this);
        this.findStore = this.findStore.bind(this);

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
                this.state.store = [this.findStore(value)];
                break;
            default:
                alert("Errore");
                this.props.notificationRef.current.notify("Errore interno update gestisci utenze")

        }

        this.setState(this.state);
    }

    handleSubmit() {
        fetch("/api/edit-or-create-user", {
            method: "POST",
            cache: "no-cache",
            body: JSON.stringify(this.state),
        })
            .then(resp => {
                if (!resp.ok) {
                    this.props.notificationRef.current.notify("Impossibile modificare o aggiungere la nuova utenza")
                    console.error("Modifica o nuova utenza:" + resp)
                    return
                }
                this.props.onSuccess()
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
        const store = this.state.receivers.find(r => name === r.Name)
        if (store == undefined) return undefined;
        return store.ID;
    }

    newUser() {
        this.setState({
            ...this.state,
            show: true,
            edit: false,
            receivers: [],

            username: "",
            password: "",
            role: "X",
            region: 0,
            storeInput: "",
            stores: [],
        })
    }
    editUser(user) {
        this.setState({
            ...this.state,
            show: true,
            edit: true,

            username: user.Name,
            password: "XXX",
            role: user.Role,
            region: user.Region,
            storeInput: this.storeName(user.CompanyID),
            store: user.CompanyID,
            stores: [],
        })
    }

    close() {
        this.setState({
            ...this.state,
            show: false,
        })
    }

    render() {
        if (!this.state.show) {
            return <div></div>
        }

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
                                <input name="name" className="input" value={this.state.username} disabled={this.state.edit} onChange={this.handleChange} />
                            </div>
                        </div>
                        <div className="field is-horizontal">
                            <label htmlFor="password" className="field-label label">Password:</label>
                            <div className="field-body control">
                                <input name="password" type="password" className="input" value={this.state.password} onChange={this.handleChange} />
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
                                    <input name="store" className="input" value={this.state.storeInput} list="edit-user-store" onChange={this.handleChange}/>

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
                                        {regioni.map(r => <option value={r.ID} key={r.ID}>{r.Name}</option>)}
                                    </select>
                                </div>
                            </div>
                        }

                    </form>
                </div>

                <div className="modal-card-foot">
                    <button className="button is-success" onClick={this.handleSubmit} disabled={this.state.username.length == 0 || this.state.password.length == 0 || this.state.role == "X"}>{this.state.edit ? "Modifica" : "Aggiungi"}</button>
                    <button className="button" onClick={this.close}>Chiudi</button>
                </div>
            </div>
        </div>;
    }
}
