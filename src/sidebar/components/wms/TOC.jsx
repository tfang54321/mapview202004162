// REACT
import React, { Component } from "react";
import ReactDOM from "react-dom";
import ReactTooltip from "react-tooltip";
import Select from "react-select";
import "rc-slider/assets/index.css";
import Switch from "react-switch";
import { isMobile } from "react-device-detect";

// CUSTOM
import "./TOC.css";
import * as helpers from "../../../helpers/helpers";
import * as TOCHelpers from "./TOCHelpers.jsx";
import Layers from "./Layers.jsx";
import FloatingMenu, { FloatingMenuItem } from "../../../helpers/FloatingMenu.jsx";
import { Item as MenuItem } from "rc-menu";
import Portal from "../../../helpers/Portal.jsx";
import * as WMSControl from "./wmsLayerControl";
import uuid from 'react-uuid';
import Containers from './Containers';
import { all } from "q";



class TOC extends Component {
  constructor(props) {
    super(props);
    this.storageMapDefaultsKey = "map_defaults";
    this.state = {
      layerGroups: [], //all available layer groups
      selectedGroup: {}, //current selected group it should be one of item in "layerGroups"
      isLoading: false,  
      showLoadingSym: false,
      searchText: "",
      sortAlpha: this.getInitialSort(), //function to sort item of each group
      allLayersOn: false,//turn on all layers in the selected list
      defaultGroup: undefined,
      layerCount: 0,
      newURLStr:"",
      urlsLoaded:[]

           
    };


    // LISTEN FOR LAYERS TO LOAD
    window.emitter.addListener("layersLoaded", numLayers => this.onLayersLoad(numLayers));

    // LISTEN FOR SEARCH RESULT
    window.emitter.addListener("activeTocLayerGroup", (groupName, callback) => this.onActivateLayer(groupName, callback));
  }

  onActivateLayer = (groupName, callback) => {
    const remove_underscore = name => {return helpers.replaceAllInString(name, "_", " ");}
    window.emitter.emit("setSidebarVisiblity", "OPEN");
    window.emitter.emit("activateTab", "layers");

    this.state.layerGroups.forEach(layerGroup => {
      if (layerGroup.value === groupName) {
        this.setState({ selectedGroup: layerGroup }, () => callback());
        return;
      }
    });
  };

  onLayersLoad = numLayers => {
    if (this.state.layerCount !== numLayers) this.setState({ layerCount: numLayers });
  };

  getInitialSort = () => {
    if (isMobile) return true;
    else return false;
  };

  componentDidMount() {
    this.refreshTOC();
    window.emitter.addListener("startLoadingSym", () =>this.loadSymbalOn());
    window.emitter.addListener("stopLoadingSym", () =>this.loadSymbalOff());
  }

  refreshTOC = callback => {
      sessionStorage.removeItem(this.storageMapDefaultsKey); 
  };
  onGroupDropDownChange = selectedGroup => {
    let selectedLayers=selectedGroup.layers?selectedGroup.layers:selectedGroup.sublayers;
    let allLayersOn = WMSControl.isAllLayersOn(selectedLayers);
    this.setState({ selectedGroup: selectedGroup,allLayersOn:allLayersOn });
    //update the visibility of selected group
      setTimeout(() => {
      if(allLayersOn===true){
        this.layerRef.turnOnLayers();
      }
    }, 100);
  };

  onSearchLayersChange = evt => {
    const searchText = evt.target.value;
    this.setState({ searchText: searchText });
  };

  onURLStringChange = evt => {
    const urlString = evt.target.value;
    this.setState({ newURLStr: urlString });
  };

  onSortSwitchChange = sortAlpha => {
    this.setState({ sortAlpha: sortAlpha });

    if (sortAlpha) {
      helpers.showMessage("Sorting", "Layer re-ordering disabled.", "gray");
    }

    helpers.addAppStat("TOC Sort", sortAlpha);
  };

  onAllLayersVisibilityChange = allLayersOn => {
    // const selectedGroup = this.state.selectedGroup;
    this.setState({ allLayersOn: allLayersOn}, () => {
      setTimeout(() => {
        if(allLayersOn===false){
          this.layerRef.turnOffLayers();
        }
        else{
          this.layerRef.turnOnLayers();
        }
      }, 100);
    });

    if (allLayersOn) {
      //debug infor
      helpers.showMessage("Layers", "Turned On for all current listed layers.", "gray");
    }

    helpers.addAppStat("TOC DefaultLayersOn", allLayersOn);
  };

  reset = () => {
    
    const defaultGroup = this.state.defaultGroup;
    this.setState({ sortAlpha: false, selectedGroup: defaultGroup }, () => {
      this.refreshTOC(() => {
        setTimeout(() => {
          this.layerRef.resetLayers();
        }, 100);
      });
    });

    helpers.addAppStat("TOC Reset", "Button");
  };

