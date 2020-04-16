import React, { Component } from "react";
import "./MapView.css";
import { CustomCoordinates, LiveCoordinates } from "./MapViewSubComponents.jsx";
import { transform } from "ol/proj.js";
import { register } from "ol/proj/proj4";
import Projection from "ol/proj/Projection.js";
import { Vector as VectorLayer } from "ol/layer";
import { Fill, Style, Icon,Circle as CircleStyle } from "ol/style.js";
import { Vector as VectorSource } from "ol/source.js";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import { unByKey } from "ol/Observable.js";

import OverLayers from "./OverLayers";
import * as Util from '../../../utilities/utilities';
import {olAddLayerToView,OL_SOURCE_TYPE} from "../../../utilities/olController";

const myPresention_zIndex=9999;
const myPresention_Name="view_presentation";

//Control the objects displayed on the viewport
export default class MapView extends Component {
  constructor(props) {
    super(props);
    let homeLonLatPos=Util.getHomeLocation();
    this.state = {
      initFlag:false,
      key_control_down:false,
      inputWebMercatorXValue: null,
      inputWebMercatorYValue: null,
      inputLatLongXValue: homeLonLatPos[0],
      inputLatLongYValue: homeLonLatPos[1],
      inputNad83XValue: null,
      inputNad83YValue: null,
      inputNad27XValue: null,
      inputNad27YValue: null,
      extentMinX: null,
      extentMinY: null,
      extentMaxX: null,
      extentMaxY: null,
      mapScale: null,// Util.getMapScale()
      //addintion params
      addedLayers: [] //all layers added into the map of openlayers.
    };

    this.handleKeyDown=this.handleKeyDown.bind(this);
    this.handleKeyUp=this.handleKeyUp.bind(this);
    this.updateDOMContext = this.updateDOMContext.bind(this);
  }
  //BLI: this function will go the registration after openlayers map is created.
  registerMapView =()=>{
    if(this.state.initFlag===false)
    {
      this.vectorLayer = new VectorLayer({
        name: myPresention_Name,
        source: new VectorSource({
          features: []
        }),
        // style: new Style({
        //   image: new CircleStyle({
        //     opacity: 0.5,
        //     radius: 15,
        //     fill: new Fill({ color: "#EE2E2E" })
        //   })
        // })
      });
      //this.vectorLayer.setZIndex(myPresention_zIndex);
      olAddLayerToView({olLayer:this.vectorLayer},true,OL_SOURCE_TYPE.VECTOR,myPresention_zIndex);
      //BLI: this projection can be used  as needed
      // // UTM NAD 83
      // this.nad83Proj = new Projection({
      //   code: "EPSG:26917",
      //   extent: [194772.8107, 2657478.7094, 805227.1893, 9217519.4415]
      // });

      // // UTM NAD 27
      // this.nad27Proj = new Projection({
      //   code: "EPSG:26717",
      //   extent: [169252.3099, 885447.906, 830747.6901, 9217404.5493]
      // });
      // REGISTER MAP EVENTS
      this.onMapClickEvent = window.map.on("click", this.onMapClick);
      this.onMapMoveEvent = window.map.on("moveend", this.onMapMoveEnd);
      this.setState({initFlag:true});
      //add the home location on the base map;
      this.createPoint(Util.getHomeLocationInWorld(), false);
    }
    // INITIAL EXTENT
    this.updateExtent();
  };

  componentDidMount() {
    // LISTEN FOR MAP TO MOUNT (BLI: why onMapLoad isn't defined in this object?)
   // window.emitter.addListener("mapLoaded", () => this.onMapLoad());

    // DISABLE PROPERTY CLICK
    window.disableParcelClick = true;

    // REGISTER CUSTOM PROJECTIONS
    // proj4.defs([
    //   ["EPSG:26917", "+proj=utm +zone=17 +ellps=GRS80 +datum=NAD83 +units=m +no_defs "],
    //   ["EPSG:26717", "+proj=utm +zone=17 +ellps=clrk66 +datum=NAD27 +units=m +no_defs "]
    // ]);
    // register(proj4);
    window.emitter.addListener("keydown",this.handleKeyDown);
    window.emitter.addListener("keyup",this.handleKeyUp);
    window.emitter.addListener("mapLoaded", () => this.registerMapView());
  }

