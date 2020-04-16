import * as helpers from "../../../helpers/helpers";
import $ from 'jquery';
//openlayers
import oLWMSCapabilities from 'ol/format/WMSCapabilities';
import JsonParser from '../../..//utilities/JsonParser';
import OlTileWMSSource from 'ol/source/TileWMS';
import OlTileLayer  from 'ol/layer/Tile';
import {transformExtent,fromLonLat} from 'ol/proj';
import * as OLControl from '../../../utilities/olController'
import {DOM_ROW_HEIGHT} from "../../../utilities/utilities"

const wmsTopLayerTag="TopLayer:";
let wmsCount=1;
let wmsTopLayerCount=1; //this account is used to set the zIndex for display priority in OpenLayers Map
const layerZIndexInc=100;
const type_wmsFeature=1;
const type_wmsContainer=2;
const type_wmstopLayer=3;
const dom_Row_height=DOM_ROW_HEIGHT; // HEIGHT OF DOM ROW FOR AUTOSIZER 
const WMS_Min_Resolution=0;
const WMS_Max_Resolution=36864000; //Range for Entire world 

function getZoomLevel(scaleVaule) {
  let zoomLevelLookup={
    "1": 500000000,
    "2":250000000,
    "3":150000000,
    "4":70000000,
    "5":35000000,
    "6":15000000,
    "7":10000000,
    "8":4000000,
    "9":2000000,
    "10":1000000,
    "11":500000,
    "12":250000,
    "13":150000,
    "14":70000,
    "15":35000,
    "16":15000,
    "17":8000,
    "18":4000,
    "19":2000,
    "20":1000,
    "21":500
  }
  for(let i=1;i<22;i++){
    let value=zoomLevelLookup[i];
    if(value<scaleVaule) {
      return i-1;
    }
  }
  return 21;
}

//To add (or remove) the wms layer into (or from) the view window
/**
 * Control the wms layer in the openlayers map view
 * @param {{displayName,visible,olLayer,olSource}} myLayer
 * @param {Boolean} add //flag to determine adding map or remove map
 * @param {Int} zIndex //the Display priority of the layer
 */
function controlLayerInMap( myLayer,add=false,zIndex=-1)
{
  let priority=zIndex===-1?wmsTopLayerCount:zIndex; 
  if(!myLayer || myLayer===undefined) return;
  
  myLayer.olLayer.setVisible(add);
  let name = myLayer.olLayer.get('name');
  if(add) {
    OLControl.olAddLayerToView(myLayer,false,OLControl.OL_SOURCE_TYPE.WMS,priority);
    wmsTopLayerCount++;
    window.emitter.emit("resetDisplayLayerList",null,[name]);
  }
  else {
    OLControl.olRemoveLayerFromView(myLayer);
    window.emitter.emit("resetDisplayLayerList",[name],null);
  }
}

export function isWMSTopLayer(layer)
{
  if(layer && layer.type !== undefined){
    if(layer.type===type_wmstopLayer) {
      return true;
    }
  }
  return false;
}
export function isWMSFeature(layer)
{
  if(layer && layer.type !== undefined){
    if(layer.type===type_wmsFeature) {
      return true;
    }
  }
  return false;
}
// HTTP GET (NO WAITING)
function localHTTPFetch(url, custom_config,callback) {
  // return fetch(url,{mode: 'no-cors'})
  if(custom_config) {
   return fetch(url,custom_config).then(response => response.text())
     .then(responseText => {
       // CALLBACK WITH RESULT
       if (callback !== undefined) callback(responseText);
     })
     .catch(error => {
       console.error(error);
       if (callback !== undefined) callback(error);
     });
    }
    else{
      return fetch(url).then(response => response.text())
         .then(responseText => {
           // CALLBACK WITH RESULT
           if (callback !== undefined) callback(responseText);
         })
         .catch(error => {
           console.error(error);
           if (callback !== undefined) callback(error);
         });
    }
 }

function getLayerProps(json_obj_arrary,orderedKeys)
{
  if(json_obj_arrary && orderedKeys && orderedKeys.length>0){
      let result=json_obj_arrary;
      let tempData=json_obj_arrary;
      let jsonParser=new JsonParser({caseSensitive: false,allLevel: true,objOnly:true});

      $.grep(orderedKeys,function(value,index){
        let result1 = jsonParser.findInObj(result,{value});
        result = (result1&&result1.length>0)?result1:result;
      });
      return result;
  }
  return null;
}


