import { transform } from "ol/proj.js";
import {olGetLayerAttrib,olSetZIndex} from "./olController";

const Proj_EPSG_3857="EPSG:3857";  //"GOOGLE","EPSG:900913"
const Proj_EPSG_4326="EPSG:4326"; //WGS84
export const DOM_ROW_HEIGHT=30; // HEIGHT OF DOM ROW FOR AUTOSIZER 

//The singleton object to hold the list of open layer object with display properties.
export let Util_SortedArray = (function () {
  /**
   * Item object structure should like:
   * {
   *     displayName:name,
   *     baseOrTopPreLayer: true/false, //the layer for base map or top presentation layer
   *     sourceType:type, // the value should be a enum value defined in OL_SOURCE_TYPE
   *     visible: true/false,
   *     zIndex: zIndexValue,
   *     orig_zIndex: initial zIndex value of a layer
   *     olLayer: layer of openlayers,
   *     height: DOM_ROW_HEIGHT, 
   * }
   */
  var instance;

  var createInstance = function(){
    var localArray = new Array();
    var curIndex=0;
    //This "normalize" should be changed to callback in the future;
    var normalize = function(item) {
      let disName=item.displayName;
      let visible=item.visible;
      let zIndex=item.zIndex;
      let orig_zIndex=item.orig_zIndex;
      let olLayer=item.olLayer;// required
      let height=item.height; 
      if(olLayer===undefined) {
        //invalid item;
        return undefined;
      }
      if(disName === undefined) {
        item.displayName=olGetLayerAttrib(olLayer,"name");
      }
      if(visible === undefined) {
        item.visible=olGetLayerAttrib(olLayer,"visible");
      }
      if(zIndex === undefined) {
        item.zIndex=olGetLayerAttrib(olLayer,"zIndex");
      }
      if(orig_zIndex === undefined) {
        //set the default value;
        item.orig_zIndex=zIndex;
      }
      if(height === undefined) {
        //set the default value;
        item.height=DOM_ROW_HEIGHT;
      }
      return item;
    }

    var sort = function(ascOrder=false) {
      if(ascOrder===true) {
        //sort the layers based on the zindex value (asc order)
        localArray.sort(function(a,b) {
            return a.zIndex -b.zIndex; });
      }
      else {
          //sort the layers based on the zindex value (desc order)
          localArray.sort(function(a,b) {
          return b.zIndex -a.zIndex; }); 
      }
    }
    // Private method for passing increased value. 
    var push = function( newItem ){
      localArray.push(newItem);
      sort();
    };
    /**
     * Add a new item into the list;
     * @param {Object} newItem 
     */
    var add = function(newItem){
      let item=normalize(newItem);
      
      if(item===undefined) {
        //invalid item;
        return undefined;
      }
      push(item);
      return item;
    }
    var at = function(index) {
      if(index >= localArray.length) {
        return undefined;
      }
      return localArray[index];
    }
    var begin = function() {
      curIndex=0;
      return at(curIndex);
    }

    var next = function() {
      return at(++curIndex);
    }


    //  Private method for returning value of return canPullWeight,
    //  at any point of time, from the one and only existing instance.
    var remove = function(item){
      let normal_Item=normalize(item);
      if(normal_Item.olLayer!==undefined)
      {
        for(let i=0;i<localArray.length;i++) {
          if(localArray[i].olLayer===normal_Item.olLayer) {
            localArray.splice(i,1);
            return;
          }
        }
      }
    };

    let searchZIndex = function (arr, zIndex, sP, eP) {        
        // Base Condition 
        if (sP > eP) return null; 
        // Find the middle index 
        let mid=Math.floor((sP + eP)/2); 
      
        // Compare mid with given key x 
        if (arr[mid].zIndex===zIndex) return arr[mid]; 
              
        // If element at mid is greater than x, 
        // search in the left half of mid 
        if(arr[mid].zIndex > zIndex)  
            return searchZIndex(arr, zIndex, sP, mid-1); 
        else      
            // If element at mid is smaller than x, 
            // search in the right half of mid 
            return searchZIndex(arr, zIndex, mid+1, eP); 
    } 
    var find = function(params) {
      let name=params.name;
      let olLayer=params.olLayer;
      let zIndex=params.zIndex;
      if(name !== undefined && name.length>0) {
        localArray.find(function(it){
          if(it.displayName.toLowerCase() === name.toLowerCase()){
              return it;
          }
        });
      }
      else if(olLayer !== undefined) {
        localArray.find(function(it){
          if(it.olLayer === olLayer){
              return it;
          }
        });
      }
      else if(zIndex !== undefined && zIndex>0) {
         return searchZIndex(localArray,zIndex,0,localArray.length-1);
      }
      return null;
    };
    
    var findByName = function(displayName){
      find({name:displayName});
    };
    var findByZIndex = function(index){
      find({zIndex:index});
    };
    var findByOLLayer = function(layer){
      find({olLayer:layer});
    };

    return {
      // returns increaseEnergy method which is a 
      // closure with access to private properties.
      remove: remove,
      add: add,
      begin: begin,
      next: next, //The begin has to be called first before calling next
      at: at,
      sort:sort,
      findByName:findByName,
      findByZIndex:findByZIndex,
      findByOLLayer:findByOLLayer,
    };
  };
  return {
      getArray: function () {
          if (!instance) {
              instance = createInstance();
          }
          return instance;
      }
  };
})();

