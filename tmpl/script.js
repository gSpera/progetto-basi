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
                            <td><span className="icon is-medium"><span className={"mdi mdi-" + (order.WithdrawBankCheck ? 'check' : '')}></span></span></td>
                            <td>
                                <span className="icon"><span className={"mdi mdi-" + stateIcons[order.StateID]}></span></span>
                                {order.StateString}
                            </td>
                            <td>{new Date(order.When).toLocaleDateString()}</td>
                        </tr>
                    )
                }
            </tbody>
        </table>
    }
}

let stateIcons = {
    0: "package-variant",
    1: "package-variant-closed",
    2: "package-variant-closed-check",
    3: "archive",
    4: "archive-clock",
    5: "dolly",
    6: "truck",
    7: "check",
}

const producerRole = 1
const receiverRole = 2

const ordersRoot = ReactDOM.createRoot(document.querySelector("#orders-root"))
ordersRoot.render(<OrdersTable />)

fetch("/api/me")
    .then(r => r.json())
    .then(r => {
        document.getElementById("azienda-nome").innerText = r.CompanyName
        document.getElementById("navbar-username").innerText = r.Username
        document.getElementById("navbar-company").innerText = r.CompanyName
        if (r.CompanyID < 0 || r.CompanyRole == producerRole) Array.from(document.getElementsByClassName("only-producer")).forEach(el => el.classList.remove("is-hidden"))
        if (r.CompanyID < 0 || r.CompanyRole == receiverRole) Array.from(document.getElementsByClassName("only-receiver")).forEach(el => el.classList.remove("is-hidden"))
    })
    .catch(err => console.error(err))

function add_order_button() {
    console.log("Order")
}