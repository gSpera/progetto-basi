class OrdersTable extends React.Component {
    constructor(props) {
        super(props);

        this.state = { orders: [] };
        this.update = this.update.bind(this);
        this.update();
    }

    update() {
        fetch("/api/orders")
            .then(r => r.json())
            .then(r => this.setState({
                ...this.state,
                orders: r,
            }))
            .catch(err => console.error(err))
    }

    render() {
        return <table className="table is-striped is-narrow is-hoverable is-fullwidth">
            <thead>
                <tr>
                    <th>DDT</th>
                    <th>Produttore</th>
                    <th>Destinatario</th>
                    <th>n° Colli</th>
                    <th>Assegno</th>
                    <th>Ultimo aggiornamento</th>
                    <th>Data aggiornamento</th>
                </tr>
            </thead>
            <tbody>
                {
                    this.state.orders.map(order =>
                        <tr key={order.DDT}>
                            <td>{order.DDT}</td>
                            <td>{order.ProducerName}</td>
                            <td>{order.RecipientName}</td>
                            <td>{order.NumPackages}</td>
                            <td>{order.WithdrawBankCheck ? 'Sì' : 'No'}</td>
                            <td>{order.StateString}</td>
                            <td>{new Date(order.When).toLocaleDateString()}</td>
                        </tr>
                    )
                }
            </tbody>
        </table>
    }
}

const ordersRoot = ReactDOM.createRoot(document.querySelector("#orders-root"))
ordersRoot.render(<OrdersTable />)

fetch("/api/me")
    .then(r => r.json())
    .then(r => {
        document.getElementById("azienda-nome").innerText = r.azienda
    })
    .catch(err => console.error(err))