/** Create WMS Tile Layer with the ol source object
 * @sourceInfor array of objects of {key:'name",value:"value"} format
 * @serverURLs string arrary,
 * @layerName  the name of the open layer object
 * @ext the extent of the open layer object
 * @returns {olLayer,olSource}
*/
export function getWMSTileLayer(serverURLs, layerName,sourceInfor=null,ext=null) 
{
  let olLayer=null;
  let olSource=null;
  if(sourceInfor && sourceInfor.length>0){ //for feature layer of WMS 
    let sourceName =null;
    let attribs=null;
    let minScaleDenominator =WMS_Min_Resolution;
    let maxScaleDenominator = WMS_Max_Resolution;
    for(let i in sourceInfor) {
      if(sameString(sourceInfor[i].key,'name'))  sourceName=sourceInfor[i].value;
      else if(sameString(sourceInfor[i].key,'minscaledenominator'))  minScaleDenominator=sourceInfor[i].value;
      else if(sameString(sourceInfor[i].key,'maxscaledenominator'))  maxScaleDenominator=sourceInfor[i].value;
      else if(sameString(sourceInfor[i].key,'attribution'))  attribs=sourceInfor[i].value;
    }
    if(sourceName===null)
    {
      sourceName=layerName;
    }
    olSource = new OlTileWMSSource({
       // attributions: attribs,
        //we always try urls for WMS
        urls: serverURLs,
        params: {'LAYERS': [sourceName]/*'nexrad_base_reflect'*/}
        });
    olLayer= new OlTileLayer({
          name: layerName?layerName:sourceName,
          ///take the default extent from source
         // extent: ext!==null?ext:null,
          source: olSource
      });
    }
    else { //For top layer of WMS
      olSource =  new OlTileWMSSource({
        //we always try urls for WMS
        urls: serverURLs,
        });
      olLayer= new OlTileLayer({
        name: layerName,
       //take the default extent from source
        //extent: ext!==null?ext:null
        source: olSource
    });
  }
  //The openlayers source is kept here is for the performance purpose.(it is optional and
  //it can be removed in the future without performance impact)
  return {olSource,olLayer};
}


