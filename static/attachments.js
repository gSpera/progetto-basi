class AttachmentModal extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            isVisible: false,
            order: {},
            attachments: [],
        }

        this.inputFileRef = React.createRef()

        this.show = this.show.bind(this)
        this.close = this.close.bind(this)
        this.handleSubmit = this.handleSubmit.bind(this)
    }

    show(order) {
        fetch("/api/attachments?id=" + order.ID)
            .then(r => r.json())
            .then(r => this.setState({
                ...this.state,
                isVisible: true,
                order: order,
                attachments: r,
                filename: "",
            }))
    }

    close() {
        this.setState({
            ...this.state,
            isVisible: false,
        })
    }

    handleSubmit() {
        const data = new FormData(document.querySelector("#attachment-upload"))
        fetch("/api/put-attachment", {
            method: "POST",
            body: data,
        })
            .catch(err => this.props.notificationRef.current.notify("Impossibile caricare l'allegato:" + err))
        this.close()
    }

    render() {
        if (!this.state.isVisible) {
            return <div></div>
        }

        return <div className="modal is-active">
            <div className="modal-background"></div>
            <div className="modal-card">
                <header className="modal-card-head">
                    <div className="modal-card-title">Allegati ordine: {this.state.order.Order}</div>
                </header>

                <div className="modal-card-body">
                    <div>
                        {this.state.attachments.map(file =>
                            <div key={file.Name}>
                                <span className="icon is-medium">
                                    <span className="mdi mdi-file-document"></span>
                                </span>
                                <a href={`/attachments/${this.state.order.ID}/${file.Name}`} target="_blank">{file.Name}</a>
                            </div>)}
                        {this.state.attachments.length == 0 ? "Non ci sono allegati" : ""}
                    </div>

                    <hr className="only-admin"></hr>

                    <form className="form only-admin" id="attachment-upload">
                        <input type="hidden" name="id" value={this.state.order.ID} readOnly={true}></input>
                        <div className={"file" + (this.state.filename ? " has-name" : "")}>
                            <label className="file-label">
                                <input
                                    ref={this.inputFileRef}
                                    onChange={() => this.setState({ filename: this.inputFileRef.current.files.length > 0 ? this.inputFileRef.current.files[0].name : "" })}
                                    accept=".doc,.docx,.pdf,.png,.jpg,.jpeg,.gif,image/*,application/msword,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                    type="file" className="file-input" name="attachment"></input>
                                <span className="file-cta">
                                    <span className="file-icon">
                                        <span className="mdi mdi-file-document"></span>
                                    </span>
                                    <span className="file-label">
                                        Carica un allegato
                                    </span>
                                </span>
                                {this.state.filename ?
                                    <span className="file-name">
                                        {this.state.filename}
                                    </span>
                                    : ""}
                            </label>
                        </div>
                    </form>
                </div>

                <div className="modal-card-foot">
                    <button className="button" onClick={this.close}>Chiudi</button>
                    <button className={"button only-admin" + (this.state.filename ? " is-primary" : "")} onClick={this.handleSubmit} disabled={!this.state.filename}>Carica</button>
                </div>
            </div>
        </div>
    }
}
