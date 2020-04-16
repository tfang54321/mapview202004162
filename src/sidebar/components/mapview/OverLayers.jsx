// REACT
import React, { Component } from "react";
import ReactDOM from "react-dom";
import Slider, { createSliderWithTooltip } from "rc-slider";
import { sortableContainer, sortableElement } from "react-sortable-hoc";
import { List, AutoSizer } from "react-virtualized";
import VirtualOverLayers from "./VirtualOverLayers.jsx";
import arrayMove from "array-move";
import GeoJSON from "ol/format/GeoJSON.js";

// CUSTOM
import "./OverLayers.css";
import * as helpers from "../../../helpers/helpers";
import * as TOCHelpers from "../wms/TOCHelpers.jsx";
import FloatingMenu, { FloatingMenuItem } from "../../../helpers/FloatingMenu.jsx";
import { Item as MenuItem } from "rc-menu";
import Portal from "../../../helpers/Portal.jsx";
import * as WMSControl  from '../wms/wmsLayerControl';
import * as OLControl from "../../../utilities/olController";
import * as Uitl from "../../../utilities/utilities";

const OL_SortableVirtualList = sortableContainer(VirtualOverLayers, { withRef: true });


export default class OverLayers extends Component {
  constructor(props) {
    super(props);

    this.storageKey = "mv-sortedlayers";
    this.lastPosition = null;
    this.virtualId = "mv-overlayer-virtual-sortedlayers"; //unique ID for virtual list
    this.state = {
      layers: [], //the array of layers added into map
      allLayers:[],
    };
    this.onCheckboxChange = this.onCheckboxChange.bind(this);
    this.onResortLayers = this.onResortLayers.bind(this);
    // LISTEN FOR MAP TO MOUNT
    window.emitter.addListener("refreshOLDisplayList",()=>this.onResortLayers());
  }

  // REFRESH IF PROPS FROM PARENT HAVE CHANGED - GROUPS DROP DOWN CHANGE.
  componentWillReceiveProps(nextProps) {
    //The nextProps.group is going to display; the "this.props.group" is a current group displayed.
    let allLayers = this.state.allLayers;
    if(nextProps===null || 
      nextProps.group===undefined||
      nextProps.group.value===undefined
      ) return;
    const nextLayers = allLayers[nextProps.group.value];
    if (nextProps.sortAlpha !== this.props.sortAlpha) {
      this.sortLayers(this.state.layers, nextProps.sortAlpha);
    }
  }

  componentWillUpdate() {
    if (this.state.layers !== undefined) window.emitter.emit("layersLoaded", this.state.layers.length);
  }

  /**
   * To reorder the layers based on the display list.
   * 
   */
  onResortLayers = () => {
    //get the layers 
    let disList= Uitl.getOLDisplayList();
    if(disList.length>0){
      this.setState({layers:disList});
    }
  }

  getItemsFromStorage() {
    const storage = localStorage.getItem(this.storageKey);
    if (storage === null) return [];

    const data = JSON.parse(storage);
    return data;
  }

  sortLayers = (layers, sortAlpha, callback = undefined) => {
    if(layers && layers.length>0) {
      let newLayers = Object.assign([{}], layers);
      newLayers.sort(this.sortByIndexCompare);


      let allLayers = this.state.allLayers;
      allLayers[this.props.group.value] = newLayers;

      this.setState({ layers: newLayers, allLayers: allLayers });
    }
  };


  registerListRef = listInstance => {
    this.List = listInstance;
  };

  // FIRES AFTER SORTING
  //BLI: This function should handle the display priority sort by drag-drop layer item
  onSortEnd = ({ oldIndex, newIndex, collection }, e) => {
    if (oldIndex === newIndex) {
      return;
    }
    let { layers } = this.state;
    let olLayer1=layers[oldIndex];
    let olLayer2=layers[newIndex];
    this.setState(
      {
        layers: arrayMove(layers, oldIndex, newIndex),
      },
      () => {
        //we need to swap the display order 
        Uitl.switchOrderOfDisplayObjs(olLayer1,olLayer2);
      }
    );
    document.getElementById(this.virtualId).scrollTop += this.lastPosition;
  };

