import React, { Component } from "react";
import "./editor.css";
import SheetComponent from "../sheet/sheet.component";
import ListComponent from "../list/list.component";

export default class EditorComponent extends Component {
  constructor() {
    super();
    this.state = {
      params: {},
    };
  }

  getParams() {
    const params = new URLSearchParams(window.location.search);
    const parsedParams = {};
    params.forEach((value, key) => {
      parsedParams[key] = value;
    });
    this.setState({ params: parsedParams });
  }

  componentDidMount() {
    this.getParams();
  }

  render() {
    const { params } = this.state;
    return (
      <div className="container">
        <div id="main-area" className="main-area">
          {params.id ? <SheetComponent id={params.id} /> : <ListComponent />}
        </div>
      </div>
    );
  }
}