function createWMSBottomLayer(parentLayer,layer,sourceInfor,commonInfor,outputList)
{
    let layerNameOnly = layer.Name;
    let wmsurl =commonInfor.urls;
    let layerZIndex=commonInfor.layerZIndex;
    let layerTitle = layer.Title;
    if (layerTitle === undefined) layerTitle = layerNameOnly;
    const keywords = layer.KeywordList=== undefined?null:layer.KeywordList[0].Keyword;
    let styeURLs=[];
    let legendHeights=[];
    let legendWidth=[];
    if(layer.Style !== undefined && layer.Style[0].LegendURL !==undefined)
    {
      let i=0;
      layer.Style.forEach(element => {
        legendHeights.push(element.LegendURL[0].size[1]);
        legendWidth.push(element.LegendURL[0].size[0]);
        styeURLs.push(element.LegendURL[0].OnlineResource);
      });
    }
    let geoExtent=layer.EX_GeographicBoundingBox;
    if(geoExtent===undefined && parentLayer.EX_GeographicBoundingBox){
      geoExtent=parentLayer.EX_GeographicBoundingBox;
    }
    // // OPACITY
    let opacity = layer.opaque===undefined?false:layer.opaque;
    let minScale = (layer.MinScaleDenominator===null || layer.MinScaleDenominator===undefined)?
                      WMS_Min_Resolution:layer.MinScaleDenominator;
    let maxScale = (layer.MaxScaleDenominator===null || layer.MaxScaleDenominator===undefined)?
                      WMS_Max_Resolution:layer.MaxScaleDenominator;
    let olLayerObj=null;
    if(window.appConfig.WMSTopOLLayerOnly === false)
    {
      //create the display layer for each bottom feature
      let layerSourceInfor=[{key:"minscaledenominator",value:minScale},
                       {key:"maxscaledenominator",value:maxScale}];
      olLayerObj = getWMSTileLayer(wmsurl, layerNameOnly,layerSourceInfor,geoExtent);
    }
    //get the world box for feature zoom
    //const extent = [boundingBox.minx, boundingBox.miny, boundingBox.maxx, boundingBox.maxy];
    const returnLayer = {
        sourceType: OLControl.OL_SOURCE_TYPE.WMS,
        type:type_wmsFeature,       //the object type 
        layerLevel:commonInfor.layerLevel, //the layer level from  top layer (starting from 0)
        name: layerNameOnly, // FRIENDLY NAME
        height: dom_Row_height, // HEIGHT OF DOM ROW FOR AUTOSIZER 
        drawIndex: layerZIndex, // INDEX USED BY VIRTUAL LIST (used for display priority and feature list on the side bar)
        index: layerZIndex, // INDEX USED BY VIRTUAL LIST (BLI: Keep as original position)
        styleUrl: styeURLs.length>0?styeURLs:null, // WMS URL TO LEGEND SWATCH IMAGE
        showLegend: false, // SHOW LEGEND USING PLUS-MINUS IN TOC
        legendHeight: legendHeights, // HEIGHT OF IMAGE USED BY AUTOSIZER
        legendImage: null, // IMAGE DATA, STORED ONCE USER VIEWS LEGEND
        visible: false, // LAYER VISIBLE IN MAP, UPDATED BY CHECKBOX
        containOLSource:false,//The determine if "layer" contain both ol layer object and ol source object.(False, "layer" is used for ol layer only)
        // layer: null, // OL LAYER OBJECT (BLI:NOTE: it should be removed in the future)
        addedToMap: false, //true if the openlayer is added in to Openlayer map
        olLayer: olLayerObj,
        metadataUrl: null,// metadataUrl, // ROOT LAYER INFO FROM GROUP END POINT
        opacity: opacity, // OPACITY OF LAYER
        minScale: minScale, //MinScaleDenominator from geoserver
        maxScale: maxScale, //MaxScaleDenominator from geoserver
        liveLayer: null,// liveLayer, // LIVE LAYER FLAG(BLI:NOTE: it should be removed in the future)
        wfsUrl: wmsurl, // BLI: used to requery the feature information (meta data)
        displayName: layerTitle, // DISPLAY NAME USED BY IDENTIFY and dom list row
        addedToMap: false, // flag to determine if the layer has been added into open layer map
        group: parentLayer.name,// group.value,     //parent layer name
        groupName: parentLayer.Title, //group.label  //parent layer
        geoExtent: geoExtent, //BLI: bounding box [minx,miny,maxx,maxy]
        parentLayer:null //BLI: point to parent of current layer
      };
      outputList.push(returnLayer);
}

 /**
 * Build a may layer tree.
 */