  onToolsClick = evt => {
    var evtClone = Object.assign({}, evt);
    const menu = (
      <Portal>
        <FloatingMenu key={helpers.getUID()} buttonEvent={evtClone} item={this.props.info} onMenuItemClick={action => this.onMenuItemClick(action)} styleMode="right" yOffset={90}>
          <MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-expand">
            <FloatingMenuItem imageName={"plus16.png"} label="Expand Layers" />
          </MenuItem>
          <MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-collapse">
            <FloatingMenuItem imageName={"minus16.png"} label="Collapse Layers" />
          </MenuItem>
          <MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-visility">
            <FloatingMenuItem imageName={"layers-off.png"} label="Turn off Layers" />
          </MenuItem>
          <MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-legend">
            <FloatingMenuItem imageName={"legend16.png"} label="Show Legend" />
          </MenuItem>
        </FloatingMenu>
      </Portal>
    );

    ReactDOM.render(menu, document.getElementById("portal-root"));
  };

  onMenuItemClick = action => {
    if (action === "sc-floating-menu-expand") {
      this.layerRef.toggleAllLegends("OPEN");
    } else if (action === "sc-floating-menu-collapse") {
      this.layerRef.toggleAllLegends("CLOSE");
    } else if (action === "sc-floating-menu-legend") {
      helpers.showMessage("Legend", "Coming Soon");
    } else if (action === "sc-floating-menu-visility") {
      this.layerRef.turnOffLayers();
    }

    helpers.addAppStat("TOC Tools", action);
  };

  onSaveClick = () => {
    this.layerRef.saveLayerOptions();
  };

  // loadWMSLayer = callback => {
    loadWMSLayer = callback => {
    //BLI:This is used to load the wms layers based on the specified wms url.
     sessionStorage.removeItem(this.storageMapDefaultsKey); 
      let geoserverUrl= this.state.newURLStr;
      let curWMSList= this.state.urlsLoaded;
      window.emitter.emit("layersLoaded");
      if(geoserverUrl.toLowerCase().indexOf("getcapabilities")===-1 )
      {
        geoserverUrl +='?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities';             
      }
      window.emitter.emit("startLoadingSym");
      WMSControl.getWMSLayerGroupList(geoserverUrl,"root" ,result => {
        const groupInfo = result;
        //keep the new URLs;
        if(result===null)
        {
          window.emitter.emit("stopLoadingSym");
          let msg=`"${this.state.wmsNewURL}"`+window.appConfig.wms_loadingErr_invalid;
          helpers.showMessage(window.appConfig.wms_Load,msg,'gray', 20000);
          return;
        }

     
        let allLayerGroups=this.state.layerGroups;
        curWMSList.push(geoserverUrl);
        //Keep all new wms groups
        groupInfo[0].forEach(element => {
          allLayerGroups.push(element);
        });
        //udate all layers (for DEMO purpose)
        let newDefault= groupInfo[1]!==undefined?groupInfo[1]:this.state.defaultGroup;
        let newSelectedGrp= groupInfo[1]!==undefined?groupInfo[1]:this.state.selectedGroup;
     
            
        this.setState( 
          {

           
            isloading:false,
            urlsLoaded: curWMSList,
            layerGroups:allLayerGroups,
            selectedGroup: newSelectedGrp,
            defaultGroup: newDefault
          },
          () => { //callback
            //wms layer query completed
              window.emitter.emit("stopLoadingSym");
              if (callback !== undefined)
              {
                 callback(); 
                            
              } 
            }
        );
      });
  };
  //BLI: show loading symbole
  loadSymbalOn=()=>{
    this.setState({showLoadingSym:true });
  };
  //BLI: show loading symbole
  loadSymbalOff=()=>{
    this.setState({showLoadingSym:false });
  };
  onLoadInfoFromURL=()=> {
    let newURL=this.state.newURLStr;
    //BLI:Debug purpose only
    if(window.appConfig.BLI_Under_Dev.Dev_useDebugURL && 
      window.appConfig.BLI_Under_Dev.Dev_debug_wmsURL && newURL.length<1)
    {
      this.setState({newURLStr:window.appConfig.BLI_Under_Dev.Dev_debug_wmsURL}, ()=>{
      this.loadWMSLayer();
      });
      return;
    }
    //end of debugging
    if (newURL.length<4) 
    {
      let mesg=`"${newURL}" `+ window.appConfig.wms_loadingErr_invalid
      helpers.showMessage(window.appConfig.wms_Load, mesg);
      return;
    }
    else 
    {
      let curUrlList= this.state.urlsLoaded;
      let isNewUrl=true;
      if(newURL.toLowerCase().indexOf("getcapabilities")===-1 )
      {
        newURL +='?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities';             
      }
      //check if it has been loaded
      curUrlList.forEach(ele=>{
        if(String(newURL).toLowerCase() === String(ele).toLowerCase())
        {
          isNewUrl=false;
          return;
        }
      });
      if(isNewUrl===false)
      {
        let mesg=`"${newURL}" `+ window.appConfig.wms_loadingErr_dup
        helpers.showMessage(window.appConfig.wms_Load, mesg);
        return;
      }
    }
    //load this wms layers
    this.loadWMSLayer();
  }



