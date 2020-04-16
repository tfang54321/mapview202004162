import React, { Component } from "react";
import "./Navigation.css";
import { fromLonLat } from "ol/proj";
import * as helpers from "../helpers/helpers";

import {getHomeLocationInWorld} from "../utilities/utilities";
import * as olControl from "../utilities/olController"

const storageMapDefaultsKey = "map_defaults";
class Navigation extends Component {
  constructor(props) {
    super(props);
    
    this.state = {
      containerClassName: "nav-container",
      control_key_down:false,
      shift_key_down:false,
    };
    this.handleKeyUp=this.handleKeyUp.bind(this);
    this.handleKeyDown=this.handleKeyDown.bind(this);

    // LISTEN FOR SIDEPANEL CHANGES
    window.emitter.addListener("sidebarChanged", isSidebarOpen => this.sidebarChanged(isSidebarOpen));
    window.emitter.addListener("keyup",this.handleKeyUp);
    window.emitter.addListener("keydown",this.handleKeyDown);
  }
  handleKeyDown(code) {
    switch(code)
    {
        case 16://shift key code
        {
          if(this.state.shift_key_down === false){
            this.setState({shift_key_down:true})
          };
        }
        case 17://shift key code/contrl key pressed
          if(this.state.control_key_down === false){
            this.setState({control_key_down:true})
        };
        break;
    }
  }
  handleKeyUp(code) {
    //zoom out if the "-" pressed
    switch(code) {
      case 16://shift key code
      {
        if(this.state.shift_key_down === true){
          this.setState({shift_key_down:false})
        };
        break;
      }
      case 17://shift key code/contrl key pressed
        if(this.state.control_key_down === true){
          this.setState({control_key_down:false})
        };
        break;
      case 189://"-" on main keyboard
      case 109://"-" on small keyboard
        if(this.state.shift_key_down === true){
          this.zoomOut();
        };
        break;
      case 107: //"+" on small keyboard
      case 187: //"+" on main keyboard
        if(this.state.shift_key_down === true){
          this.zoomIn();
        };
        break;
      case 37: //"left" arraw on main keyboard
        if(this.state.control_key_down === true){
          olControl.olPanView(olControl.OL_VIEW_PAN.LEFT);
        };
        break;
      case 38: //"up" arraw on main keyboard
        if(this.state.control_key_down === true){
          olControl.olPanView(olControl.OL_VIEW_PAN.UP);
        };
        break;
      case 39: //"right" arraw on main keyboard
        if(this.state.control_key_down === true){
          olControl.olPanView(olControl.OL_VIEW_PAN.RIGHT);
        };
        break;
      case 40: //"down" arraw on main keyboard
        if(this.state.control_key_down === true){
          olControl.olPanView(olControl.OL_VIEW_PAN.DOWN);
        };
        break;
      default:
          break;
    }
  }
  // ZOOM IN BUTTON
  zoomIn() {
    olControl.olViewZoomTo(olControl.olViewZoom()+1);
  }

  // ZOOM OUT BUTTON
  zoomOut() {
    olControl.olViewZoomTo(olControl.olViewZoom()-1);
  }

  // ZOOM TO FULL EXTENT
  toHome() {
    //get the world position of the home position
    let centerCoords=getHomeLocationInWorld();
    //let defaultZoom = window.appConfig.defaultZoom;
    let defaultZoom = olControl.olViewZoom();
    const defaultStorage = sessionStorage.getItem(storageMapDefaultsKey); 
    if (defaultStorage !== null) {
      const detaults = JSON.parse(defaultStorage);
      if (detaults.zoom !== undefined) defaultZoom = detaults.zoom;
      if (detaults.center !== undefined) centerCoords = detaults.center;
    }
    olControl.olViewAnimate(centerCoords,defaultZoom );
  }

  // ZOOM TO CURRENT LOCATION
  zoomToCurrentLocation() {
    navigator.geolocation.getCurrentPosition(function(pos) {
      const coords = fromLonLat([pos.coords.longitude, pos.coords.latitude]);
      helpers.flashPoint(coords);
    });

    helpers.addAppStat("Current Location", "Click");
  }

  // HANDLE SIDEBAR CHANGES
  sidebarChanged(isSidebarOpen) {
    //  SIDEBAR IN AND OUT
    if (isSidebarOpen) {
      this.setState({ containerClassName: "nav-container nav-container-slideout" });
    } else {
      this.setState({ containerClassName: "nav-container nav-container-slidein" });
    }
  }

  render() {
    return (
      <div className={this.state.containerClassName}>
        <div className="zoomButton" onClick={this.zoomIn}>
          +
        </div>
        <div className="zoomButton" onClick={this.zoomOut}>
          -
        </div>
        <div className="fullExtentButton" onClick={this.toHome}>
          <div className="fullExtentContent"></div>
        </div>
        <div className="zoomToCurrentLocationButton" onClick={this.zoomToCurrentLocation}>
          <div className="zoomToCurrentLocationContent"></div>
        </div>
      </div>
    );
  }
}

export default Navigation;
