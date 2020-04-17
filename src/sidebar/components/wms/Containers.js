import React, { Component } from 'react';
import ContainerItem from './ContainerItem';
import uuid from "react-uuid";
import * as TOCHelpers from "./TOCHelpers.jsx";
import * as WMSControl from "./wmsLayerControl";
import { isMobile } from "react-device-detect";

export default class Containers extends Component {
    constructor(props) {
        super(props);
    this.state = {
      searchText: "",
      sortAlpha: this.getInitialSort(), //function to sort item of each group
        containers:[],
        allLayers: {},//all layer groups contained 
        layers: [] //the layers are displaying in the list area
      };
    }

  // REFRESH IF PROPS FROM PARENT HAVE CHANGED - GROUPS DROP DOWN CHANGE.
  componentWillReceiveProps(nextProps) {
    //The nextProps.group is going to display; the "this.props.group" is a current group displayed.

    let allLayers = this.state.allLayers;
    if(nextProps===null || nextProps.group===undefined) return;
    const nextLayers = allLayers[nextProps.group.value];
    this.refreshLayers(nextProps.group, nextProps.allGroups);
  }

  refreshLayers = (group, allGroups) => {
    let layers = [];
    layers = this.state.allLayers[group.value];

    if (layers === undefined) {
      layers = group.layers;
    //BLI refresh the new layers based on the selected group.
    if (layers !== undefined || group.parentLayer !==undefined) {
        let allLayers = this.state.allLayers;
        allLayers[group.value] = layers;
        
        // FETCH THE REST OF THE GROUPS
        let containertemp = this.state.containers;
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
        let containerGroups=this.state.containers;
        allGroups.forEach(goupeTemp => {
            containerGroups.push({id:uuid(),containerName:goupeTemp.label,layers:this.state.allLayers[goupeTemp.value], displayLayers: false,group:group})
                   });
        this.setState({ containers:containerGroups,  allLayers: allLayers });


        //this.setState({ layers: layers, allLayers: allLayers });


        // this.setState({ layers: layers, allLayers: allLayers }, () => {
        //   this.sortLayers(this.state.layers, sortAlpha);
        // });
        return;
      }
    }else{

      this.setState({ layers: layers });

      // this.setState({ layers: layers }, () => {
      //   this.sortLayers(this.state.layers, sortAlpha);
      // });
      return;
    }

    
  };


  // sortLayers = (layers, sortAlpha, callback = undefined) => {
  //   if(layers && layers.length>0) {
  //     let newLayers = Object.assign([{}], layers);
  //     if (sortAlpha) newLayers.sort(this.sortByAlphaCompare);
  //     else newLayers.sort(this.sortByIndexCompare);

  //     let allLayers = this.state.allLayers;
  //     allLayers[this.props.group.value] = newLayers;

  //     this.setState({ layers: newLayers, allLayers: allLayers }, () => {
  //       window.allLayers = this.state.allLayers;
  //       if (callback !== undefined) callback();
  //     });
  //   }
  // };


  getInitialSort = () => {
    if (isMobile) return true;
    else return false;
  };


  markComplete = (id) => {
      this.setState({  
      todos: this.state.containers.map(container_temp => {
        if (container_temp.id === id) {
          if (container_temp.displayLayers ) {
              container_temp.displayLayers = false;
          } else {
            container_temp.displayLayers  =  true;
          }
        }
            return container_temp;
      })
    });
  };
    render() {
      return this.state.containers.map(todo =>(
        <ContainerItem
         key={todo.id} 
         containerItem={todo}   
         markComplete={this.markComplete} 
         searchText={this.state.searchText} 
         sortAlpha={this.state.sortAlpha}
         layerGroups={this.state.allLayers} 
         group={todo.group}  
                        
         />
    ));
   }
}