  render() {
    
  
   
    const groupsDropDownStyles = {
      control: provided => ({
        ...provided,
        minHeight: "30px"
      }),
      indicatorsContainer: provided => ({
        ...provided,
        height: "30px"
      }),
      clearIndicator: provided => ({
        ...provided,
        padding: "5px"
      }),
      dropdownIndicator: provided => ({
        ...provided,
        padding: "5px"
      })
    };  

    let content=null;
   {

    console.log("content in toc.jsx..layergroup"+   this.state.layerGroups);
    console.log("content in toc.jsx..selectgroup"+   this.state.selectedGroup);
  
      content = (
        <div>
          {/* this div is used to show the loading symbol */}
        <div className={this.state.showLoadingSym ? "sc-toc-main-container-loading" : "sc-toc-main-container-loading sc-hidden"}>
          <img className="sc-toc-loading" src={images["loading.gif"]} alt="loading" />
        </div>

        <div className={this.state.isLoading ? "sc-toc-main-container sc-hidden" : "sc-toc-main-container"}>
          {/**BLI add the loading WMS option */} 
          {/* <div className="sc-toc-wms-load-container" onKeyDown={evt => {if (evt.key === "Enter") console.log(this);}} > */}
          <div className="sc-toc-wms-load-container" >
            <input id="sc-toc-wms-load-textbox" className="sc-toc-wms-load-textbox" placeholder={"Get Capability URL..."} onChange={this.onURLStringChange} />
            <div data-tip="Load new layers" data-for="sc-toc-wms-load-tooltip" className="sc-toc-wms-load-image" onClick={this.onLoadInfoFromURL}>
              <ReactTooltip id="sc-toc-wms-load-tooltip" className="sc-toc-wms-load-tooltip" multiline={false} place="right" type="dark" effect="solid" />
            </div>
          </div>
          {/**End of loading WMS */}
          {/* <div className="sc-toc-search-container">
            <input id="sc-toc-search-textbox" className="sc-toc-search-textbox" placeholder={"Filter (" + this.state.layerCount + " layers)..."} onChange={this.onSearchLayersChange} />
            <div data-tip="Save Layer Visibility" data-for="sc-toc-save-tooltip" className="sc-toc-search-save-image" onClick={this.onSaveClick}>
              <ReactTooltip id="sc-toc-save-tooltip" className="sc-toc-save-tooltip" multiline={false} place="right" type="dark" effect="solid" />
            </div>
          </div> */}

      {/* /    <div className="sc-toc-groups-container"> */}
            {/* <div id="sc-toc-groups-dropdown" title="Click here for more layers">
              <Select
                styles={groupsDropDownStyles}
                isSearchable={false}
                onChange={this.onGroupDropDownChange}
                options={this.state.layerGroups}
                value={this.state.selectedGroup}
                placeholder="Click Here for more Layers..."
              />
            </div> */}


            <div>

  <Containers   containers={this.state.containers} 
              layerRef={this.layerRef} 
              group={this.state.selectedGroup}
              searchText={this.state.searchText}
              sortAlpha={this.state.sortAlpha}
              allGroups={this.state.layerGroups}
              
              />



            
          </div>
        

          <div className="sc-toc-footer-container">
            <label className={this.state.sortAlpha ? "sc-toc-sort-switch-label on" : "sc-toc-sort-switch-label"}>
              Sort A-Z
              <Switch className="sc-toc-sort-switch" onChange={this.onSortSwitchChange} checked={this.state.sortAlpha} height={20} width={48} />
            </label>
            &nbsp;
            <label className={this.state.allLayerOn ? "sc-toc-layersOn-switch-label on" : "sc-toc-layersOn-switch-label"}>
              All on
              <Switch className="sc-toc-layersOn-switch"  onChange={this.onAllLayersVisibilityChange} checked={this.state.allLayersOn} height={20} width={48} />
            </label>
             {/* &nbsp;
            <button className="sc-button sc-toc-footer-button" onClick={this.reset}>
              Reset
            </button> */}
           {/*  &nbsp;
            <button className="sc-button sc-toc-footer-button tools" onClick={this.onToolsClick}>
              Additional Tools
            </button> */}
          </div>
        </div>
      </div>    
      );
    }
    return content;
  }


  // markComplete = (id,containerName,group,allGroups) => {
  //   let layers = [];
  
