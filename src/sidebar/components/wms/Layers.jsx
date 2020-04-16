// REACT
import React, { Component } from "react";
import ReactDOM from "react-dom";
import Slider, { createSliderWithTooltip } from "rc-slider";
import { sortableContainer, sortableElement } from "react-sortable-hoc";
import { List, AutoSizer } from "react-virtualized";
import VirtualLayers from "./VirtualLayers.jsx";
import arrayMove from "array-move";
import GeoJSON from "ol/format/GeoJSON.js";

// CUSTOM
import "./Layers.css";
import * as helpers from "../../../helpers/helpers";
import * as TOCHelpers from "./TOCHelpers.jsx";
import FloatingMenu, { FloatingMenuItem } from "../../../helpers/FloatingMenu.jsx";
import { Item as MenuItem } from "rc-menu";
import Portal from "../../../helpers/Portal.jsx";

import * as WMSControl  from './wmsLayerControl';
import * as OLControl from "../../../utilities/olController";
import * as Util from "../../../utilities/utilities";

const SortableVirtualList = sortableContainer(VirtualLayers, { withRef: true });


class Layers extends Component {
  constructor(props) {
    super(props);

    this.storageKey = "layers";
    this.lastPosition = null;
    this.virtualId = "sc-toc-virtual-layers";
    this.state = {
      allLayers: {},//all layer groups contained 
      layers: [] //the layers are displaying in the list area
    };
    this.onCheckboxChange=this.onCheckboxChange.bind(this);

    // LISTEN FOR MAP TO MOUNT
    window.emitter.addListener("mapLoaded", () => this.onMapLoad());

    // LISTEN FOR SEARCH RESULT
    window.emitter.addListener("activeTocLayer", layerItem => this.onActivateLayer(layerItem));
  }

  onActivateLayer = layerItem => {
    const groupName = layer => {return helpers.replaceAllInString(layer.layerGroup, " ", "_");}

    let layersCopy = Object.assign([], this.state.allLayers[groupName(layerItem)]);

    layersCopy.forEach(layer => {
      if (layer.name === layerItem.fullName) {
        layer.visible = true;
        layer.layer.setVisible(true);
        
        document.getElementById(this.virtualId).scrollTop = 0;

        var i = 0;
        var elemFound = false;
        for (var i = 1; i <= 100; i++) {
          if (elemFound) return;
          // eslint-disable-next-line
          (index => {
            setTimeout(() => {
              if (elemFound) return;

              const elem = document.getElementById(layer.elementId);
              if (elem !== null) {
                elemFound = true;
                const topPos = elem.offsetTop;
                document.getElementById(this.virtualId).scrollTop = topPos + 1;
                setTimeout(() => {
                  document.getElementById(this.virtualId).scrollTop = topPos;
                }, 50);
              } else {
                document.getElementById(this.virtualId).scrollTop += i * 10;
              }
            }, i * 100);
          })(i);
        }
      }
    });
  };

  componentWillUpdate() {
    if (this.state.layers !== undefined) window.emitter.emit("layersLoaded", this.state.layers.length);
  }
//BLI: this function is used query the meta data information based on the single location
//selected on the map view
  onMapLoad = () => {
    let self=this;
    window.map.on("singleclick", evt => {
      const viewResolution = window.map.getView().getResolution();
      self.state.layers.forEach(layer => {
        if (layer.visible && layer.liveLayer) {
          var url = layer.layer.getSource().getFeatureInfoUrl(evt.coordinate, viewResolution, "EPSG:3857", { INFO_FORMAT: "application/json" });
          if (url) {
            helpers.getJSON(url, result => {
              const features = result.features;
              if (features.length > 0) {
                const geoJSON = new GeoJSON().readFeatures(result);
                const feature = geoJSON[0];
                helpers.showFeaturePopup(evt.coordinate, feature);
              }
            });
          }
        }
      });
    });
  };