  // WHEN MAP EXTENT CHANGES
  updateExtent = () => {
    const extent = window.map.getView().calculateExtent(window.map.getSize());
    this.setState({ extentMinX: extent[0], extentMinY: extent[1], extentMaxX: extent[2], extentMaxY: extent[3], mapScale: Util.getMapScale() });
  };

  onMyMapsClick = (x, y) => {
    if (x === null) return;

    // ADD MYMAPS
    window.emitter.emit("addMyMapsFeature", this.vectorLayer.getSource().getFeatures()[0], "X:" + x + ", Y:" + y);
  };

  onMapMoveEnd = evt => {
    this.updateExtent();
  };

  //handle the key press down event;
  handleKeyDown = code=> {
    if(code===17) //contrl key pressed
    {
      this.setState({key_control_down:true});
    }
  }
  handleKeyUp = code=> {
    if(code===17) //contrl key pressed
    {
      this.setState({key_control_down:false});
    }
  }
  onMapClick = evt => {
    if(this.state.key_control_down === false) {
      return; // do nothing.
    }
    const webMercatorCoords = evt.coordinate;
    const latLongCoords = transform(webMercatorCoords, "EPSG:3857", "EPSG:4326");
    // const utmNad83Coords = transform(webMercatorCoords, "EPSG:3857", this.nad83Proj);
    // const utmNad27Coords = transform(webMercatorCoords, "EPSG:3857", this.nad27Proj);

    this.setState({
      inputWebMercatorXValue: webMercatorCoords[0],
      inputWebMercatorYValue: webMercatorCoords[1],
      inputLatLongXValue: latLongCoords[0],
      inputLatLongYValue: latLongCoords[1],
      // inputNad83XValue: utmNad83Coords[0],
      // inputNad83YValue: utmNad83Coords[1],
      // inputNad27XValue: utmNad27Coords[0],
      // inputNad27YValue: utmNad27Coords[1]
    });
    //change the home location
    Util.setHomeLocation(latLongCoords);

    this.glowContainers();

    this.createPoint(webMercatorCoords, false);
  };

  createPoint = (webMercatorCoords, zoom = false,zoomlevel=18) => {
    // CREATE POINT
    this.vectorLayer.getSource().clear();
    const pointFeature = new Feature({
      geometry: new Point(webMercatorCoords)
    });    
    let mystyle1= new Style({
          image: new Icon({
            anchor: [0.5, 1],
            src: images["home.png"],
            // the real size of your icon
            //size: [35, 35],
            // the scale factor to change image size
            scale: 2
          })
        });

    pointFeature.setStyle(mystyle1);
    this.vectorLayer.getSource().addFeature(pointFeature);
    //let curZoom=window.map.getView().getZoom() ;

    // ZOOM TO IT
    if (zoom) 
        window.map.getView().animate({ center: webMercatorCoords, zoom: zoomlevel });
    else 
        window.map.getView().animate({ center: webMercatorCoords});
  };
  //Go show the green box on location field
  glowContainers() {
    // Util.glowContainer("sc-coordinate-webmercator-x", "green");
    // Util.glowContainer("sc-coordinate-webmercator-y", "green");
    Util.glowContainer("sc-coordinate-latlong-x", "green");
    Util.glowContainer("sc-coordinate-latlong-y", "green");
    // Util.glowContainer("sc-coordinate-nad83-x", "green");
    // Util.glowContainer("sc-coordinate-nad83-y", "green");
    // Util.glowContainer("sc-coordinate-nad27-x", "green");
    // Util.glowContainer("sc-coordinate-nad27-y", "green");
  }


  componentWillUnmount() {
    // UNREGISTER EVENTS
    unByKey(this.onPointerMoveEvent);
    unByKey(this.onMapClickEvent);

    // ENABLE PROPERTY CLICK
    window.disableParcelClick = false;

    // REMOVE THE LAYER
    window.map.removeLayer(this.vectorLayer);
  }

