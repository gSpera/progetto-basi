class InsertAzienda extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
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
        this.close = this.close.bind(this);
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
            default:
                alert("Errore");
                this.props.notificationRef.current.notify("Errore interno update insert azienda")

        }

        this.setState(this.state);
    }

    handleSubmit() {
        if (this.state.DDT == "") {
            alert("Inserire un DDT valido")
            this.props.notificationRef.current.notify("Inserire un DDT valido")
            return
        }

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

    close() {
        hide_azienda_button();
    }

    render() {
        return <div className="modal is-active">
            <div className="modal-background"></div>
            <div className="modal-card">
                <header className="modal-card-head">
                    <div className="modal-card-title">Aggiungi Azienda</div>
                </header>

                <div className="modal-card-body">
                    <form onSubmit={this.handleSubmit}>
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
                            <label htmlFor="regione" className="field-label label">Ruolo:</label>
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
                    <button className="button is-primary" onClick={this.handleSubmit}>Aggiungi</button>
                    <button className="button" onClick={this.close}>Chiudi</button>
                </div>
            </div>
        </div>;
    }
}
