import React from "react";
import ReactDOM from "react-dom";


class App extends React.Component {
  render() {
    return (
      <div className="component-app">
      Hello world
      </div>
    );
  }
}

ReactDOM.render(<App />, document.getElementById("root"));