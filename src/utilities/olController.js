// REACT
// OPEN LAYERS
import Feature from "ol/Feature";
import * as ol from "ol";
import { Image as ImageLayer } from "ol/layer.js";
import ImageWMS from "ol/source/ImageWMS.js";
import { GeoJSON } from "ol/format.js";
import { Tile,OSM, TileArcGISRest, TileImage, Vector as VectorSource } from "ol/source.js";
import TileLayer from "ol/layer/Tile.js";
import TileGrid from "ol/tilegrid/TileGrid.js";
import Point from "ol/geom/Point";
import VectorLayer from "ol/layer/Vector";
import Vector from "ol/source/Vector";
import { getTopLeft } from "ol/extent.js";
import { easeOut } from "ol/easing";
import { Fill, Stroke, Style, Circle as CircleStyle, Text as TextStyle } from "ol/style";
import XYZ from "ol/source/XYZ.js";
import { unByKey } from "ol/Observable.js";
import WKT from "ol/format/WKT.js";
import { transform } from "ol/proj.js";
import Projection from "ol/proj/Projection.js";
import proj4 from "proj4";
import { register } from "ol/proj/proj4";
import { fromLonLat } from "ol/proj";
import { getVectorContext } from "ol/render";
import {stableSort} from 'ol/array';
import {DOM_ROW_HEIGHT} from "../utilities/utilities";

//OTHER
import shortid from "shortid";

export const OL_VIEW_PAN = { UP:'up',DOWN:'down',LEFT:'left',RIGHT:'right'};
export const OL_SRC_PARAM_TYPE = { LAYERS:'layers'};
export const OL_SOURCE_TYPE= {NONE:'none',IMAGE:'image',VECTOR:'vector',WMS:'wms'};
var MV_OL_PAN_DETLA_X_METER= -1;
var MV_OL_PAN_DETLA_Y_METER= -1;
var MV_LAYER_NEXT_Z_INDEX=1;
const OL_PAN_DETLA_PIXEL=40;
const PIXEL_VALUE=150;
const START_PIXEL_POS=[PIXEL_VALUE,PIXEL_VALUE];
const END_PIXEL_POS=[PIXEL_VALUE+OL_PAN_DETLA_PIXEL,PIXEL_VALUE+OL_PAN_DETLA_PIXEL];
const OL_ZINDEX={TOP_PRE_LAYER:9999,BASE_LAYER:0};

// URL FRIENDLY STRING ID
export function getUID() {
  return shortid.generate();
}
/**
 * To add the open layer object into the map.
 * Note: the map object of openlayers has to exist.
 * @param {{displayName,visible,olLayer,olSource}} olLayerObj 
 */
export function olAddLayerToView(olLayerObj,baseMapOrPreLayer=false,
                                 sourceType = OL_SOURCE_TYPE.NONE,
                                 zIndex=MV_LAYER_NEXT_Z_INDEX)
{
  if(window.map !== undefined &&
    olLayerObj !==undefined && 
    olLayerObj.olLayer!== undefined ) {
      let olLayer=olLayerObj.olLayer;
      let olSource=olLayerObj.olSource;
      if(olSource === null ||
        olSource ===undefined){
          olSource=olLayer.getSource();
      }
      window.map.addLayer(olLayer);
      olLayer.setZIndex(zIndex);
      if(zIndex === MV_LAYER_NEXT_Z_INDEX ) {
        MV_LAYER_NEXT_Z_INDEX++;
      }
      if(olSource!==undefined) {
        //register the tile loading event
        olTileSource_RegEvent(olLayerObj.olSource);
      }
      /* {
        *     displayName:name,
        *     baseOrTopPreLayer: true/false, //the layer for base map or top presentation layer
        *     visible: true/false,
        *     zIndex: zIndexValue,
        *     orig_zIndex: initial zIndex value of a layer
        *     olLayer: layer of openlayers,
        *     height: dom_Row_height, //default of DOM_ROW_HEIGHT
        * }
        * */
       let dis_Layer= {
          displayName:olLayerObj.displayName,
          baseOrTopPreLayer:baseMapOrPreLayer,
          sourceType: sourceType,
          visible: olLayerObj.visible,
          zIndex: zIndex,
          orig_zIndex: zIndex,
          olLayer: olLayer
       }
       window.LayersInView.add(dis_Layer);
      //fire the layer added event:
      window.emitter.emit("refreshOLDisplayList",dis_Layer);
  }
}
/**
 * To remove a openlayer layer from map
 * @param {{olLayer,olSource}} olLayerObj 
 */
export function olRemoveLayerFromView(olLayerObj)
{
  if(window.map !== undefined &&
    olLayerObj !==undefined && 
    olLayerObj.olLayer!== undefined ) {
      let olLayer=olLayerObj.olLayer;
      let olSource=(olLayerObj.olSource !==undefined)?
                      olLayerObj.olSource:olLayer.getSource();
      window.map.removeLayer(olLayer);
      if(olSource!==undefined) {
        //clean the cache tiles
        olSource.clear();
      }
      //remove it from display list:
      window.LayersInView.remove({olLayer: olLayer});
      //fire the layer added event:
      window.emitter.emit("refreshOLDisplayList",olLayerObj);
  }
}
//return ol view
export function olGetViewFromMap() {
  if(window.map !== undefined) {
    return window.map.getView();
  }
  return undefined;
}
//render the map
export function olMapViewUpdate(){
  window.map.render();
}

