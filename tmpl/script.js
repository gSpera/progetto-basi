function OrderTables(props) {
    return <div>
        {props}
    </div>
}

const orders = fetch("/api/orders")
    .then(r => r.json())
    .catch(err => console.error(err))

const ordersRoot = ReactDOM.createRoot(document.querySelector("#orders-root"))
ordersRoot.render(new OrderTables(orders))