  resetLayers = () => {
    // SHUT OFF VISIBILITY
    for (var key in this.state.allLayers) {
      if (!this.state.allLayers.hasOwnProperty(key)) continue;

      var obj = this.state.allLayers[key];
      obj.forEach(layer => {
        layer.layer.setVisible(false);
      });
    }

    this.setState({ layers: undefined, allLayers: [] }, () => {
      this.refreshLayers(this.props.group, this.props.sortAlpha,this.props.allGroups);
    });
  };

  refreshLayers = (group, sortAlpha, allGroups) => {
    let layers = [];
    layers = this.state.allLayers[group.value];

    if (layers === undefined) {
      layers = group.layers;
      //BLI refresh the new layers based on the selected group.
      if (layers !== undefined || group.parentLayer !==undefined) {
          let allLayers = this.state.allLayers;
          allLayers[group.value] = layers;
          
          // FETCH THE REST OF THE GROUPS
          const fetchGroups = (allGroups) => {
              allGroups.forEach(groupItem => {
              if (group.value !== groupItem.value) {
                let layersItems = this.state.allLayers[groupItem.value];
                if (layersItems === undefined) {
                  //BLI: this line should be modified to keep "groupItem.sublayers" only.
                  layersItems = groupItem.layers!==undefined?groupItem.layers:groupItem.sublayers;
                  if (layersItems !== undefined) {
                    let allLayers = this.state.allLayers;
                    allLayers[groupItem.value] = layersItems;
                  }
                }
              }
            });
          }
          fetchGroups(allGroups);
          this.setState({ layers: layers, allLayers: allLayers }, () => {
            this.sortLayers(this.state.layers, sortAlpha);
          });
        }
    }
    else{
      this.setState({ layers: layers }, () => {
        this.sortLayers(this.state.layers, sortAlpha);
      });
    }
    
  };

