class OrdersTable extends React.Component {
    constructor(props) {
        super(props);

        this.state = { orders: [] };
        this.update = this.update.bind(this);
        this.orderInfo = this.orderInfo.bind(this);
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

    orderInfo(order) {
        this.props.infoOrderRef.current.update(order);
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
                                <span className="icon is-medium" style={{ float: "right", marginRight: "1rem" }} onClick={() => this.orderInfo(order)}>
                                    <span className="mdi mdi-information-outline"></span>
                                </span>
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
                Sender: this.props.sender,
                Receiver: "0",
                DDT: "",
                NumColli: 1,
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

class InsertAzienda extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            Name: "",
            Role: "0",
            Address: "",
            PIVA: "",
            CodUnivoco: "",
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
            default:
                alert("Errore");
        }

        this.setState(this.state);
    }

    handleSubmit() {
        if (this.state.DDT == "") {
            alert("Inserire un DDT valido")
            return
        }

        fetch("/api/new-azienda", {
            method: "POST",
            cache: "no-cache",
            body: JSON.stringify(this.state.Selection),
        })
        this.close();
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

                        <div className="field is-horizontal">
                            <label htmlFor="role" className="field-label label">Ruolo:</label>
                            <div className="field-body control select">
                                <select name="role" value={this.state.Role} onChange={this.handleChange}>
                                    <option value="1">Produttore</option>
                                    <option value="2">Venditore</option>
                                </select>
                            </div>
                        </div>

                        <div className="field is-horizontal">
                            <label htmlFor="address" className="field-label label">Indirizzo: </label>
                            <div className="field-body control">
                                <input name="address" className="input" value={this.state.Address} onChange={this.handleChange} />
                            </div>
                        </div>

                        <div className="field is-horizontal">
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

class InfoOrder extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            visible: false,
        };

        this.update = this.update.bind(this);
        this.close = this.close.bind(this);
    }

    update(order) {
        fetch("/api/info-order?id=" + order.ID)
            .then(r => r.json())
            .then(r => this.setState({
                visible: true,
                order,
                r,
            }))
    }

    showUpdate(update) {
        if (update.State) {
            return <div>
                <div>Il: {new Date(update.When).toLocaleDateString()} l'ordine è
                    <span className="icon"><span className={"mdi mdi-" + stateIcons[update.StateID]}></span></span>
                    <b>{update.State}</b>
                </div>
            </div>
        }

        return <div>
            <div>Il {new Date(update.StartDate).toLocaleDateString()} - {new Date(update.EndDate).toLocaleDateString()}</div>
            <div>Viaggio da <b>{update.Partenza}</b> a <b>{update.Destinazione}</b></div>
            <div>Con motrice: <b>{update.Motrice}</b></div>
        </div>
    }

    close() {
        this.setState({ visible: false });
    }

    render() {
        if (!this.state.visible) {
            return <div></div>;
        }

        if (!this.state.order) {
            return <div>NO ORDER</div>;
        }

        return <div className="modal is-active">
            <div className="modal-background"></div>
            <div className="modal-card">
                <header className="modal-card-head">
                    <div className="modal-card-title">Info Ordine: {this.state.order.DDT}</div>
                </header>

                <div className="modal-card-body">
                    <div><b>Mittente: </b>{this.state.order.ProducerName}</div>
                    <div><b>Destinatario: </b>{this.state.order.RecipientName}</div>

                    <h2>Aggiornamenti:</h2>
                    {
                        [].concat(this.state.r.States, this.state.r.Viaggi)
                            .sort((a, b) => {
                                const aTime = new Date(a.When || a.EndDate);
                                const bTime = new Date(b.When || b.EndDate);
                                return bTime - aTime;
                            })
                            .map((update, i) =>
                                <div key={"update-" + i}>
                                    {i > 0 ? <hr></hr> : ''}
                                    {
                                        this.showUpdate(update)
                                    }
                                </div>
                            )
                    }
                </div>

                <div className="modal-card-foot">
                    <button className="button" onClick={this.close}>Chiudi</button>
                </div>
            </div>
        </div >;
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
const infoOrderRef = React.createRef();

const info_order = document.querySelector("#info-order-root")
ReactDOM.createRoot(info_order).render(<InfoOrder ref={infoOrderRef} />)

const ordersRoot = ReactDOM.createRoot(document.querySelector("#orders-root"))
ordersRoot.render(<OrdersTable ref={ordersTableRef} infoOrderRef={infoOrderRef} />)

fetch("/api/me")
    .then(r => r.json())
    .then(r => {
        document.getElementById("azienda-nome").innerText = r.CompanyName
        document.getElementById("navbar-username").innerText = r.Username
        document.getElementById("navbar-company").innerText = r.CompanyName
        if (r.CompanyID < 0 || r.CompanyRole == producerRole) Array.from(document.getElementsByClassName("only-producer")).forEach(el => el.classList.remove("is-hidden"))
        if (r.CompanyID < 0 || r.CompanyRole == receiverRole) Array.from(document.getElementsByClassName("only-receiver")).forEach(el => el.classList.remove("is-hidden"))
        if (r.CompanyID < 0) Array.from(document.getElementsByClassName("only-admin")).forEach(el => el.classList.remove("is-hidden"))

        ReactDOM.createRoot(insert_order).render(<InsertOrder sender={Math.max(r.CompanyID, 0)} orderTableRef={ordersTableRef} />)
    })
    .catch(err => console.error(err))

const insert_order = document.querySelector("#insert-order-root")
const insert_azienda = document.querySelector("#insert-azienda-root")
ReactDOM.createRoot(insert_azienda).render(<InsertAzienda />)

insert_order.style.display = 'none'
insert_azienda.style.display = 'none'

function add_order_button() {
    insert_order.style.display = 'block'
}

function hide_order_button() {
    insert_order.style.display = 'none'
}

function add_azienda_button() {
    insert_azienda.style.display = 'block';
}

function hide_azienda_button() {
    insert_azienda.style.display = 'none'
}