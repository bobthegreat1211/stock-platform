import axios from "axios";

axios.get("https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=AAPL&apikey=demo")
  .then(res => console.log("SUCCESS:", res.status))
  .catch(err => console.log("ERROR:", err.message));