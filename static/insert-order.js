class InsertOrder extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            ShowSender: false,
            Receivers: [],
            Selection: {
                Sender: "" + this.props.sender,
                Receiver: "0",
                DDT: "",
                Order: "",
                Protocollo: "",
                NumColli: "1",
                Assegno: false,
            },
        };

        fetch("/api/avaible-receivers")
            .then(r => r.json())
            .then(r => this.setState(r))

        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
        this.close = this.close.bind(this);
    }

    handleChange(event) {
        const value = event.target.value;

        switch (event.target.name) {
            case "sender":
                this.state.Selection.Sender = String(value);
                break;
            case "receiver":
                this.state.Selection.Receiver = String(value);
                break;
            case "ddt":
                this.state.Selection.DDT = value;
                break;
            case "order":
                this.state.Selection.Order = value;
            case "protocollo":
                this.state.Selection.Protocollo = value;
            case "num-colli":
                this.state.Selection.NumColli = String(value);
                break;
            case "assegno":
                this.state.Selection.Assegno = value;
                break;
            default:
                alert("Errore");
        }

        this.setState(this.state);
    }

    handleSubmit() {
        if (this.state.Selection.order == "") {
            alert("Inserire un ordine valido")
            return
        }

        fetch("/api/new-order", {
            method: "POST",
            cache: "no-cache",
            body: JSON.stringify(this.state.Selection),
        })
        this.close();
        this.props.orderTableRef.current.update();
    }

    close() {
        hide_order_button();
    }

    render() {
        return <div className="modal is-active">
            <div className="modal-background"></div>
            <div className="modal-card">
                <header className="modal-card-head">
                    <div className="modal-card-title">Aggiungi Ordine</div>
                </header>

                <div className="modal-card-body">
                    <form onSubmit={this.handleSubmit}>
                        {this.state.ShowSender &&
                            <div className="field is-horizontal">
                                <label htmlFor="sender" className="field-label label">Mittente</label>
                                <div className="field-body control">
                                    <div className="select">
                                        <select name="sender" value={this.state.Selection.Sender} onChange={this.handleChange}>
                                            {this.state.Receivers.map(sender => <option value={sender.ID} key={sender.ID}>{sender.Name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        }

                        <div className="field is-horizontal">
                            <label htmlFor="receiver" className="field-label label">Destinatario</label>
                            <div className="field-body control">
                                <div className="select">
                                    <select name="receiver" value={this.state.Selection.Receiver} onChange={this.handleChange}>
                                        {this.state.Receivers.map(receiver => <option value={receiver.ID} key={receiver.ID}>{receiver.Name}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="field is-horizontal">
                            <label htmlFor="ddt" className="field-label label">DDT</label>
                            <div className="field-body control">
                                <input name="ddt" className="input" value={this.state.Selection.DDT} onChange={this.handleChange} />
                            </div>
                        </div>

                        <div className="field is-horizontal">
                            <label htmlFor="order" className="field-label label">Ordine</label>
                            <div className="field-body control">
                                <input name="order" className="input" value={this.state.Selection.Order} onChange={this.handleChange} />
                            </div>
                        </div>

                        <div className="field is-horizontal">
                            <label htmlFor="protocollo" className="field-label label">Protocollo</label>
                            <div className="field-body control">
                                <input name="protocollo" className="input" value={this.state.Selection.Protocollo} onChange={this.handleChange} />
                            </div>
                        </div>


                        <div className="field is-horizontal">
                            <label htmlFor="num-colli" className="field-label label">Numero Colli</label>
                            <div className="field-body control">
                                <input name="num-colli" className="input" type="number" value={this.state.Selection.NumColli} onChange={this.handleChange} />
                            </div>
                        </div>

                        <div className="field is-horizontal">
                            <label htmlFor="assegno" className="field-label label checkbox">Ritirare Assegno</label>
                            <div className="field-body control">
                                <input name="assegno" type="checkbox" value={this.state.Selection.Assegno} onChange={this.onChange} />
                            </div>
                        </div>
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