  // isVisibleFromConfig()
  sortByAlphaCompare(a, b) {
    if (a.displayName < b.displayName) {
      return -1;
    }
    if (a.displayName > b.displayName) {
      return 1;
    }
    return 0;
  }
//BLI:sort by drawindex(display priority)
  sortByIndexCompare(a, b) {
    if (a.drawIndex > b.drawIndex) {
      return -1;
    }
    if (a.drawIndex < b.drawIndex) {
      return 1;
    }
    return 0;
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
      if (sortAlpha) newLayers.sort(this.sortByAlphaCompare);
      else newLayers.sort(this.sortByIndexCompare);

      let allLayers = this.state.allLayers;
      allLayers[this.props.group.value] = newLayers;

      this.setState({ layers: newLayers, allLayers: allLayers }, () => {
        window.allLayers = this.state.allLayers;
        if (callback !== undefined) callback();
      });
    }
  };

  // REFRESH IF PROPS FROM PARENT HAVE CHANGED - GROUPS DROP DOWN CHANGE.
  componentWillReceiveProps(nextProps) {
    //The nextProps.group is going to display; the "this.props.group" is a current group displayed.
    let allLayers = this.state.allLayers;
    if(nextProps===null || nextProps.group===undefined) return;
    const nextLayers = allLayers[nextProps.group.value];
    if (nextProps.sortAlpha !== this.props.sortAlpha) {
      this.sortLayers(this.state.layers, nextProps.sortAlpha);
    }

    if (nextProps.group.value !== this.props.group.value) {
      const layers = this.state.allLayers[this.props.group.value];
       this.refreshLayers(nextProps.group, nextProps.sortAlpha,nextProps.allGroups);
    }
  }

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
    this.setState(
      {
        layers: arrayMove(layers, oldIndex, newIndex)
      },
      () => {

          // TOCHelpers.updateLayerIndex(this.state.layers, newLayers => {
          //   let allLayers = this.state.allLayers;
          //   allLayers[this.props.group.value] = newLayers;
          //   this.setState({ layers: newLayers, allLayers: allLayers });
          // });
          WMSControl.swapLayers(this.state.layers,oldIndex,newIndex);
      }
    );

    document.getElementById(this.virtualId).scrollTop += this.lastPosition;
  };

  // TRACK CURSOR SO I CAN RETURN IT TO SAME LOCATION AFTER ACTIONS
  onSortMove = e => {
    this.lastPosition = document.getElementById(this.virtualId).scrollTop;
  };

  // LEGEND FOR EACH LAYER
  onLegendToggle = layerInfo => {
    this.legendVisiblity(layerInfo);
  };

  // TOGGLE LEGEND
  legendVisiblity = (layerInfo, forceAll) => {
    this.lastPosition = document.getElementById(this.virtualId).scrollTop;

    let showLegend = !layerInfo.showLegend;
    if (forceAll !== undefined) {
      if (forceAll === "OPEN") showLegend = true;
      else if (forceAll === "CLOSE") showLegend = false;
    }

    if (layerInfo.legendImage === null) {
      TOCHelpers.getBase64FromImageUrl(layerInfo.styleUrl, (height, imgData) => {
        const rowHeight = showLegend ? (height += 36) : 30;
        this.setState(
          {
            // UPDATE LEGEND
            layers: this.state.layers.map(layer =>
              layer.name === layerInfo.name ? Object.assign({}, layer, { showLegend: showLegend, height: rowHeight, legendHeight: height, legendImage: imgData }) : layer
            )
          },
          () => {
            document.getElementById(this.virtualId).scrollTop += this.lastPosition;
            let allLayers = this.state.allLayers;
            allLayers[this.props.group.value] = this.state.layers;
          }
        );
      });
    } else {
      const rowHeight = showLegend ? layerInfo.legendHeight : 30;
      this.setState(
        {
          // UPDATE LEGEND
          layers: this.state.layers.map(layer => (layer.name === layerInfo.name ? Object.assign({}, layer, { showLegend: showLegend, height: rowHeight }) : layer))
        },
        () => {
          document.getElementById(this.virtualId).scrollTop += this.lastPosition;
          let allLayers = this.state.allLayers;
          allLayers[this.props.group.value] = this.state.layers;
        }
      );
    }
  };

  // CHECKBOX FOR EACH LAYER (BLI: visibility change)
  onCheckboxChange = layerInfo => {
    this.lastPosition = document.getElementById(this.virtualId).scrollTop;
    const visible = !layerInfo.visible;
    //if the layer self is added into the openlayer map
    if(layerInfo.olLayer&&layerInfo.olLayer!==undefined){
      if(!layerInfo.addedToMap) {
        layerInfo.addedToMap = true;
        let newDisLayer= {
            displayName:layerInfo.displayName,
            visible:true,
            olLayer:layerInfo.olLayer.olLayer,
            olSource:layerInfo.olLayer.olSource};
        OLControl.olAddLayerToView(newDisLayer,false,layerInfo.sourceType);
      }
      Util.setOLLayerVisible({visible:visible,olLayer:layerInfo.olLayer.olLayer});
    }
    //check the parent layer
    else if(layerInfo.parentLayer)
    {
        // FETCH THE open layer object of top layer
        const getTopOLLayer = (layerInfo) => {
          let parent=layerInfo;
          if(layerInfo.parentLayer!==undefined) {
            parent=getTopOLLayer(layerInfo.parentLayer);
          }
          return parent;
        }
        
        let topLayer= getTopOLLayer(layerInfo);
        let source=topLayer.olLayer.olSource;
        let params=source!==undefined?source.getParams():null;
        let layerList= params?params['LAYERS']:null;

        if(!visible && layerList && layerList.length>0)
        {
          let count=0;
          //remove layer from the list;
          for(let i=0;i<layerList.length;i++) {
            if(WMSControl.sameString(layerList[i],layerInfo.name)){
              layerList.splice(i,1); i--;
              break;
            }
          }
        }
        else if(visible)
        {
          if(layerList===undefined) {
            layerList=[layerInfo.name];
          }
          else {
            let find =false;
            for(let i=0;i<layerList.length;i++)
            {
              if(WMSControl.sameString(layerList[i],layerInfo.name)){
                find=true;
                break;
              }
            }
            if(find===false){
              layerList.push(layerInfo.name);
            }
          }
        }   
        OLControl.olUpdateSourceParams(source,OLControl.OL_SRC_PARAM_TYPE.LAYERS,layerList);

        if(!topLayer.addedToMap) {
          topLayer.addedToMap = true;
          let newDisLayer= {
              displayName:topLayer.label,
              visible:true,
              olLayer:topLayer.olLayer.olLayer,
              olSource:topLayer.olLayer.olSource};
          OLControl.olAddLayerToView(newDisLayer,false,layerInfo.sourceType);
        }
        else if(topLayer.addedToMap && layerList.length===0) {
          //remove it from the display list;
          topLayer.addedToMap = false;
          let newDisLayer= {
            displayName:topLayer.label,
            visible:false,
            olLayer:topLayer.olLayer.olLayer,
            olSource:topLayer.olLayer.olSource};
          OLControl.olRemoveLayerFromView(newDisLayer);
        }
        Util.setOLLayerVisible({visible:(layerList.length===0)?false:true,olLayer:topLayer.olLayer.olLayer});
    }
    layerInfo.visible=visible;
    this.setState(
      {
        // UPDATE LEGEND
        layers: this.state.layers.map(layer => (layer.name === layerInfo.name ? Object.assign({}, layer, { visible: visible }) : layer))
      },
      () => {
        document.getElementById(this.virtualId).scrollTop += this.lastPosition;
        let allLayers = this.state.allLayers;
        allLayers[this.props.group.value] = this.state.layers;
      }
    );
  };

  // OPACITY SLIDER FOR EACH LAYER
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
        WMSControl.olMap_goto(window.map,layerInfo.geoExtent, layerInfo.maxScale);

    } else if (action === "sc-floating-menu-deletion") { 
      helpers.showMessage("Deletion", "Coming Soon!");
      //BLI: the code here to remove the current layer from the map
    } else if (action === "sc-floating-menu-download") {
      helpers.showMessage("Download", "Coming Soon!");
      // TOCHelpers.getLayerInfo(layerInfo, result => {
      //   if (result.featureType.name === "Assessment Parcel") helpers.showMessage("Download", "Parcels are not available for download");
      //   else {
      //     if (helpers.isMobile()) {
      //       window.emitter.emit("setSidebarVisiblity", "CLOSE");
      //       helpers.showURLWindow(TOCConfig.layerDownloadURL + result.featureType.fullUrl, false, "full");
      //     } else helpers.showURLWindow(TOCConfig.layerDownloadURL + result.featureType.fullUrl);
      //   }
      // });
    }

    helpers.addAppStat("Layer Options", action);
  };

  toggleAllLegends = type => {
    let showLegend = true;
    if (type === "CLOSE") showLegend = false;

    for (let index = 0; index < this.state.layers.length; index++) {
      const layer = this.state.layers[index];
      let newLayer = Object.assign({}, layer);
      newLayer.showLegend = showLegend;
      setTimeout(() => {
        this.legendVisiblity(newLayer, type);
      }, 30);
    }
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
    if (this.state.layers === undefined) return <div />;

    // FILTER LAYERS FROM SEARCH INPUT
    const layers = this.state.layers.filter(layer => {
      if (this.props.searchText === "") return layer;

      if (layer.displayName.toUpperCase().indexOf(this.props.searchText.toUpperCase()) !== -1) return layer;
    });

    return (
      <div className="sc-toc-layer-container">
        <AutoSizer disableWidth>
          {({ height }) => {
            return (
              <SortableVirtualList
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
                onLegendToggle={this.onLegendToggle}
                onCheckboxChange={this.onCheckboxChange}
                searchText={this.props.searchText}
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

export default Layers;

// SLIDER
const SliderWithTooltip = createSliderWithTooltip(Slider);
