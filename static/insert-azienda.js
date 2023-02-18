class InsertAzienda extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            show: false,
            edit: null,

            Name: "",
            Role: "2",
            Address: "",
            PIVA: "",
            CodUnivoco: "",
            Comune: "",
            RegioneID: "0",
        };

        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
        this.openEdit = this.openEdit.bind(this);
        this.handleEditSubmit = this.handleEditSubmit.bind(this);
        this.close = this.close.bind(this);
    }

    addAzienda(name, callback) {
        this.setState({
            ...this.state,
            show: true,
            edit: null,
            onSuccess: callback,
            Name: name,

            Comune: "",
            Address: "",
            RegioneID: "1",
        })
    }

    handleChange(event) {
        const value = event.target.value;

        switch (event.target.name) {
            case "name":
                this.state.Name = value;
                break;
            case "role":
                this.state.Role = value;
                break;
            case "address":
                this.state.Address = value;
                break;
            case "piva":
                this.state.PIVA = value;
                break;
            case "codunivoco":
                this.state.CodUnivoco = value;
                break;
            case "comune":
                this.state.Comune = value;
                break;
            case "regione":
                this.state.RegioneID = String(value);
                break;
            case "editCompanyID":
                this.state.EditCompanyID = String(value);
                fetch("/api/info-for-company?id=" + String(value))
                    .then(r => r.json())
                    .then(r => this.setState({
                        ...this.state,
                        Name: r.Name,
                        Address: r.Address || "",
                        Comune: r.City || "",
                        RegioneID: r.RegionID,
                    }))
                    .catch(err => this.props.notificationRef.current.notify("Ricezione informazioni: " + err))
                break;
            default:
                alert("Errore");
                this.props.notificationRef.current.notify("Errore interno update insert azienda")

        }

        this.setState(this.state);
    }

    handleSubmit() {
        fetch("/api/new-azienda", {
            method: "POST",
            cache: "no-cache",
            body: JSON.stringify(this.state),
        })
            .then(resp => {
                if (!resp.ok) {
                    this.props.notificationRef.current.notify("Impossibile creare la nuova azienda")
                    console.error("Nuova azienda:" + resp)
                    return
                }
                this.props.onSuccess()
                this.close()
            })
            .catch(err => this.props.notificationRef.current.notify("Nuova azienda:" + err))
    }

    openEdit() {
        fetch("/api/avaible-receivers")
            .then(r => r.json())
            .then(r => this.setState({
                ...this.state,
                show: true,

                Name: "",
                Comune: "",
                Address: "",
                RegioneID: "1",
                edit: { companyID: 'X', receivers: r.Receivers },
            }))
            .catch(err => this.props.notificationRef.current.notify("Impossibile modificare le aziende: " + err))
    }

    handleEditSubmit() {
        fetch("/api/update-azienda", {
            method: "POST",
            cache: "no-cache",
            body: JSON.stringify(this.state),
        })
            .then(resp => {
                if (!resp.ok) {
                    this.props.notificationRef.current.notify("Impossibile modificare l'azienda")
                    console.error("Modifica azienda:" + resp)
                    return
                }

                this.close()
            })
            .catch(err => this.props.notificationRef.current.notify("Modifica azienda:" + err))
    }

    close() {
        this.setState({
            ...this.state,
            show: false,
            edit: null,
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
                    <div className="modal-card-title">{this.state.edit != null ? "Modifica" : "Aggiungi"} Azienda</div>
                </header>

                <div className="modal-card-body">
                    <form>
                        {this.state.edit != null &&
                            <div className="field is-horizontal">
                                <label htmlFor="editCompanyID" className="field-label label">Azienda da mofidicare:</label>
                                <div className="field-body control select">
                                    <select name="editCompanyID" value={this.state.edit.companyID} onChange={this.handleChange}>
                                        {this.state.edit.companyID == 'X' && <option value="X">--Seleziona l'azienda--</option>}
                                        {this.state.edit.receivers.map(r => <option value={r.ID} key={r.ID}>{r.Name}</option>)}
                                    </select>
                                </div>
                            </div>
                        }

                        <div className="field is-horizontal">
                            <label htmlFor="name" className="field-label label">Nome:</label>
                            <div className="field-body control">
                                <input name="name" className="input" value={this.state.Name} onChange={this.handleChange} />
                            </div>
                        </div>

                        {/*<div className="field is-horizontal">
                            <label htmlFor="role" className="field-label label">Ruolo:</label>
                            <div className="field-body control select">
                                <select name="role" value={this.state.Role} onChange={this.handleChange}>
                                    <option value="1">Produttore</option>
                                    <option value="2">Venditore</option>
                                </select>
                            </div>
                        </div>*/}

                        <div className="field is-horizontal">
                            <label htmlFor="address" className="field-label label">Indirizzo: </label>
                            <div className="field-body control">
                                <input name="address" className="input" value={this.state.Address} onChange={this.handleChange} />
                            </div>
                        </div>

                        <div className="field is-horizontal">
                            <label htmlFor="comune" className="field-label label">Comune: </label>
                            <div className="field-body control">
                                <input name="comune" className="input" value={this.state.Comune} onChange={this.handleChange} />
                            </div>
                        </div>

                        <div className="field is-horizontal">
                            <label htmlFor="regione" className="field-label label">Regione:</label>
                            <div className="field-body control select">
                                <select name="regione" value={this.state.RegioneID} onChange={this.handleChange}>
                                    {regioni.map(r => <option value={r.ID} key={r.ID}>{r.Name}</option>)}
                                </select>
                            </div>
                        </div>

                        {/*<div className="field is-horizontal">
                            <label htmlFor="piva" className="field-label label">P. IVA: </label>
                            <div className="field-body control">
                                <input name="piva" className="input" value={this.state.PIVA} onChange={this.handleChange} />
                            </div>
                        </div>
                        <div className="field is-horizontal">
                            <label htmlFor="codunivoco" className="field-label label">Codice Univoco: </label>
                            <div className="field-body control">
                                <input name="codunivoco" className="input" value={this.state.CodUnivoco} onChange={this.handleChange} />
                            </div>
                        </div> */}
                    </form>
                </div>
                <div className="modal-card-foot">
                    <button className="button is-primary" onClick={this.state.edit != null ? this.handleEditSubmit : this.handleSubmit}>{this.state.edit != null ? "Modifica" : "Aggiungi"}</button>
                    <button className="button" onClick={this.close}>Chiudi</button>
                </div>
            </div >
        </div >;
    }
}