  //   this.setState({
  //     containers: this.state.containers.map(todo => {
      
  //       if (todo.id === id) {
        

  //         if (todo.layers.length > 0) {
  //           todo.layers = "";
  //         } else {
  //           // todo.layers = this.renderSwitch(containerName);
  //           todo.layers = this.state.layers;
  //         }
  //       }
  //       return todo;
  //     })
  //   });
  // };

  // renderSwitch(param) {
  //   switch (param) {
  //     case "canvec : All Hydro Features":
  //       return this.state.layertodos_hydro;
  //     case "canvec: All Man-Made Features":
  //       return this.state.layertodos_man_made;
  //     case "canvec: canvec: All Transport Features":
  //       return this.state.layertodos_transport;
       
  //     case 'GOV Canada - Topographic data of canada':
  //       return this.state.layers;
  //       default:
  //        return this.state.layertodos;
  //   }
  // }

//   getLayers(containerName){

//     let layers = [];
    
//     this.state.layerGroups.map(layerGroup => {
//       layerGroup.layers.map(layer =>{
//        if(containerName === layer.groupName){
//         layers.push(obj);
            
//    }
   
// );   });





//   }

  // getGroupList(){
  // let items=[];
  // // allLayerGroups.forEach(type => {
  // //   const obj = { id:uuid(),containerName: type.label };
  // //   items.push(obj);
  // // });
  // let layers = this.state.layerGroups
  // this.state.layerGroups.map(layerGroup => {
  //        layerGroup.layers.map(layer =>{
  //         const obj = layer.groupName ;
  //         items.push(obj);
               
  //     }
      
  //  );   });

  //      let items3=[];
  //     let items2= Array.from(new Set(items));
  //     items2.forEach(mm =>{
  //       const obj = {id:uuid(), containerName: mm ,layers:'',selectedGroup:'',allLayerGroups:''};
  //       items3.push(obj);
      
  //     });

  //     return items3;
  //   }

  //   getGroupList(){
  //     let items=[];
  //     // allLayerGroups.forEach(type => {
  //     //   const obj = { id:uuid(),containerName: type.label };
  //     //   items.push(obj);
  //     // });
  //     let layers = this.state.layerGroups
  //     this.state.layerGroups.map(layerGroup => {
  //            layerGroup.layers.map(layer =>{
  //             const obj = layer.groupName ;
  //             items.push(obj);
                   
  //         }
          
  //      );   });
    
  //          let items3=[];
  //         let items2= Array.from(new Set(items));
  //         items2.forEach(mm =>{
  //           const obj = {id:uuid(), containerName: mm ,layers:'',selectedGroup:'',allLayerGroups:''};
  //           items3.push(obj);
          
  //         });
    
  //         return items3;
  //       }
    

  
  // getcallback(){

  //   sessionStorage.removeItem(this.storageMapDefaultsKey); 
  //   let geoserverUrl= this.state.newURLStr;
  //   let curWMSList= this.state.urlsLoaded;
  //   if(geoserverUrl.toLowerCase().indexOf("getcapabilities")===-1 )
  //   {
  //     geoserverUrl +='?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities';             
  //   }
  //   // window.emitter.emit("startLoadingSym");
  //   WMSControl.getWMSLayerGroupList(geoserverUrl,"root" ,result => {
  //     const groupInfo = result;
  //     //keep the new URLs;
  //     if(result===null)
  //     {
  //       // window.emitter.emit("stopLoadingSym");
  //       let msg=`"${this.state.wmsNewURL}"`+window.appConfig.wms_loadingErr_invalid;
  //       helpers.showMessage(window.appConfig.wms_Load,msg,'gray', 20000);
  //       return;
  //     }
  //     let allLayerGroups=this.state.layerGroups;
  //     curWMSList.push(geoserverUrl);
  //     //Keep all new wms groups
  //     groupInfo[0].forEach(element => {
  //       allLayerGroups.push(element);
  //     });
  //     //udate all layers (for DEMO purpose)
  //     let newDefault= groupInfo[1]!==undefined?groupInfo[1]:this.state.defaultGroup;
  //     let newSelectedGrp= groupInfo[1]!==undefined?groupInfo[1]:this.state.selectedGroup;
   
          
  //     this.setState( 
        
  //       {
  //         containers:allLayerGroups,
      
  //       },
  //       () => { //callback
  //         //wms layer query completed
  //           window.emitter.emit("stopLoadingSym");
           
  //         }
  //     );

  //    // return allLayerGroups;
  //   });
  // }




}

export default TOC;

// IMPORT ALL IMAGES

const images = importAllImages(require.context("./images", false, /\.(png|jpe?g|svg|gif)$/));
function importAllImages(r) {
  let images = {};
  r.keys().map((item, index) => (images[item.replace("./", "")] = r(item)));
  return images;
}
