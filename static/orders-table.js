class OrdersTable extends React.Component {
    constructor(props) {
        super(props);

        this.state = { orders: [] };
        this.update = this.update.bind(this);
        this.orderInfo = this.orderInfo.bind(this);
        this.updateOrder = this.updateOrder.bind(this);
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

    render() {
        return <table className="table is-striped is-narrow is-hoverable is-fullwidth">
            <thead>
                <tr>
                    <th>Destinatario</th>
                    <th>Ordine</th>
                    <th>DDT</th>
                    <th>Protocollo</th>
                    <th>n° Colli</th>
                    <th>Assegno</th>
                    <th>Ultimo aggiornamento</th>
                    <th>Data aggiornamento</th>
                </tr>
            </thead>
            <tbody>
                {
                    this.state.orders.map(order =>
                        <tr key={order.Order}>
                            <td>{order.RecipientName}</td>
                            <td>{order.Order}</td>
                            <td>{order.DDT}</td>
                            <td>{order.Protocollo}</td>
                            <td>{order.NumPackages}</td>
                            <td><span className="icon is-medium"><span className={"mdi mdi-" + (order.WithdrawBankCheck ? 'check' : '')}></span></span></td>
                            <td>
                                <span className="icon"><span className={"mdi mdi-" + stateIcons[order.StateID]}></span></span>
                                {order.StateString}
                                <span className="icon is-medium" style={{ float: "right", marginRight: "0.5rem", cursor: "pointer" }} onClick={() => this.orderInfo(order)}>
                                    <span className="mdi mdi-information-outline"></span>
                                </span>
                                <span className="icon is-medium" style={{ float: "right", cursor: "pointer" }} onClick={() => this.updateOrder(order)}>
                                    <span className="mdi mdi-pencil"></span>
                                </span>
                            </td>
                            <td>{new Date(order.When).toLocaleDateString()}</td>
                        </tr>
                    )
                }
            </tbody>
        </table >
    }
}