  onClose() {
    // CALL PARENT WITH CLOSE
    this.props.onClose();
  }

  //BLI: go back to specified position
  onSetHomeLocation = (proj, x, y) => {
    x = parseFloat(x);
    y = parseFloat(y);

    if (isNaN(x) || isNaN(y)) return;
    //support three projections and current only "latlong " is enabled.
    let webMercatorCoords = null;
    if (proj === "webmercator") {
      webMercatorCoords = [x, y];
    } 
    else if (proj === "latlong") {
      webMercatorCoords = transform([x, y], "EPSG:4326", "EPSG:3857");
    } else if (proj === "nad83") {
      webMercatorCoords = transform([x, y], this.nad83Proj, "EPSG:3857");
    } else if (proj === "nad27") {
      webMercatorCoords = transform([x, y], this.nad27Proj, "EPSG:3857");
    } 
    else return;
    //update the home location
    Util.setHomeLocation([x,y]);
    //BLI: disable the zoom feature
    //this.createPoint(webMercatorCoords, true);
    this.createPoint(webMercatorCoords);
  };
  //Format the text input only for float number
  onTextChange_Float = (updateX,evt) =>{
    const re = /^[-]?[0-9]*\.?[0-9]*$/;
    if (evt.target.value === '' ||
        re.test(evt.target.value)) {
          if(updateX) {
            this.setState({inputLatLongXValue: evt.target.value});
          }
          else {
            this.setState({inputLatLongYValue: evt.target.value});
          }
   }
  }

  updateDOMContext(){
    let context = (
        <div className="sc-mapview-container">
          <LiveCoordinates />
          
          <div className="sc-title sc-mapview-title">Home Location</div>
          <div className="sc-description">
            Set home location by either entering your own locations or simply clicking on the map by pressing "control+ left mouse button".
          </div>
          <div className="sc-container">
            {/* <div className="sc-mapview-divider">&nbsp;</div> */}
            <CustomCoordinates
              title="Latitude/Longitude (WGS84)"
              valueX={this.state.inputLatLongXValue}
              valueY={this.state.inputLatLongYValue}
              // onChangeX={evt => {
              //   this.setState({ inputLatLongXValue: evt.target.value });
              // }}
              onChangeX={evt => {this.onTextChange_Float(true,evt);}}
              onChangeY={evt => {this.onTextChange_Float(false,evt);}}
              onSetHomeLocation={() => {
                this.onSetHomeLocation("latlong", this.state.inputLatLongXValue, this.state.inputLatLongYValue);
              }}
              onMyMapsClick={() => {
                this.onMyMapsClick(this.state.inputLatLongXValue, this.state.inputLatLongYValue);
              }}
              inputIdX="sc-coordinate-latlong-x"
              inputIdY="sc-coordinate-latlong-y"
              onEnterKey={() => {
                this.onSetHomeLocation("latlong", this.state.inputLatLongXValue, this.state.inputLatLongYValue);
              }}
            />

            {/* <div className="sc-mapview-divider">&nbsp;</div> */}
          </div>
          <div className="sc-title sc-mapview-title">Displayed Layers</div>
          <div className="sc-description">List all visible layers and Layer with heightest display priority is listed at first.</div>
          {/* <div className="sc-container"> */}
          <div>
            <OverLayers
              ref={ref => {
                //keep the referenece of the "OverLayers" DOM element
                this.layerRef =ref;
              }}
              addedLayers={this.state.addedLayers}
              searchText={this.state.searchText===""?undefined:this.state.searchText}
              sortAlpha={this.state.sortAlpha}
              //allGroups={this.state.addedLayers}
            />
          </div>
        </div>
      );
    return context;
  }

  render() {
    return this.updateDOMContext();
  }
}

const images = importAllImages(require.context("./images", false, /\.(png|jpe?g|svg|gif)$/));
function importAllImages(r) {
  let images = {};
  r.keys().map((item, index) => (images[item.replace("./", "")] = r(item)));
  return images;
}