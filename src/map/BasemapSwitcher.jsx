import React, { Component } from "react";
import "./BasemapSwitcher.css";
import * as helpers from "../helpers/helpers";
import BasemapConfig from "./basemapSwitcherConfig.json";
import {olAddLayerToView,OL_SOURCE_TYPE} from "../utilities/olController";

const img_background_map='img_background_map';
const vector_background_map='vector_background_map';
class BasemapSwitcher extends Component {
  constructor(props) {
    super(props);

    this.state = {
      imageryLayers: [],
      backgroundLayers:[], //BLI: hold background maps
      containerCollapsed: false,
      topoPanelOpen: false,
      activeButton: "imagery"
    };
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    // LISTEN FOR MAP TO MOUNT
    if(window.appConfig.TwoBaseMapsOnly) {
      window.emitter.addListener("mapLoaded", () => this.loadBackgroupMap());
    }
  }
  componentDidMount() {
    //add the key listener
    //ToDo: need to add the key event only for the specific element of DOM
    document.addEventListener("keydown", this.handleKeyDown,true);
    document.addEventListener("keyup", this.handleKeyUp,true);
 }
  componentWillUnmount(){
    //remove the key listener
    document.removeEventListener("keydown", this.handleKeyDown, false);
    document.removeEventListener("keyup", this.handleKeyUp, false);
  }

  handleKeyDown=evt=>{
    window.emitter.emit("keydown",evt.keyCode);
  }
  handleKeyUp=evt=>{
    window.emitter.emit("keyup",evt.keyCode);
  }
  getOLLayer(array,key) {
    //BLI: the object is "key: value" stored in array, like "vector: osmLayer"
    let layer=null;
    if(array)
    {
      array.forEach(element => {
        if(element.hasOwnProperty(key))
        {
          layer=element[key];
          return;
        }
      });
    }
    return layer;
  }

  setBgMapVisibilty(layerArray,layerKey,visible,index) {
    //used for two background maps mode
    let selectedLayer= this.getOLLayer(layerArray,layerKey);
    if(selectedLayer!==undefined)
    {
      selectedLayer.setVisible(visible);
      selectedLayer.setZIndex(index);
    }
  }

  loadBackgroupMap() {
    let index=0;
    let layerList=[];
    let imageLayer=helpers.getESRITileXYZLayer(window.appConfig.imageryBackground);
    // imagery background LAYER PROPS
    imageLayer.setProperties({ index: index, name: img_background_map });
    imageLayer.setZIndex(index);
    imageLayer.setVisible(true); //turn on as default
    //add the imagery layer to map
    let isBaseMaps=window.appConfig.baseMapControl===true?false:true;
    olAddLayerToView({olLayer:imageLayer},isBaseMaps,OL_SOURCE_TYPE.IMAGE,index);
    layerList.push({img_background_map: imageLayer});
    //OSM background Layer:
    let osmLayer=helpers.getOSMLayer();
    osmLayer.setProperties({name: vector_background_map})
    osmLayer.setZIndex(index);
    osmLayer.setVisible(false);
    olAddLayerToView({olLayer:osmLayer},isBaseMaps,OL_SOURCE_TYPE.VECTOR,index);
    layerList.push({vector_background_map: osmLayer});
    this.setState({backgroundLayers:layerList});
  }

  // CALLED WHEN SLIDING OR TO RESET
  //BLI: the implementation to show the image map based of multiple years.
  //this function is not enabled yet.
  updateImageryLayers(value) {
    for (let index = 0; index < this.state.imageryLayers.length; index++) {
      let layer = this.state.imageryLayers[index];
      if (value === -1) layer.setVisible(false);
      else {
        const layerIndex = layer.getProperties().index;
        const indexRatio = 1 - Math.abs(layerIndex - value);
        if (layerIndex === value) {
          layer.setOpacity(1);
          layer.setVisible(true);
        } else if (indexRatio < 0) {
          layer.setOpacity(0);
          layer.setVisible(false);
        } else {
          layer.setOpacity(indexRatio);
          layer.setVisible(true);
        }
      }
    }
  }

  onImageryButtonClick = value => {
    // DISABLE TOPO
    this.disableTopo();
    this.enableImagery();
    // APP STATS
    helpers.addAppStat("Imagery", "Button");
  };

  enableImagery = value => {
      // DISABLE vector background map
      this.disableTopo();
      this.setState({ activeButton: "imagery" });
      this.setBgMapVisibilty(this.state.backgroundLayers,img_background_map,true,0);
    // EMIT A BASEMAP CHANGE
    window.emitter.emit("basemapChanged", "IMAGERY");
  };

  disableImagery = value => {
    // DISABLE IMAGERY
    this.setBgMapVisibilty(this.state.backgroundLayers,img_background_map,false,-1);
    
  };

  onCollapsedClick = evt => {
    // HIDE OPEN PANELS
    if (this.state.containerCollapsed === false) {
      this.setState({ topoPanelOpen: false });
    }

    this.setState({ containerCollapsed: !this.state.containerCollapsed });
  };
  //Turn on the vector background map
  enableTopo = value => {
    // DISABLE IMAGERY
    this.disableImagery();
    this.setState({ activeButton: "topo" });
    //BLI:working on this now
    //BLI:debugging code: turnoff background map
    if(this.state.topoPanelOpen)
    {
      this.disableTopo();//turnoff background map
    }
    else {
      this.setBgMapVisibilty(this.state.backgroundLayers,vector_background_map,true,0);
    }
    // EMIT A BASEMAP CHANGE
    window.emitter.emit("basemapChanged", "TOPO");
  };
  //turn off the vector background map;
  disableTopo = value => {
    this.setBgMapVisibilty(this.state.backgroundLayers,vector_background_map,false,-1);
  };

  // TOPO BUTTON
  onTopoButtonClick = evt => {
    // CLOSE PANEL ONLY IF ALREADY OPEN
    if (this.state.topoPanelOpen) this.setState({ topoPanelOpen: !this.state.topoPanelOpen });

    this.enableTopo();

    // APP STATS
    helpers.addAppStat("Topo", "Button");
  };

  render() {
    let content=null;
    //if(window.appConfig.BLI_Under_Dev.Dev_SimpleViewMap_only) 
    {
      //BLI: ESRI imagery or open street map as background map
      content= (
        <div >
          <div id="sc-basemap-main-container">
            <div id="sc-basemap-collapse-button" className={this.state.containerCollapsed ? "sc-basemap-collapse-button closed" : "sc-basemap-collapse-button"} onClick={this.onCollapsedClick} />
            <div className={this.state.containerCollapsed ? "sc-hidden" : "sc-basemap-imagery"}>
              <button className={this.state.activeButton === "imagery" ? "sc-button sc-basemap-imagery-button active" : "sc-button sc-basemap-imagery-button"} onClick={this.onImageryButtonClick}>
                Imagery
              </button>
            </div>
            <div className={this.state.containerCollapsed ? "sc-hidden" : "sc-basemap-topo"}>
              <button className={this.state.activeButton === "topo" ? "sc-button sc-basemap-topo-button active" : "sc-button sc-basemap-topo-button"} onClick={this.onTopoButtonClick}>
                Topo
              </button>
            </div>
          </div>
        </div> 
      );
    }
    return content;
  }
}

export default BasemapSwitcher;


// IMPORT ALL IMAGES
const images = importAllImages(require.context("./images", false, /\.(png|jpe?g|svg|gif)$/));
function importAllImages(r) {
  let images = {};
  r.keys().map((item, index) => (images[item.replace("./", "")] = r(item)));
  return images;
}
