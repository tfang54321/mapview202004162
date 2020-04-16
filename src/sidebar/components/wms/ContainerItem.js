import React, { Component } from 'react';
import Layers from './Layers';
import TLayerItem from './TLayerItem';
import TLayers from './TLayers'

export default class ContainerItem extends Component {


    render() {


      const {id,containerName,layers} = this.props.containerItem;
      let  layerslength = layers.length;

      return (
         
            <div style={this.getStyle()}>
              <button
                type="button"
                style={layerslength > 0 ? this.getStyle1() : this.getStyle2()}
                onClick={this.props.markComplete.bind(this, id,containerName)}
              ></button>
              {""}
             {containerName}
             {layerslength > 0 ? <TLayers layers={layers} /> : ""}
           
         
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