function createWMSMapGroup(parent,layerInfor,commonInfor, outputLayerGroups) {
    if($.type(layerInfor)==='object' && commonInfor && commonInfor.urls.length>0) {
        let jsonParser=commonInfor.parser?commonInfor.parser:(commonInfor.parser=new JsonParser({caseSensitive: false,allLevel: false,objOnly:true }));
        let recordRequired=['name','title','EX_GeographicBoundingBox','queryable',
            'MinScaleDenominator','MaxScaleDenominator','attribution'];
        let sourceInfor=jsonParser.findInObj(layerInfor,recordRequired);
        if(sourceInfor.length >0) {
          let layerName=null,layerTitle=null;
          for(let i in sourceInfor) {
            if(String(sourceInfor[i].key).toLocaleLowerCase() ==='name')  layerName=sourceInfor[i].value;
            else if(String(sourceInfor[i].key).toLocaleLowerCase() ==='title')  layerTitle=sourceInfor[i].value;
            else 
            {
              if(layerTitle && layerName)
                 break;
            }
          }
            //check if there is any sub layers
            let recordRequired=['layer'];
            let subLayers=jsonParser.findInObj(layerInfor,recordRequired);
            //keep searching bottom layers
            if(subLayers.length>0){
                let self=this;
                commonInfor.layerLevel++;
                commonInfor.layerZIndex=commonInfor.layerLevel*layerZIndexInc;
                //create the sub map layers
                $.grep(subLayers,function(layer,index){
                let data =layer.value;
                if(data!==null) {
                    if($.type(data)==='object') {
                        let bottomlayers=[];
                        let bottomLayer=createWMSMapGroup(layerInfor,data,commonInfor,bottomlayers);
                        //add the sublayer
                        if(bottomlayers.length>0) {
                            outputLayerGroups.push({name:layerName,title:layerTitle,layerLevel:commonInfor.layerLevel,
                              geoExt:layerInfor.EX_GeographicBoundingBox!== undefined?layerInfor.EX_GeographicBoundingBox:null,
                              leaf:bottomLayer,value:bottomlayers}); 
                        }
                    }
                    else if($.type(data)==='array') {
                        let bottomlayers=[];
                        let keep=false;
                        for(let it in data) {
                          let bottomLayer= createWMSMapGroup(layerInfor,data[it],commonInfor,bottomlayers);
                          keep=keep?keep:bottomLayer;
                       }
                        //add the sublayer
                        if(bottomlayers.length>0) {
                            outputLayerGroups.push({name:layerName,title:layerTitle,layerLevel:commonInfor.layerLevel,
                              geoExt:layerInfor.EX_GeographicBoundingBox!== undefined?layerInfor.EX_GeographicBoundingBox:null,
                              leaf:keep,value:bottomlayers}); 
                        }
                     }
                } 
                });
            }
            else //create the bottom layers
            {
              createWMSBottomLayer(parent,layerInfor,sourceInfor,commonInfor,outputLayerGroups);
              commonInfor.layerZIndex--;
              return true; //return true if it is bottom layer
            }
        }
    }
    return false;
}

/**
 * This function is used to create the layer containers that will be used
 * for visualization. The current version is created based on the WMS services.
 * Note:
 * 1. current implementation is to create group of feature containers and one top container with all features(bottom layers).
 * 2. ToDo: because of current GUI limitation, we only support the container with the features(bottom layers). we don't support hierarchy for
 *    multiple levels of wms sub layers for now. 
 * @param {Object} layerContainer  object array to created based on the wms capability
 * @param {Array} urls            URL string list for getMap feature of wms
 * @param {String} wmsGetCapaUrl   The Url string for get capability
 * @param {Array} outputGroups    output array that contains all detail features as grouped base.
 * @param {Array} outputAllLayers output array that contains all detail features as single list.
 */
