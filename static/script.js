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

class InsertOrder extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            ShowSender: false,
            Receivers: [],
            Selection: {
                Sender: "0",
                Receiver: "0",
                DDT: "",
                NumColli: 1,
                Assegno: false,
            },
        };

        fetch("/api/avaible-receivers")
            .then(r => r.json())
            .then(r => this.setState(r));

        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
        this.close = this.close.bind(this);
    }

    handleChange(event) {
        const value = event.target.value;

        switch (event.target.name) {
            case "sender":
                this.state.Selection.Sender = value;
                break;
            case "receiver":
                this.state.Selection.Receiver = value;
                break;
            case "ddt":
                this.state.Selection.DDT = value;
                break;
            case "num-colli":
                this.state.Selection.NumColli = value;
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
        if (this.state.Selection.DDT == "") {
            alert("Inserire un DDT valido")
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

const ordersTableRef = React.createRef();

const ordersRoot = ReactDOM.createRoot(document.querySelector("#orders-root"))
ordersRoot.render(<OrdersTable ref={ordersTableRef} />)

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

const insert_order = document.querySelector("#insert-order-root")
insert_order.style.display = 'none'
ReactDOM.createRoot(insert_order).render(<InsertOrder orderTableRef={ordersTableRef} />)
function add_order_button() {
    insert_order.style.display = 'block'
}

function hide_order_button() {
    insert_order.style.display = 'none'
}


