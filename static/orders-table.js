class OrdersTable extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            orders: [],
            updateArriveDate: { show: false },
            deleteOrder: { show: false },
        };
        this.update = this.update.bind(this);
        this.orderInfo = this.orderInfo.bind(this);
        this.updateOrder = this.updateOrder.bind(this);
        this.handleChange = this.handleChange.bind(this);
        this.updateArriveDateSubmit = this.updateArriveDateSubmit.bind(this);
        this.updateArriveDateClose = this.updateArriveDateClose.bind(this);
        this.deleteOrderButton = this.deleteOrderButton.bind(this);
        this.deleteOrderClose = this.deleteOrderClose.bind(this);
        this.deleteOrderDelete = this.deleteOrderDelete.bind(this);
        this.editOrder = this.editOrder.bind(this);
        this.update();
    }

    update() {
        fetch("/api/orders")
            .then(r => r.json())
            .then(r => this.setState({
                ...this.state,
                orders: r,
            }))
            .catch(err => this.props.notificationRef.current.notify("Tabella ordini:" + err))
    }

    orderInfo(order) {
        this.props.infoOrderRef.current.update(order);
    }

    updateOrder(order) {
        this.props.updateOrderRef.current.update(order);
    }

    updateArriveDate(order) {
        let startDate = order.Arrivedate
        if (new Date(order.ArriveDate).getFullYear() == 1970) {
            startDate = new Date().toISOString()
        }

        this.setState({
            ...this.state,
            updateArriveDate: {
                show: true,
                orderID: order.ID,
                order: order.Order,
                when: startDate,
            }
        })
    }

    handleChange(event) {
        const value = event.target.value;

        switch (event.target.name) {
            case "arrive-date":
                this.state.updateArriveDate.when = String(value);
                break;
            default:
                this.props.notificationRef.current.notify("Errore interno tabella ordini")
        }

        this.setState(this.state);
    }

    updateArriveDateSubmit() {
        const id = this.state.updateArriveDate.orderID;
        const newDate = new Date(this.state.updateArriveDate.when).toISOString();
        fetch(`/api/update-arrive-date?id=${id}&date=${newDate}`)
            .then(_ => this.update())
            .catch(err => this.props.notificationRef.current.notify("Stima arrivo:" + err))
        this.updateArriveDateClose();
        this.update();
    }

    updateArriveDateClose() {
        this.setState({
            ...this.state,
            updateArriveDate: { show: false },
        })
    }
    deleteOrderButton(order) {
        this.setState({
            ...this.state,
            deleteOrder: {
                show: true,
                orderID: order.ID,
                order: order
            },
        })
    }

    deleteOrderDelete() {
        const id = this.state.deleteOrder.orderID;
        fetch(`/api/delete-order?id=${id}`)
            .catch(err => this.props.notificationRef.current.notify("Errore durante la cancellazione:" + err))
        this.setState({
            ...this.state,
            deleteOrder: { show: false },
        })
        this.update()
    }

    deleteOrderClose() {
        this.setState({
            ...this.state,
            deleteOrder: { show: false },
        })
    }

    editOrder(order) {
        this.props.insertOrderRef.current.editOrder(order)
    }

    render() {
        return <React.Fragment>
            <table className="table is-striped is-narrow is-hoverable is-fullwidth">
                <thead>
                    <tr>
                        <th>Ordine</th>
                        <th>Data Ordine</th>
                        <th>Cliente</th>
                        <th>Regione</th>
                        <th>DDT</th>
                        <th>n° Colli</th>
                        <th>Assegno</th>
                        <th>Ultimo aggiornamento</th>
                        <th>Stima arrivo</th>
                        <th>Trasportatore</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {
                        this.state.orders.map(order =>
                            <tr key={order.ID}>
                                <td>{order.Order}</td>
                                <td>{new Date(order.ArriveDate).getFullYear() != 1970 ? new Date(order.CreationDate).toLocaleDateString() : ""}</td>
                                <td>{order.RecipientName}</td>
                                <td>{order.Region}</td>
                                <td>{order.DDT}</td>
                                <td>{order.NumPackages}</td>
                                <td><span className="icon is-medium"><span className={"mdi mdi-" + (order.WithdrawBankCheck ? 'check' : '')}></span></span></td>
                                <td>
                                    <span className="icon"><span className={"mdi mdi-" + stateIcons[order.StateID]}></span></span>
                                    {order.StateString}
                                    <span className="icon is-medium" style={{ float: "right", cursor: "pointer" }} onClick={() => this.updateOrder(order)}>
                                        <span className="mdi mdi-pencil"></span>
                                    </span>
                                </td>
                                <td>
                                    {new Date(order.ArriveDate).getFullYear() != 1970 ? new Date(order.ArriveDate).toLocaleDateString() : ""}
                                    <span className="icon is-medium" style={{ float: "right", cursor: "pointer" }} onClick={() => this.updateArriveDate(order)}>
                                        <span className="mdi mdi-pencil"></span>
                                    </span>
                                </td>
                                <td>{order.Carrier}</td>
                                <td>
                                    <span className="icon is-medium" style={{ cursor: "pointer" }} onClick={() => this.orderInfo(order)}>
                                        <span className="mdi mdi-information-outline"></span>
                                    </span>
                                    <span className="icon is-medium" style={{ cursor: "pointer" }} onClick={() => this.editOrder(order)}>
                                        <span className="mdi mdi-pencil"></span>
                                    </span>
                                    <span className="icon is-medium" style={{ cursor: "pointer" }} onClick={() => this.deleteOrderButton(order)}>
                                        <span className="mdi mdi-delete"></span>
                                    </span>
                                </td>
                            </tr>
                        )
                    }
                </tbody>
            </table>
            {this.state.updateArriveDate.show &&
                <div className="modal is-active">
                    <div className="modal-background"></div>
                    <div className="modal-card">
                        <header className="modal-card-head">
                            <div className="modal-card-title">Aggiorna Stima Arrivo Ordine: {this.state.updateArriveDate.order}</div>
                        </header>

                        <div className="modal-card-body">
                            <form>
                                <div className="field is-horizontal">
                                    <label htmlFor="arrive-date" className="field-label label">Data:</label>
                                    <div className="field-body control">
                                        <input name="arrive-date" className="input" type="date" value={this.state.updateArriveDate.when.substring(0, 10)} onChange={this.handleChange} />
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div className="modal-card-foot">
                            <button className="button is-primary" onClick={this.updateArriveDateSubmit}>Aggiorna</button>
                            <button className="button" onClick={this.updateArriveDateClose}>Chiudi</button>
                        </div>
                    </div>
                </div>
            }
            {this.state.deleteOrder.show &&
                <div className="modal is-active">
                    <div className="modal-background"></div>
                    <div className="modal-card">
                        <header className="modal-card-head">
                            <div className="modal-card-title">Sicuro di voler eliminare l'ordine: {this.state.deleteOrder.order.Order}??</div>
                        </header>

                        <div className="modal-card-body">
                            <p>
                                Ordine: <b>{this.state.deleteOrder.order.Order}</b>, DDT: <b>{this.state.deleteOrder.order.DDT}</b>
                            </p>
                            <p>
                                Per: <b>{this.state.deleteOrder.order.RecipientName}</b> ({this.state.deleteOrder.order.Region})
                            </p>
                        </div>
                        <div className="modal-card-foot">
                            <button className="button is-danger" onClick={this.deleteOrderDelete}>Elimina</button>
                            <button className="button" onClick={this.deleteOrderClose}>Annulla</button>
                        </div>
                    </div>
                </div>
            }
        </React.Fragment>
    }
}