function getAllLeafGroups(layerContainer,urls,wmsGetCapaUrl,outputGroups,outputAllLayers)
{
  if(layerContainer){
    if($.type(layerContainer)==='object') {
      if(layerContainer.leaf){
        let sublayers=layerContainer.value;
        let visibleLayerNames=[];
        let tempArray=[];
        //Ceate the Open layer object.
        let newOLLayer= null;//getWMSTileLayer(urls, layerContainer.name,null,layerContainer.geoExt);
        let newContainer ={
          sourceType: OLControl.OL_SOURCE_TYPE.WMS,
          type:type_wmsContainer,
          height: dom_Row_height, // HEIGHT OF DOM ROW FOR AUTOSIZER 
          displayName: layerContainer.title,// dom row list name
          defaultGroup: false, //default group false
          label: layerContainer.title, //container display title
          sublayers: sublayers, //all children layers
          value: layerContainer.name, //the unique name in current WMS service
          visibleLayers:visibleLayerNames,
          urls:urls, //wms getMap url
          wmsGroupUrl:wmsGetCapaUrl, // wms get capability url
          containOLSource:false,//The determine if "layer" contain both ol layer object and ol source object.
                                //(False, "layer" is used for ol layer only). Value should be true if getWMSTileLayer is used
          layer: null, //the open layer object for display purpose.(Openlayer object should be created on top WMS layer in current implementation)
          addedToMap: false, //true if the openlayer is added in to Openlayer map
          olLayer: newOLLayer,
          parentLayer: null
        }
        let newFeatureList=[];        
        //scan all bottom layers to assign additional information;
        for(let i in sublayers) {
          let sublayer= sublayers[i];
          //if some bottom layers mixed with containers, flat out them to one single container first (just make a single logic here).
          if(sublayer.value !== undefined && $.type(sublayer.value) === 'array')
          {
            let newSubFeatures=[];
            //get all bottom layers
            const getFeatures = (features,outputList)=>{
              if($.type(features)==='object') {
                if(features.value !== undefined && $.type(features.value) === 'array')
                {
                  getFeatures(features.value,outputList);
                }
                else
                {
                  outputList.push(features);
                }
              }
              else if($.type(features)==='array') {
                for(let i in features){
                  getFeatures(features[i],outputList);
                }
              }
            }
            getFeatures(sublayer.value,newSubFeatures);
            for(let j in newSubFeatures){
              visibleLayerNames.push(newSubFeatures[j].name);
              newSubFeatures[j].parentLayer=newContainer;
              newFeatureList.push(newSubFeatures[j]);
              //keep all bottom layers into one big list (Note: this is only used for DEMO)
              if(outputAllLayers && outputAllLayers!== undefined)
              {
                outputAllLayers.push(newSubFeatures[j]);
              }
            }
          }
          else {
            visibleLayerNames.push(sublayers[i].name);
            //keep the parent reference;
            sublayers[i].parentLayer=newContainer;
            newFeatureList.push(sublayers[i]);
            //keep all bottom layers into one big list (Note: this is only used for DEMO)
            if(outputAllLayers && outputAllLayers!== undefined)
            {
              outputAllLayers.push(sublayers[i])
            }
          }

        }
        if(newFeatureList.length>0)
        {
          newContainer.sublayers=newFeatureList;
        }        
        newContainer.visibleLayers=visibleLayerNames;
        outputGroups.push(newContainer); 
      }
      else if(layerContainer.value.length>0){
        getAllLeafGroups(layerContainer.value,urls,wmsGetCapaUrl,outputGroups,outputAllLayers);
      }
  }
  else if($.type(layerContainer)==='array') {
      for(let it in layerContainer) {
        getAllLeafGroups(layerContainer[it],urls,wmsGetCapaUrl,outputGroups,outputAllLayers);
      }

    }
  }
}
//BLI: this function will not be used after demo
function createWMSTopLayerObj(topLayer,allLayers,urls,wmsGetCapaUrl)
{
  let newObj=null;
  let layer=topLayer&&topLayer.value?topLayer.value:null;
  if(allLayers && layer &&urls &&wmsGetCapaUrl )
  {
    //let values=[];
    let visibleLayerNames=[];
    //because all bottom layers are added into openlayers map,the are visibleLayers;
    allLayers.forEach(element=>{
      visibleLayerNames.push(element.name);
    });
    wmsCount++;
    let jsonParser=new JsonParser({caseSensitive: false,allLevel: false,objOnly:true });
    let recordRequired=['name'];
    let sourceInfor=jsonParser.findInObj(layer,recordRequired);

    let name =sourceInfor&&sourceInfor.length>0 && sourceInfor[0].value!==undefined?sourceInfor[0].value:"wmsTopLayer_"+wmsCount;
    recordRequired=['title'];
    sourceInfor=jsonParser.findInObj(layer,recordRequired);
    let title =sourceInfor&&sourceInfor.length>0 && sourceInfor[0].value!==undefined?sourceInfor[0].value:"wmsTopLayers";
    let olLayerObj=null;
    //create a layer to hold the display layer object 
    if(window.appConfig.WMSTopOLLayerOnly=== true) {
      olLayerObj=getWMSTileLayer(urls,name);

    olLayerObj.olLayer.setZIndex(wmsTopLayerCount);
    }
    wmsTopLayerCount++;
    newObj={
      sourceType: OLControl.OL_SOURCE_TYPE.WMS,
      type: type_wmstopLayer,
      defaultGroup: false, //default group false
      label: title, //container display title
      layers: allLayers, //all bottom layers
      containOLSource:true,//The determine if "olLayer" contain both ol layer object and ol source object.
                          //(False, "layer" is used for ol layer only, True if the getWMSTileLayer is used )
      olLayer: olLayerObj,
      id: wmsTopLayerTag+name,
      value: name,//the name value returned by WMS service
      visibleLayers:visibleLayerNames,
      url:urls, //wms getMap urls (used)
      addedToMap: false, //true if the openlayer is added in to Openlayer map
      wmsGroupUrl:wmsGetCapaUrl // wms get capability url
    }

  }
  return newObj;
}
      