export function olViewAnimate(newPos,zoomLevel,dValue=2000) {
  let view=olGetViewFromMap();
  if(view !== undefined)
  {
    view.animate({ center: newPos, 
      zoom: zoomLevel!==undefined? zoomLevel:"",
      duration: dValue});
  }
}
//get the zoom level
export function olViewZoom() {
  let view=olGetViewFromMap();
  if(view !== undefined)
  {
    return view.getZoom();
  }
  return -1;
}

function updatePanDetla(){
  let start = window.map.getCoordinateFromPixel(START_PIXEL_POS);
  let endPos = window.map.getCoordinateFromPixel(END_PIXEL_POS);
  MV_OL_PAN_DETLA_X_METER=endPos[0]-start[0];
  MV_OL_PAN_DETLA_Y_METER=endPos[1]-start[1];
}
//set the zoom level
export function olViewZoomTo(zoomLevel) {
  let view=olGetViewFromMap();
  if(view !== undefined)
  {
    view.setZoom(zoomLevel);
    updatePanDetla();
  }
}
export function olViewCenter()
{
  let view=olGetViewFromMap();
  if(view !== undefined)
  {
    return view.getCenter();
  }
  return undefined;
}
//pan view to new location
export function olPanView(panDir) {
  let center=olViewCenter();
  if(MV_OL_PAN_DETLA_X_METER<0) {
    updatePanDetla();
  }
  switch(panDir) {
    case OL_VIEW_PAN.UP:
      center[1] -=MV_OL_PAN_DETLA_Y_METER;
      break;
    case OL_VIEW_PAN.DOWN:
      center[1] +=MV_OL_PAN_DETLA_Y_METER;
      break;
    case OL_VIEW_PAN.LEFT:
      center[0] -=MV_OL_PAN_DETLA_X_METER;
      break;     
    case OL_VIEW_PAN.RIGHT:
      center[0] +=MV_OL_PAN_DETLA_X_METER;
      break;
    default:
        return;
  }
  olViewAnimate(center,olViewZoom(),200);
}


/**
 * To regist the events of loading tiles,tile loaded and loading errors.
 * Note: the event will send the current ol tile source object back to handler.
 * @param {TileSource} olTileSource 
 */
export function olTileSource_RegEvent(olTileSource)
{
  if(olTileSource!== undefined && 
    (olTileSource instanceof Tile))
  {
    olTileSource.on('tileloadstart', function() {
      window.emitter.emit('tileloadstart',olTileSource);
    });
    
    olTileSource.on('tileloadend', function() {
      window.emitter.emit('tileloadend',olTileSource);
    });
    olTileSource.on('tileloaderror', function() {
      window.emitter.emit('tileloaderror',olTileSource);
    });
    return true;
  }
  return false;
}
/**
 * The function is to add postrender event handler to map.
 * @param {callbackfunction} functionRef 
 */
export function ol_MapPostRender_CB(functionRef) {
  if(window.map !== undefined) {
    window.map.on("postrender", functionRef);
  }
}

/**
 * The function is to add key down event handler to openlayer viewport.
 *
 * @param {callbackfunction} functionRef 
 */
export function ol_SetKeyDown_CB(functionRef) {
  if(window.map !== undefined) {
    window.map.getViewport().addEventListener("keydown", functionRef,true);
  }
}
/**
 * Get the source associating the layer.
 */
export function olGetSource(olLayer) {
  let olSource=undefined;
  if(olLayer !==null && olLayer!== undefined) {
    olSource = olLayer.getSource();
  }
  return olSource;
}

/**
 * To update the parameter of the source object.
 * @param {Object} source //the source object of openlayers
 * @param {String} paramType  //the type of parameter
 * @param {objecct} value     //the new value of specified param
 */
export function olUpdateSourceParams(olSource,paramType,value)
{
  let result=false;
  if(olSource!==undefined) {
    switch(paramType){
      case OL_SRC_PARAM_TYPE.LAYERS:
         olSource.updateParams({'LAYERS':value});
         result=true;
         break;
      default:
         break;
    }
  }
  return result;
}
/**
 * Return the attribute value based on the specified name of layer of Openlayers.
 * @param {oOject} layer // the layer object of openlayers
 * @param {String} attrName //attribute name of layer object
 */
export function olGetLayerAttrib(layer,attrName)
{
    return layer.get(attrName);
}
/**
 * sw
 * @param {Object} olLayer // the layer object of openlayers
 * @param {int} newIndex   // the zIndex value of olLayer
 */
export function olSetZIndex(olLayer,newIndex)
{
  if(olLayer!== undefined && olLayer!==null) {
    olLayer.setZIndex(newIndex);
    olMapViewUpdate();
  }
}