  // TRACK CURSOR SO I CAN RETURN IT TO SAME LOCATION AFTER ACTIONS
  onSortMove = e => {
    this.lastPosition = document.getElementById(this.virtualId).scrollTop;
  };

  //TODO: The implementation to list children after "+" button is clicked.
  onChildrenToggle = layerInfo => {
   // this.legendVisiblity(layerInfo);
  };

  

  // CHECKBOX FOR EACH LAYER (BLI: visibility change)
  onCheckboxChange = layerInfo => {
    //let ele=document.getElementById(this.virtualId);
    this.lastPosition = document.getElementById(this.virtualId).scrollTop;
    layerInfo.visible = !layerInfo.visible;
    Uitl.setOLLayerVisible(layerInfo);
    document.getElementById(this.virtualId).scrollTop += this.lastPosition;
    this.setState(
      {
        // UPDATE LEGEND
        layers: this.state.layers.map(layer => (layer.name === layerInfo.name ? Object.assign({}, layer, { }) : layer))
      }
    );
  };

  // OPACITY SLIDER FOR EACH LAYER 
  //BLI: transparency control
  onSliderChange = (opacity, layerInfo) => {
    layerInfo.layer.setOpacity(opacity);

    this.setState(
      {
        // UPDATE LEGEND
        layers: this.state.layers.map(layer => (layer.name === layerInfo.name ? Object.assign({}, layer, { opacity: opacity }) : layer))
      },
      () => {
        let allLayers = this.state.allLayers;
        allLayers[this.props.group.value] = this.state.layers;
      }
    );
  };

  // ELLIPSIS/OPTIONS BUTTON ("..."button on the right side of item)
  onLayerOptionsClick = (evt, layerInfo) => {
    var evtClone = Object.assign({}, evt);
    let transparencyMenu =()=> {
      if (window.appConfig.BLI_Under_Dev.Dev_ShowOrigData) {
        return (
            <MenuItem className="sc-layers-slider" key="sc-floating-menu-opacity">
                Adjust Transparency
                <SliderWithTooltip tipFormatter={this.sliderTipFormatter} max={1} min={0} step={0.05} defaultValue={layerInfo.opacity} onChange={evt => this.onSliderChange(evt, layerInfo)} />
            </MenuItem>
        );
      }
    }
    let download_delteMenu = () =>{
        if (window.appConfig.BLI_Under_Dev.Dev_ShowOrigData) {
          return (
            <MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-download">
               <FloatingMenuItem imageName={"download.png"} label="Download" />
            </MenuItem>
            );
        }
      else{
        return ( <MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-deletion">
            <FloatingMenuItem imageName={"delete_18.png"} label="Remove" />
          </MenuItem>);
        }
    }
    const menu = (
      <Portal>
        <FloatingMenu
          key={helpers.getUID()}
          buttonEvent={evtClone}
          autoY={true}
          item={this.props.info}
          onMenuItemClick={action => this.onMenuItemClick(action, layerInfo)}
          styleMode={helpers.isMobile() ? "left" : "right"}
        >
          <MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-metadata">
            <FloatingMenuItem imageName={"metadata.png"} label="Metadata" />
          </MenuItem>
          <MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-zoom-to-layer">
            <FloatingMenuItem imageName={"zoom-in.png"} label="Zoom to Layer" />
          </MenuItem>
          { 
            download_delteMenu()
          }
          {transparencyMenu()}        
        </FloatingMenu>
      </Portal>
    );

    ReactDOM.render(menu, document.getElementById("portal-root"));
  };

