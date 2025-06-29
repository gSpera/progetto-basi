class ManageUsers extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            show: false,
            companies: [],
            users: [],

            username: "",
            password: "",
        };

        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);

        this.show = this.show.bind(this);
        this.close = this.close.bind(this);
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
            case "company":
                this.state.EditCompanyID = String(value);
                fetch("/api/users-for-company?id=" + String(value))
                    .then(r => r.json())
                    .then(r => this.setState({
                        ...this.state,
                        users: r,
                    }))
                    .catch(err => this.props.notificationRef.current.notify("Ottenimento utenti: " + err))
                break;
            default:
                alert("Errore");
                this.props.notificationRef.current.notify("Errore interno update gestisci utenze")

        }

        this.setState(this.state);
    }

    handleSubmit() {
        fetch("/api/new-user", {
            method: "POST",
            cache: "no-cache",
            body: JSON.stringify(this.state),
        })
            .then(resp => {
                if (!resp.ok) {
                    this.props.notificationRef.current.notify("Impossibile creare la nuova utenza")
                    console.error("Nuova utenza:" + resp)
                    return
                }
                this.props.onSuccess()
            })
            .catch(err => this.props.notificationRef.current.notify("Nuova utenza:" + err))
    }

    show() {
        fetch("/api/avaible-receivers")
            .then(r => r.json())
            .then(r => this.setState({
                ...this.state,
                show: true,
                companies: r.Receivers,
                users: [],
            }))
            .catch(err => this.props.notificationRef.current.notify("Impossibile aggiornare le aziende: " + err))
    }

    close() {
        this.setState({
            ...this.state,
            show: false,
            companies: [],
            users: [],
        })
    }

    render() {
        if (!this.state.show) {
            return <div></div>
        }

        const isEdit = false;

        return <div className="modal is-active">
            <div className="modal-background"></div>
            <div className="modal-card">
                <header className="modal-card-head">
                    <div className="modal-card-title">Gestisci utenze</div>
                </header>

                <div className="modal-card-body">
                    <div className="field is-horizontal">
                        <label htmlFor="company" className="field-label label">Azienda:</label>
                        <div className="field-body control select">
                            <select name="company" onChange={this.handleChange}>
                                <option value="X">--Seleziona l'utenza--</option>
                                {this.state.companies.map(r => <option value={r.ID} key={r.ID}>{r.Name}</option>)}
                            </select>
                        </div>
                    </div>

                    <hr />

                    {this.state.users.map(u => <div>
                        <div>
                            <b>{u.Name}</b>

                            <span class="icon is-small is-right">
                                <i class="mdi mdi-pencil"></i>
                            </span>
                        </div>
                    </div>)}

                    <hr />

                    <form>
                        <div className="field is-horizontal">
                            <label htmlFor="username" className="field-label label">Nome: </label>
                            <div className="field-body control">
                                <input name="name" className="input" value={this.state.username} onChange={this.handleChange} />
                            </div>
                        </div>
                        <div className="field is-horizontal">
                            <label htmlFor="password" className="field-label label">Password: </label>
                            <div className="field-body control">
                                <input name="password" className="input" value={this.state.password} onChange={this.handleChange} />
                            </div>
                        </div>

                        <button className="button" onClick={this.handleSubmit} disabled={this.state.username.length == 0 || this.state.password.length == 0}>{isEdit ? "Modifica" : "Aggiungi"}</button>
                    </form>
                </div>

                <div className="modal-card-foot">
                    <button className="button" onClick={this.close}>Chiudi</button>
                </div>
            </div>
        </div>;
    }
}
