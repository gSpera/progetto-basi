class Notification extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            messages: [],
        };
        this.notify = this.notify.bind(this);
    }

    notify(msg) {
        this.state.messages.push(msg);
        setTimeout(() => {
            this.state.messages.shift()
            this.setState({
                ...this.state,
            })
            console.log("Remove")
        }, 5000);
        this.setState({
            ...this.state,
        })
    }

    render () {
        return <div id="notification-container">
            { this.state.messages.map(msg => <div key={msg} className="notification is-danger">{msg}</div>)}
        </div>;
    }
}