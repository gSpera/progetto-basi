class AttachmentModal extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            isVisible: false,
            order: {},
            attachments: [],
            deliver: false,
        }

        this.inputFileRef = React.createRef()

        this.show = this.show.bind(this)
        this.close = this.close.bind(this)
        this.handleSubmit = this.handleSubmit.bind(this)
        this.deleteAttachmentShow = this.deleteAttachmentShow.bind(this);
        this.deleteAttachmentDelete = this.deleteAttachmentDelete.bind(this);
        this.deleteAttachmentClose = this.deleteAttachmentClose.bind(this);
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
                deliver: true,
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

    deleteAttachmentShow(attachment) {
        this.setState({
            ...this.state,
            deleteAttachment: attachment,
        })
    }

    deleteAttachmentClose() {
        this.setState({
            ...this.state,
            deleteAttachment: undefined,
        })
    }

    deleteAttachmentDelete() {
        fetch(`/api/delete-attachment?id=${this.state.order.ID}&name=${this.state.deleteAttachment.Name}`)
            .then(_ => this.setState({
                ...this.state,
                attachments: this.state.attachments.filter(file => file != this.state.deleteAttachment),
                deleteAttachment: undefined,
            }))
            .catch(err => this.props.notificationRef.current.notify("Impossibile eliminare allegato:" + err))
    }

    render() {
        if (!this.state.isVisible) {
            return <div></div>
        }

        return <React.Fragment>
            <div className="modal is-active">
                <div className="modal-background"></div>
                <div className="modal-card">
                    <header className="modal-card-head">
                        <div className="modal-card-title">Allegati ordine: {this.state.order.Order}</div>
                    </header>

                    <div className="modal-card-body">
                        <div>
                            {this.state.attachments.map(file =>
                                <div key={file.Name} className="child-background-alternate">
                                    <span className="icon is-medium">
                                        <span className="mdi mdi-file-document"></span>
                                    </span>
                                    <a href={`/attachments/${this.state.order.ID}/${file.Name}`} target="_blank">{file.Name}</a>
                                    <span className="icon is-medium is-pulled-right is-clickable only-admin" onClick={() => this.deleteAttachmentShow(file)}>
                                        <span className="mdi mdi-delete"></span>
                                    </span>
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

                            <label className="checkbox mt-3">
                                <input
                                    name="deliver"
                                    type="checkbox"
                                    className="mr-1"
                                    checked={this.state.deliver}
                                    onChange={ ev => this.setState({ deliver: ev.target.checked })}
                                />
                                Aggiorna ordine come <b>Consegnato</b>
                            </label>
                        </form>
                    </div>

                    <div className="modal-card-foot">
                        <button className="button" onClick={this.close}>Chiudi</button>
                        <button className={"button only-admin" + (this.state.filename ? " is-primary" : "")} onClick={this.handleSubmit} disabled={!this.state.filename}>Carica</button>
                    </div>
                </div>
            </div>
            {
                this.state.deleteAttachment != undefined &&
                <div className="modal is-active">
                    <div className="modal-background"></div>
                    <div className="modal-card">
                        <header className="modal-card-head">
                            <div className="modal-card-title">{this.state.deleteAttachment.Name}</div>
                        </header>

                        <div className="modal-card-body">
                            Sicuro di voler eliminare l'allegato: {this.state.deleteAttachment.Name}??
                        </div>

                        <div className="modal-card-foot">
                            <button className="button is-danger" onClick={this.deleteAttachmentDelete}>Elimina</button>
                            <button className="button" onClick={this.deleteAttachmentClose}>Annulla</button>
                        </div>
                    </div>
                </div>
            }
        </React.Fragment>
    }
}