//BLI: load wms layers based on the getCapabilities;
export async function getWMSLayerGroupList(url, urlType, callback) {
    //BLI: working on it:
    let allLayers = [];
    let isDefault = false;
    let layerGroups = [];
    let parentLayer=null;
    //const remove_underscore = name => {return helpers.replaceAllInString(name, "_", " ");}
    // let httpConfig= { 
    //   headers: {'Content-Type': 'application/json'},
    //   mode: 'no-cors'
    // }
    localHTTPFetch(url, null,result => {
    let olWMSReader = new oLWMSCapabilities();
    let wmsLayers =null;
    try{
      let json_results = olWMSReader.read(result);
       wmsLayers = (new JsonParser({caseSensitive: false,allLevel: true,objOnly:false})).findWMSInfo(json_results);
    }
    catch(error){
      console.log("ERROR:"+result)
      callback(null);
      return;
    }
    if(wmsLayers && wmsLayers.length>0)
    {
        //get urls for GetMap
        let urls=[];
        $.each(wmsLayers,function(index,data){
          //1.Try to find "HTTP" urls
          let dKey_str=String(data.key).toLocaleLowerCase();
          if(dKey_str==='getmap') {
            let orderedKeys=['Get','OnlineResource']; 
            let HTTPStrs=getLayerProps((data.value),orderedKeys);
            $.grep(HTTPStrs,function (it,index){
              if($.type(it)==='object')
              {
                $.each(it,function(index,value){
                  let v_str=String(value).toLocaleLowerCase();
                  if(v_str.search("http") >-1){
                    urls.push(v_str);
                  }
                })
              }
          })
          }
        });
        if(urls.length<1) {
          //Debugging infor
          alert("No WMS layer available!");
        }
        else {
            //create the layers groups.
            //BLI: current implemenation, parents only contains bottom layers;
            //there is no second level;
            let list=[];
            let topLayer=null;
            //loop through each element
            //Need the url and name, title as start.
            for(let id in wmsLayers) {
            //$.grep(wmsLayers,function(data,index){
              let data=wmsLayers[id];
              let dKey_str=String(data.key).toLocaleLowerCase();
              //if(1) console.log(data);
              if(dKey_str==='layer' && $.type(data)==='object') {
                //build the layer tree starting from top layer;
                let commonInfor = {layerLevel:1,urls:urls,parser:null,layerZIndex:1};
                createWMSMapGroup(null,data.value,commonInfor, list);
                topLayer=data;
              }
            //});
            }
            if(topLayer && topLayer!== undefined) {
              getAllLeafGroups(list,urls,url,layerGroups,allLayers)
              //create one display layer to contain All feature layers from one WMS url link:
              parentLayer=createWMSTopLayerObj(topLayer,allLayers,urls,url);
              //sort the feature layers based on the index
              parentLayer.layers.sort((a,b)=>{
                return a.index-b.index; //sort list in ascending order 
              });
              //check if the layer group container contains only one group as same as top parent layer:
              if(layerGroups.length===1 && parentLayer.value===layerGroups[0].value)
              {
                //remove all container;
                layerGroups.splice(0, layerGroups.length);
                //reassign the top layer parent
                let subLayers=parentLayer.layers;
                for(let i in subLayers)
                {
                  subLayers[i].parentLayer = parentLayer;
                }
              }
              //set parent to sub containers
              layerGroups.forEach(it=>{
                it.parentLayer=parentLayer;
                //update the label of sub containers:
                let newLable= parentLayer.value+":"+it.label;
                it.label =newLable;
              });
              //keep top layer container.
              layerGroups.push(parentLayer); 
            }
        }
    }
    if(window.appConfig.WMSFlatListOnly)
    {
      //clean the list
      layerGroups.splice(0,layerGroups.length);
      //keep top list only
      layerGroups.push(parentLayer); 
    }
    // PARSE TO JSON after requested get capability from WMS Server
      callback([layerGroups, parentLayer]);
   });
};

export function ShowCommingSoon(){
  helpers.showMessage(window.appConfig.Message,window.appConfig.comingSoon,"gray",20000);

}

