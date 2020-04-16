import React,{ Component }  from "react";
import { transform } from "ol/proj.js";

//this file is duplicated from CoordinatesSubComponents.jsx file,
//so the css file should be use same as CoordinatesSubComponents.jsx file.
import "../tools/coordinates/Coordinates.css";

import OverLayers from './OverLayers'

const inputMsg = "(listening for input)";
// export const LiveCoordinates = props => {
  export class LiveCoordinates extends Component {
    constructor(props)
    {
      super(props);
      this.state = {
        liveLatLongCoords: [],
        latLonUpdated:false,
      }
      window.emitter.addListener("mapLoaded", () => this.registerMapView());
      this.onPointerMoveHandler=this.onPointerMoveHandler.bind(this);
    }

    registerMapView =()=>{
      console.log("MapViewSub_regist");
      this.onPointerMoveEvent = window.map.on("pointermove", this.onPointerMoveHandler);
    }
  
    onPointerMoveHandler = evt => {
      let webMercatorCoords = evt.coordinate;
      let latLongCoords = transform(webMercatorCoords, "EPSG:3857", "EPSG:4326");
  
      this.setState({
        liveLatLongCoords: latLongCoords,
        latLonUpdated:true,
      });
    };

    render() {
    return (
      <div>
        <div className="sc-title">Cursor Position(WGS84)</div>

        <div className="sc-description">Live coordinates of your current pointer/mouse position.</div>

        
        <div className="sc-container">
          <div className="sc-coordinates-row sc-arrow">
            <label>Latitude:</label>
            <span>{this.state.liveLatLongCoords === null ? inputMsg : this.state.liveLatLongCoords[1]}</span>
          </div>

          <div className="sc-coordinates-row sc-arrow">
            <label>Longitude:</label>
            <span>{this.state.liveLatLongCoords === null ? inputMsg : this.state.liveLatLongCoords[0]}</span>
          </div>
        </div>
      </div>
    );
  };
};

export const MapExtent = props => {
  return (
    <div className="sc-container">
      <div className="sc-coordinates-row sc-arrow">
        <label>Min X:</label>
        <span>{props.extentMinX === null ? inputMsg : props.extentMinX}</span>
      </div>

      <div className="sc-coordinates-row sc-arrow">
        <label>Max X:</label>
        <span>{props.extentMaxX === null ? inputMsg : props.extentMaxX}</span>
      </div>

      <div className="sc-coordinates-row sc-arrow">
        <label>Min Y:</label>
        <span>{props.extentMinY === null ? inputMsg : props.extentMinY}</span>
      </div>

      <div className="sc-coordinates-row sc-arrow">
        <label>Max Y:</label>
        <span>{props.extentMaxY === null ? inputMsg : props.extentMaxY}</span>
      </div>
    </div>
  );
};

export const CustomCoordinates = props => {
  return (
    <div>
      <div className="sc-coordinates-heading">{props.title}</div>
      <CoordinateRow label="X Coordinate" value={props.valueX} onChange={props.onChangeX} inputId={props.inputIdX} onEnterKey={props.onSetHomeLocation} />
      <CoordinateRow label="Y Coordinate" value={props.valueY} onChange={props.onChangeY} inputId={props.inputIdY} onEnterKey={props.onSetHomeLocation} />
      {/* <CoordinateActions onZoomClick={props.onZoomClick} onMyMapsClick={() => props.onMyMapsClick(props.valueX, props.valueY)} /> */}
      <CoordinateActions onSetHomeLocation={props.onSetHomeLocation} />
    </div>
  );
};

export const CoordinateActions = props => {
  return (
    <div className="sc-coordinates-row">
      <label>&nbsp;</label>[{" "}
      <span className="sc-fakeLink" onClick={props.onSetHomeLocation}>
        backToHome
      </span>{" "}
      ] 
      {/* [{" "}
      <span className="sc-fakeLink" onClick={props.onMyMapsClick}>
        add to my Maps
      </span>{" "}
      ] */}
    </div>
  );
};

export const CoordinateRow = props => {
  return (
    <div className="sc-coordinates-row sc-arrow">
      <label>{props.label + ":"}:</label>
      <span>
        <input
          id={props.inputId}
          value={props.value === null ? "" : props.value}
          className="sc-coordinates-input"
          type="text"
          placeholder={inputMsg}
          onChange={props.onChange}
          onKeyDown={evt => {
            if (evt.key === "Enter") props.onEnterKey();
          }}
        />
      </span>
    </div>
  );
};
