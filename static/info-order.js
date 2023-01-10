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
            .catch(err => this.props.notificationRef.current.notify("Info ordine:" + err))
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

                    <h2>Note:</h2>
                    <textarea className="textarea" readOnly={true}>{this.state.r.Note}</textarea>

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