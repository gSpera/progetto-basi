class UpdateOrder extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            show: false,
            Order: {
                Order: "INVALID ORDER",
            },
            Selection: {
                State: 0,
                When: new Date().toISOString(),
            },
        };

        this.update = this.update.bind(this);
        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
        this.close = this.close.bind(this);
    }

    update(order) {
        this.state.Selection.OrderID = order.ID;
        this.setState({
            ...this.state,
            show: true,
            Order: order,
        });
    }

    handleChange(event) {
        const value = event.target.value;

        switch (event.target.name) {
            case "state":
                this.state.Selection.State = String(value);
                break;
            case "when":
                this.state.Selection.When = new Date(value).toISOString();
                break;
            default:
                alert("Errore");
        }

        this.setState(this.state);
    }

    handleSubmit() {
        if (this.state.Order.Order == "") {
            alert("Ordine non valido")
            return
        }

        fetch("/api/update-order", {
            method: "POST",
            cache: "no-cache",
            body: JSON.stringify(this.state.Selection),
        })
        this.close();
        this.props.orderTableRef.current.update();
    }

    close() {
        this.setState({
            ...this.state,
            show: false,
        })
    }

    render() {
        if (!this.state.show) {
            return <div></div>;
        }

        return <div className="modal is-active">
            <div className="modal-background"></div>
            <div className="modal-card">
                <header className="modal-card-head">
                    <div className="modal-card-title">Aggiorna Ordine: {this.state.Order.Order}</div>
                </header>

                <div className="modal-card-body">
                    <p>Ordine: <b>{this.state.Order.Order}</b>, DDT: <b>{this.state.Order.DDT}</b></p>
                    <p>Destinazione: <b>{this.state.Order.RecipientName}</b></p>
                    <p>Ultimo Aggiornamento: <b>{this.state.Order.StateString}</b> - <i>{this.state.Order.When}</i></p>

                    <form onSubmit={this.handleSubmit}>
                        <div className="field is-horizontal">
                            <label htmlFor="state" className="field-label label">Stato:</label>
                            <div className="field-body control select">
                                <select name="state" value={this.state.Selection.State} onChange={this.handleChange}>
                                    {states.map(s => <option value={s.ID} key={s.ID}>{s.Name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="field is-horizontal">
                            <label htmlFor="when" className="field-label label">Data:</label>
                            <div className="field-body control">
                                <input name="when" className="input" type="date" value={this.state.Selection.When.substring(0, 10)} onChange={this.handleChange} />
                            </div>
                        </div>

                    </form>
                </div>
                <div className="modal-card-foot">
                    <button className="button is-primary" onClick={this.handleSubmit}>Aggiorna</button>
                    <button className="button" onClick={this.close}>Chiudi</button>
                </div>
            </div>
        </div>;
    }
}
