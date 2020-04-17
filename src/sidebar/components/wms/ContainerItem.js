import React, { Component } from 'react';
import Layers from './Layers';
import TLayerItem from './TLayerItem';
import TLayers from './TLayers';
import { List, AutoSizer } from "react-virtualized";

export default class ContainerItem extends Component {


    render() {


      const {id,containerName,layers,displayLayers} = this.props.containerItem;
      let  displayLayersTemp = this.props.containerItem.displayLayers;

      return (

          
            <div style={this.getStyle()}>
              <button
                type="button"
                style={displayLayersTemp? this.getStyle1() : this.getStyle2()}
                onClick={this.props.markComplete.bind(this, id)}
              ></button>
              {""}
             {containerName}
             {/* {displayLayersTemp ? <TLayers layers={layers} /> : ""} */}
{displayLayersTemp ? 
             <Layers
               ref={ref => {
                this.layerRef = ref;
              }}
              group={this.props.group}
              searchText={this.props.searchText}
              sortAlpha={this.props.sortAlpha}
              allGroups={this.props.layerGroups}
              layers={this.props.containerItem.layers}
            />:"" }
           
         
           </div>
    
         );
       }
   



    getStyle = () => {
        return {
          background: "#f4f4f4",
          padding: "10px",
          borderBottom: "1px #ccc dotted"
        };
      };
    
  getStyle1 = () => {
    return {
      background: "#f4f4f4",
      padding: "10px",
      borderBottom: "1px #ccc dotted"
    };
  };

  getStyle2 = () => {
    return {
      background: "#FF4500",
      padding: "10px",
      borderBottom: "1px #ccc dotted"
    };
  };

}