export function sameString(str1,str2,caseSensitive=false)
{
  if(caseSensitive)
  {
    return (str1===str2?true:false);
  }
  else {
    return (String(str1).toLocaleLowerCase() ===String(str2).toLocaleLowerCase()?true:false);
  }
}
function wmsLayers_setVisibilty(curLayer,topLayer)
{
   if(curLayer ) {
    let visible=curLayer.visible;
    let parent=topLayer===undefined?null:topLayer;
    let name=curLayer.name;

    //Find the top WMS layer (this for the implemenation to create one top display for wms)
    if(parent && parent.olLayer!==null)
    {
      let source=parent.olLayer.olSource;
      let params=source!==undefined?source.getParams():null;
      let layerList= params?params['LAYERS']:[];
      let addTo=true;
      let updateParent=false;
      if(layerList===undefined) {
        if(visible===true && source) {
          layerList=[];
          layerList.push(name);
          source.updateParams({'LAYERS':layerList});
          if(parent.addedToMap=== false)
          {
            parent.addedToMap=true;
            //OLControl.olAddLayerToView(parent.olLayer);
            controlLayerInMap(parent.olLayer,true);
          }
        }
        return;
      }
      //check existing layers
      for(let i in layerList){
        if(layerList[i]=== name)
        {
          updateParent=true;
          addTo=false;
          if(visible===false){
            //remove name from display list:
            layerList.splice(i,1);
          }
          else { //if the layer exists
            updateParent=false;
          }
          break;          
        }
      }
      if(addTo) {
        layerList.push(name);
        updateParent=true;
        if(parent.olLayer.olLayer.getVisible() !==visible ) {
           parent.olLayer.olLayer.setVisible(visible);
        }
      }
      if(updateParent) {
        source.updateParams({'LAYERS':layerList});
        if(parent.addedToMap === false && layerList.length>0)
        {
          parent.addedToMap=true;
          controlLayerInMap( parent.olLayer,true);
        }
        if(layerList.length===0)
        {
          //Because the current implemenation is using "zIndex" to control the layer display
          //priority, we can only remove the layer from map directly for performance purpose.
          controlLayerInMap( parent.olLayer,false);
          parent.addedToMap=false;
        }
      }
    }
    else if(curLayer.olLayer && curLayer.olLayer !==undefined) {
      //control wms feature layers
      if(curLayer.addedToMap === false)
      {
        curLayer.addedToMap=true;
        let newObj = {
          displayName:curLayer.displayName,
          visible:curLayer.visible,
          olLayer:curLayer.olLayer.olLayer,
          olSource:curLayer.olLayer.olSource
        }
        controlLayerInMap(newObj,true,curLayer.drawIndex);
      }
      else
      {
        let newObj = {
          displayName:curLayer.displayName,
          visible:curLayer.visible,
          olLayer:curLayer.olLayer.olLayer,
          olSource:curLayer.olLayer.olSource
        }
        //Because the current implemenation is using "zIndex" to control the layer display
        //priority, we can only remove the layer from map directly for performance purpose.
        controlLayerInMap( newObj,false);
        curLayer.addedToMap=false;
      }
    }
  }
}

export function turnOffLayers(layers, callback) {
  for (let index = 0; index < layers.length; index++) {
    const layer = layers[index];
    if(layer.visible && (layer.olLayer && layer.olLayer !==undefined)){
      //The "layer.layer" of bottom feature will not hold the ol source object.
      if(layer.containOLSource) {
          layer.olLayer.olLayer.setVisible(false);//turn off the ol layer
      }
      else {
        layer.olLayer.olLayer.setVisible(false);//turn off the ol layer
      }
    }
    // let newLayer = Object.assign({}, layer);
    // newLayer.visible = false;
    if(layer.visible){
        //get the top WMS Layer
      let topLayer=undefined;
      if(window.appConfig.WMSTopOLLayerOnly)
      {
        topLayer=layer.parentLayer;
        while (topLayer)
        {
          if(isWMSTopLayer(topLayer)) {
            break;
          }
          topLayer=topLayer.parentLayer;
        }
        if(topLayer===undefined && isWMSTopLayer(layer)){
          topLayer =layer;
        }
      }
      layer.visible=false ;
      wmsLayers_setVisibilty(layer,topLayer);
    }
    if (index === layers.length - 1) {
      callback(layers);
    }
  }
}