  onMenuItemClick = (action, layerInfo) => {
    //BLI:Get the meta data information
    if (action === "sc-floating-menu-metadata") {
      helpers.showMessage("Get Meta Data", "Coming Soon!");
      // TOCHelpers.getLayerInfo(layerInfo, result => {
      //   if (helpers.isMobile()) {
      //     window.emitter.emit("setSidebarVisiblity", "CLOSE");
      //     helpers.showURLWindow(TOCConfig.layerInfoURL + result.featureType.fullUrl, false, "full");
      //   } else helpers.showURLWindow(TOCConfig.layerInfoURL + result.featureType.fullUrl);
      // });
    } else if (action === "sc-floating-menu-zoom-to-layer") {
      //helpers.showMessage("Zoom to layer", "Coming Soon!");
      if(window.appConfig.BLI_Under_Dev.Dev_ShowOrigData) {
        TOCHelpers.getLayerInfo(layerInfo, result => {
          const boundingBox = result.featureType.nativeBoundingBox;
          const extent = [boundingBox.minx, boundingBox.miny, boundingBox.maxx, boundingBox.maxy];
          window.map.getView().fit(extent, window.map.getSize(), { duration: 1000 });
        });
      }
      else
      {
        WMSControl.olMap_goto(window.map,layerInfo.geoExtent, layerInfo.maxScale);
      }
    } else if (action === "sc-floating-menu-deletion") { 
      helpers.showMessage("Deletion", "Coming Soon!");
      //BLI: the code here to remove the current layer from the map
    } 

    helpers.addAppStat("Layer Options", action);
  };

  //BLI: to save the layer visibilty selections 
  saveLayerOptions = () => {
    // GATHER INFO TO SAVE
    let layers = {};
    for (var key in this.state.allLayers) {
      if (!this.state.allLayers.hasOwnProperty(key)) continue;

      var obj = this.state.allLayers[key];
      let savedLayers = {};
      obj.forEach(layer => {
        const saveLayer = {
          name: layer.name,
          visible: layer.visible
        };
        savedLayers[layer.name] = saveLayer;
      });

      layers[key] = savedLayers;
    }

    localStorage.setItem(this.storageKey, JSON.stringify(layers));

    helpers.showMessage("Save", "Layer Visibility has been saved.");
  };

  turnOffLayers = () => {
    WMSControl.turnOffLayers(this.state.layers, newLayers => {
      let allLayers = this.state.allLayers;
      allLayers[this.props.group.value] = newLayers;
      this.setState({ layers: newLayers, allLayers: allLayers }, () => {});
    });
  };

  turnOnLayers = () => {
    WMSControl.enableLayersVisiblity(this.state.layers, newLayers => {
      let allLayers = this.state.allLayers;
      allLayers[this.props.group.value] = newLayers;
      this.setState({ layers: newLayers, allLayers: allLayers }, () => {});
    });
  };

  render() {
    // FILTER LAYERS FROM SEARCH INPUT
    const layers = this.state.layers.filter(layer => {
      if (this.props.searchText === undefined ||
          this.props.searchText === "") {
            return layer;
          }

      if (layer.displayName.toUpperCase().indexOf(this.props.searchText.toUpperCase()) !== -1){
         return layer;
      }
    });

    return (
       <div className="mv-layer-container">
         <AutoSizer disableWidth>
          {({ height }) => {
            return (
              <OL_SortableVirtualList
                virtualId={this.virtualId}
                key={helpers.getUID()}
                getRef={this.registerListRef}
                ref={instance => {
                  this.SortableVirtualList = instance;
                }}
                items={layers}
                onSortEnd={this.onSortEnd}
                helperClass={"sc-layer-list-sortable-helper"}
                rowHeight={height}
                height={height}
                lockAxis={"y"}
                onSortMove={this.onSortMove}
                distance={5}
                onLegendToggle={this.onChildrenToggle}
                onCheckboxChange={this.onCheckboxChange}
                searchText={this.props.searchText===undefined?"":this.props.searchText}
                onLayerOptionsClick={this.onLayerOptionsClick}
                sortAlpha={this.props.sortAlpha}
                //scrollToIndex={50}
              />
            );
          }}
        </AutoSizer>
      </div>
    );
  }
}

// SLIDER
const SliderWithTooltip = createSliderWithTooltip(Slider);
