import React, { Component } from 'react'

export default class TLayerItem extends Component {

    
    render() {

        console.log(this.props.layerItem);
      //  const {groupName}  = this.props.layerItem;
        return(
           
       
            <div>
            {
                this.props.layerItem.name
            }
                
            </div>
        );
        
    }
}