export function enableLayersVisiblity(layers, callback) {
  for (let index = 0; index < layers.length; index++) {
    const layer = layers[index];
    //let newLayer =Object.assign({}, layer);//make a copy

    layer.visible = true;
    //get the top WMS Layer
    let topLayer=undefined;
    if(window.appConfig.WMSTopOLLayerOnly)
    {
      topLayer=layer.parentLayer;
      while (topLayer)
      {
        if(isWMSTopLayer(topLayer))
        {
          break;
        }
        topLayer=topLayer.parentLayer;
      }
      if(topLayer===undefined && isWMSTopLayer(layer))
        topLayer =layer;
    }
    wmsLayers_setVisibilty(layer,topLayer);

    if (index === layers.length - 1) callback(layers);
  }
};

export function olMap_goto(olMap,geoExt,maxScale)
{
  if(olMap&&geoExt)
  {
    let olView=OLControl.olGetViewFromMap();
    let proj_code= olView.getProjection().getCode();
    let worldExt = transformExtent([geoExt[0], geoExt[1], geoExt[2],geoExt[3]], 'EPSG:4326', proj_code);
    let zoomlevel=(maxScale&& maxScale!==undefined)?getZoomLevel(maxScale):undefined;
   // const extent = [boundingBox.minx, boundingBox.miny, boundingBox.maxx, boundingBox.maxy];
   if(zoomlevel===undefined) {
      olMap.getView().fit(worldExt, olMap.getSize(), { duration: 1000});
   }
   else {
    olMap.getView().fit(worldExt, olMap.getSize(), { duration: 1000});
    olMap.getView().setZoom(zoomlevel);
   }
  }
}
export function sleep(milsecond)
{
  setTimeout(() => {}, milsecond);
}

//BLI: this updateLayerIndex need to modify to handle the new implementation
//Note: the layers are sorted from top to bottom (bottom index should not be less than 0)
export function swapLayers(layers,oldIndex,newIndex)
{
  let goingDown=(oldIndex<newIndex)?true:false;
  //Note: the top item in the list is starting as 0 index;
  if(goingDown) {
    //swap the drawIndex first;
    let nextBottomLayer= newIndex===layers.length-1?layers[newIndex]:layers[newIndex+1];
    let drawIndex=nextBottomLayer.drawIndex;
    layers[newIndex].drawIndex=drawIndex+1;//make sure it is on above
    if(layers[newIndex].layer) {
      layers[newIndex].layer.setZIndex(layers[newIndex].drawIndex);
    }
    for (let index = newIndex-1; index <= oldIndex; index--) {
      layers[index].drawIndex++;//make sure it is on above
      if(layers[index].layer) {
        layers[index].layer.setZIndex(layers[index].drawIndex);
      }
    }
  }
  else { //going up 
    //swap the drawIndex first;
    let nextBottomLayer= layers[newIndex+1];
    let drawIndex=nextBottomLayer.drawIndex;
    layers[newIndex].drawIndex=drawIndex;//make sure it is on above
    if(layers[newIndex].layer) {
      layers[newIndex].layer.setZIndex(layers[newIndex].drawIndex);
    }
    for (let index = newIndex+1; index <= oldIndex; index++) {
      layers[index].drawIndex--;//make sure it is on above
      if(layers[index].layer) {
        layers[index].layer.setZIndex(layers[index].drawIndex);
      }
    }
  }
  
}
//check if all layers in the group are turned on
export function isAllLayersOn(layers){
    if(layers && layers.length>0) {
      for(let i=0;i<layers.length;i++)
      {
        let layer=layers[i];
        if(layer.visible===false) {
          return false;
        }
      }
      return true;
    }
    return false;
}

export function containOLObject(layer)
{
  if(layer!==undefined)
  {
    if(layer.olLayerObj)
    {
      return true;
    }
  }
  return false;
}
export function getOLLayerObject(layer) {
  if(layer!==undefined && layer.olLayerObj)
  { 
    return layer.olLayerObj.olLayer;
  }
  return null;
}
