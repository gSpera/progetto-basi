class InsertOrder extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            show: false,
            ShowSender: false,
            Receivers: [],
            Selection: {
                Sender: "" + this.props.sender,
                ReceiverID: "0",
                ReceiverName: "",
                DDT: "",
                Order: "",
                Protocollo: "",
                NumColli: "1",
                Assegno: false,
                Note: "",
            },
        };

        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
        this.handleEditSubmit = this.handleEditSubmit.bind(this);
        this.updateReceivers = this.updateReceivers.bind(this);
        this.editOrder = this.editOrder.bind(this);
        this.show = this.show.bind(this);
        this.close = this.close.bind(this);
        this.checkSelectedValues = this.checkSelectedValues.bind(this);

        this.updateReceivers();
    }

    updateReceivers() {
        fetch("/api/avaible-receivers")
            .then(r => r.json())
            .then(r => this.setState(r))
            .catch(err => this.props.notificationRef.current.notify("Nuovo ordine:" + err))

    }

    handleChange(event) {
        const value = event.target.value;

        switch (event.target.name) {
            case "sender":
                this.state.Selection.Sender = String(value);
                break;
            case "receiver":
                this.state.Selection.ReceiverName = String(value);
                break;
            case "ddt":
                this.state.Selection.DDT = value;
                break;
            case "order":
                this.state.Selection.Order = value;
                break;
            case "protocollo":
                this.state.Selection.Protocollo = value;
                break;
            case "num-colli":
                this.state.Selection.NumColli = String(value);
                break;
            case "assegno":
                this.state.Selection.Assegno = event.target.checked;
                break;
            case "note":
                this.state.Selection.Note = value;
                break;
            case "carrier":
                this.state.Selection.Carrier = value;
                break;
            default:
                this.props.notificationRef.current.notify("Errore interno update nuovo ordine")
        }

        this.setState(this.state);
    }

    checkSelectedValues() {
        if (this.state.Selection.Order == "") {
            this.props.notificationRef.current.notify("Inserire un ordine valido")
            return false
        }

        const name = this.state.Selection.ReceiverName;
        const id = this.state.Receivers.filter(r => r.Name === this.state.Selection.ReceiverName);
        if (id.length == 0) {
            this.props.notificationRef.current.notify("Inserire un destinatario valido")
            return false
        }
        if (id.length > 1) {
            this.props.notificationRef.current.notify("Errore con il destinatario, più destinatari con lo stesso nome")
            return false
        }
        this.state.Selection.ReceiverID = String(id[0].ID)
        return true
    }

    handleSubmit() {
        if (!this.checkSelectedValues()) {
            return
        }

        fetch("/api/new-order", {
            method: "POST",
            cache: "no-cache",
            body: JSON.stringify(this.state.Selection),
        })
            .catch(err => this.props.notificationRef.current.notify("Nuovo ordine:" + err))
        this.close();
        this.props.orderTableRef.current.update();
    }

    handleEditSubmit() {
        if (!this.checkSelectedValues()) {
            return
        }

        fetch("/api/edit-order", {
            method: "POST",
            cache: "no-cache",
            body: JSON.stringify({
                ...this.state.Selection,
                OrderID: this.state.edit.orderID,
            }),
        })
            .catch(err => this.props.notificationRef.current.notify("Modifica ordine:" + err))
        this.close()
        this.props.orderTableRef.current.update()
    }

    show() {
        this.setState({
            ...this.state,
            isEditing: false,
            show: true,
        })
    }

    close() {
        this.setState({
            ...this.state,
            show: false,
        })
    }

    editOrder(order) {
        this.state.Selection = {
            Sender: String(order.ProducerID),
            ReceiverID: String(order.RecipientID),
            ReceiverName: order.RecipientName,
            DDT: order.DDT,
            Order: order.Order,
            Protocollo: order.Protocollo,
            NumColli: String(order.NumPackages),
            Assegno: order.WithdrawBankCheck,
            Carrier: order.Carrier,
            Note: "LOADING",
        }

        this.state.isEditing = true
        this.state.edit = {
            orderID: order.ID,
            order: order,
        }
        this.setState(this.state)

        const id = order.ID
        fetch(`/api/retrieve-note?id=${id}`)
            .then(r => r.text())
            .then(note => this.setState({
                show: true,
                Selection: {
                    Note: note,
                },
            }))
    }

    render() {
        if (!this.state.show) {
            return <div></div>
        }

        return <div className="modal is-active">
            <div className="modal-background"></div>
            <div className="modal-card">
                <header className="modal-card-head">
                    <div className="modal-card-title">{this.state.isEditing ? "Modifica Ordine" : "Aggiungi Ordine"}</div>
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
                                { /* <div className="select">
                                    <select name="receiver" value={this.state.Selection.Receiver} onChange={this.handleChange}>
                                        {this.state.Receivers.map(receiver => <option value={receiver.ID} key={receiver.ID}>{receiver.Name}</option>)}
                                    </select>
                                </div> */ }
                                <input list="receiver-list" name="receiver" className="input" value={this.state.Selection.ReceiverName} onChange={this.handleChange} />
                                <datalist id="receiver-list">
                                    {this.state.Receivers.map(receiver =>
                                        <option value={receiver.Name} key={receiver.ID}>{receiver.Name}</option>)}
                                </datalist>
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
                                <input name="assegno" type="checkbox" value={this.state.Selection.Assegno} onChange={this.handleChange} />
                            </div>
                        </div>

                        <div className="field is-horizontal">
                            <label htmlFor="carrier" className="field-label label">Trasportatore</label>
                            <div className="field-body control">
                                <input name="carrier" className="input" value={this.state.Selection.Carrier} onChange={this.handleChange} />
                            </div>
                        </div>

                        <div className="field is-horizontal">
                            <label htmlFor="note" className="field-label label">Note</label>
                            <div className="field-body control">
                                <textarea name="note" className="textarea" value={this.state.Selection.Note} onChange={this.handleChange}></textarea>
                            </div>
                        </div>
                    </form>
                </div>
                <div className="modal-card-foot">
                    {
                        this.state.isEditing ?
                            <button className="button is-primary" onClick={this.handleEditSubmit}>Modifica</button>
                            :
                            <button className="button is-primary" onClick={this.handleSubmit}>Aggiungi</button>
                    }
                    <button className="button" onClick={this.close}>Chiudi</button>
                </div>
            </div>
        </div>;
    }
}
