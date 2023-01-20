class InsertOrder extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            show: false,
            validReceiver: true,
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
                CreationDate: new Date(),
                ArriveDate: new Date(),
                State: "0",
                Note: "",
            },
            edit: {
                arriveDateDirty: false,
                creationDateDirty: false,
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
        this.addNewAzienda = this.addNewAzienda.bind(this);

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

                const id = this.state.Receivers.filter(r => r.Name === String(value));
                this.state.validReceiver = id.length == 1
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
            case "creation-date":
                this.state.Selection.CreationDate = new Date(value);
                this.state.edit.creationDateDirty = false;
                break;
            case "arrive-date":
                this.state.Selection.ArriveDate = new Date(value);
                this.state.edit.arriveDateDirty = false;
                break;
            case "state":
                this.state.Selection.State = String(value);
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
            this.setState({
                ...this.state,
                validReceiver: false,
            })
            return false
        }
        if (id.length > 1) {
            this.props.notificationRef.current.notify("Errore con il destinatario, più destinatari con lo stesso nome")
            return false
        }

        if (this.state.Selection.NumColli == "") {
            this.props.notificationRef.current.notify("Inserire un numero di colli valido")
            return false
        }
        this.state.Selection.ReceiverID = String(id[0].ID)
        this.setState({
            ...this.state,
        })
        return true
    }

    handleSubmit() {
        if (!this.checkSelectedValues()) {
            return
        }

        let selection = { ... this.state.Selection } // Shallow copy
        selection.CreationDate = dateToRFC339Nano(selection.CreationDate)
        fetch("/api/new-order", {
            method: "POST",
            cache: "no-cache",
            body: JSON.stringify(selection),
        })
            .catch(err => this.props.notificationRef.current.notify("Nuovo ordine:" + err))
        this.close();
        this.props.orderTableRef.current.update();
    }

    handleEditSubmit() {
        if (!this.checkSelectedValues()) {
            return
        }

        let selection = { ...this.state.Selection } // Shallow copy
        selection.OrderID = this.state.edit.orderID
        selection.CreationDate = dateToRFC339Nano(selection.CreationDate)
        fetch("/api/edit-order", {
            method: "POST",
            cache: "no-cache",
            body: JSON.stringify(selection),
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
        }, () => {
            this.updateReceivers()
        })
    }

    close() {
        this.setState({
            ...this.state,
            show: false,
        })
    }

    editOrder(order) {
        let creationDateDirty = false
        let arriveDateDirty = false

        if (new Date(order.CreationDate).getFullYear() == 1970) {
            creationDateDirty = true
        }
        if (new Date(order.ArriveDate).getFullYear() == 1970) {
            arriveDateDirty = true
        }

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
            CreationDate: new Date(order.CreationDate),
            ArriveDate: new Date(order.ArriveDate),
            State: String(order.StateID),
            Note: "LOADING",
        }

        this.state.isEditing = true
        this.state.edit = {
            orderID: order.ID,
            order: order,
            creationDateDirty,
            arriveDateDirty,
        }
        this.state.validReceiver = true
        this.setState(this.state)

        const id = order.ID
        fetch(`/api/retrieve-note?id=${id}`)
            .then(r => r.text())
            .then(note => this.setState({
                ...this.state,
                show: true,
                Selection: {
                    ...this.state.Selection,
                    Note: note,
                },
            }))
    }

    addNewAzienda() {
        this.props.insertAziendaRef.current.addAzienda(this.state.Selection.ReceiverName, () => this.updateReceivers())
        this.setState({
            ...this.state,
            validReceiver: true, // Well this is fake
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
                    <div className="modal-card-title">{this.state.isEditing ? "Modifica Ordine" : "Aggiungi Ordine"}</div>
                </header>

                <div className="modal-card-body">
                    <form onSubmit={this.handleSubmit}>
                        {false && this.state.ShowSender &&
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
                            <label htmlFor="creation-date" className="field-label label">Data</label>
                            <div className="field-body control">
                                <input name="creation-date" className={"input " + (this.state.edit.creationDateDirty ? "is-warning" : "")} type="date" value={dateToISO8601(this.state.Selection.CreationDate.getFullYear() == 1970 ? new Date() : this.state.Selection.CreationDate)} onChange={this.handleChange} />
                            </div>
                        </div>
                        {
                            this.state.edit.creationDateDirty ?
                                <p>La data non verrà salvata</p>
                                : ""
                        }


                        <div className="field is-horizontal">
                            <label htmlFor="receiver" className="field-label label">Destinatario</label>
                            <div className="field-body control">
                                <input list="receiver-list" name="receiver" className={"input " + (this.state.validReceiver ? "" : "is-danger")} value={this.state.Selection.ReceiverName} onChange={this.handleChange} />
                                <datalist id="receiver-list">
                                    {this.state.Receivers.map(receiver =>
                                        <option value={receiver.Name} key={receiver.ID}>{receiver.Name}</option>)}
                                </datalist>

                                <button className={"button ml-1" + (this.state.validReceiver ? "" : "is-info is-light")} type="button" onClick={this.addNewAzienda} disabled={this.state.validReceiver}>
                                    <span className="icon">
                                        <i className="mdi mdi-plus"></i>
                                    </span>
                                </button>
                            </div>
                        </div>

                        <div className="field is-horizontal">
                            <label htmlFor="order" className="field-label label">Ordine</label>
                            <div className="field-body control">
                                <input name="order" className="input" value={this.state.Selection.Order} onChange={this.handleChange} />
                            </div>
                        </div>

                        <div className="field is-horizontal">
                            <label htmlFor="ddt" className="field-label label">DDT</label>
                            <div className="field-body control">
                                <input name="ddt" className="input" value={this.state.Selection.DDT} onChange={this.handleChange} />
                            </div>
                        </div>

                        <div className="field is-horizontal">
                            <label htmlFor="num-colli" className="field-label label">Numero Colli</label>
                            <div className="field-body control">
                                <input name="num-colli" className="input" type="number" value={this.state.Selection.NumColli} onChange={this.handleChange} />
                            </div>
                        </div>

                        <div className="field is-horizontal">
                            <label htmlFor="state" className="field-label label">Stato</label>
                            <div className="field-body control select">
                                <select name="state" value={this.state.Selection.State} onChange={this.handleChange}>
                                    {states.map(s => <option value={s.ID} key={s.ID}>{s.Name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="field is-horizontal">
                            <label htmlFor="arrive-date" className="field-label label">Stima arrivo:</label>
                            <div className="field-body control">
                                <input name="arrive-date" className={"input " + (this.state.edit.arriveDateDirty ? "is-warning" : "")} type="date" value={dateToISO8601(this.state.Selection.ArriveDate.getFullYear() == 1970 ? new Date() : this.state.Selection.ArriveDate)} onChange={this.handleChange} />
                            </div>
                        </div>
                        {
                            this.state.edit.arriveDateDirty ?
                                <p>La data non verrà salvata</p>
                                : ""
                        }

                        <hr></hr>

                        {/* <div className="field is-horizontal">
                            <label htmlFor="protocollo" className="field-label label">Protocollo</label>
                            <div className="field-body control">
                                <input name="protocollo" className="input" value={this.state.Selection.Protocollo} onChange={this.handleChange} />
                            </div>
                        </div> */}


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
            </div >
        </div >;
    }
}