//get the home location at [lat, lon] format;
export function getHomeLocation()
{
  return window.appConfig.homeLocaiton_lonLat;
}
//set the home location at [lat, lon] format;
export function setHomeLocation(lonLatPos)
{
  window.appConfig.homeLocaiton_lonLat=lonLatPos;
}
//return the world position based on the "EPSG:3857" projection
export function getHomeLocationInWorld()
{
  let geoPos= [window.appConfig.homeLocaiton_lonLat[0],window.appConfig.homeLocaiton_lonLat[1]];
  return transform(geoPos, Proj_EPSG_4326, Proj_EPSG_3857);
}
// GLOW CONTAINER (change the bounding box color of a f)
export function glowContainer(id, color = "blue") {
  const elem = document.getElementById(id);
  if (elem === undefined) return;

  const className = "sc-glow-container-" + color;
  elem.classList.add(className);
  setTimeout(function() {
    elem.classList.remove(className);
  }, 1000);
}

// GET CURRENT MAP SCALE
export function getMapScale() {
  const DOTS_PER_INCH = 96;
  const INCHES_PER_METER = 39.37;
  var resolution = window.map.getView().getResolution();
  var projection = window.map.getView().getProjection();
  const pointResolution = projection.getMetersPerUnit() * resolution;
  return Math.round(pointResolution * DOTS_PER_INCH * INCHES_PER_METER);
}

/**
 * Get all layers added into the view .
 * Note: the layer with higher display priority will be on the top of list;
 *  
 */
export function getOLDisplayList()
{
  let objList=[];
  if(window.displayLayers)
  {
    let item=window.displayLayers.begin();
    let i=0;
    while(item!==undefined)
    {
      //Because the list of "window.displayLayers" is sort by zIndex with ASC order,
      //the "add" is used to return the list
      if(item.baseOrTopPreLayer===false) {
         //ignore the base map and top presentation layer
         objList.push(item);
      }
       item=window.displayLayers.next();
    }
  }
  return objList;
}
export function setOLLayerVisible(disObj)
{
  /** set the visibility of a display layer object
  * The basic structure of display layer object is:
  * {displayName:name,
  *  baseOrTopPreLayer:true/false
  *  visible: true/false,
  *  zIndex: zIndexValue (current value)
  *  orig_zIndex: initial value of zIndex,
  *  olLayer: layer of openlayers,
  *  height: dom_Row_height, 
  * }
  */
  if (disObj!== undefined) {
    disObj.olLayer.setVisible(disObj.visible);
    window.map.render();
  }
}
export function switchOrderOfDisplayObjs(disObj1,disObj2)
{
    /** set the visibility of a display layer object
    * The basic structure of display layer object is:
    * {displayName:name,
    *  baseOrTopPreLayer:true/false
    *  visible: true/false,
    *  zIndex: zIndexValue (current value)
    *  orig_zIndex: initial value of zIndex,
    *  olLayer: layer of openlayers,
    *  height: dom_Row_height, 
    * }
    */
  if (disObj1 && disObj2 &&
      disObj1!== undefined &&
      disObj1!== undefined ) {
        let zIndex1=disObj1.zIndex;
        let zIndex2=disObj2.zIndex;
        disObj1.zIndex=zIndex2;
        disObj2.zIndex=zIndex1; 
        olSetZIndex(disObj1.olLayer,disObj1.zIndex);
        olSetZIndex(disObj2.olLayer,disObj2.zIndex);
        window.displayLayers.sort();
  }
}


 