import React, { Component } from "react";
import "./App.css";
import Header from "./header/Header";
//Bli:commentout 
import Sidebar from "./sidebar/Sidebar";
//Bli: added for testing
import SidebarSlim from "./sidebar/SidebarSlim";
import {Util_SortedArray} from "./utilities/utilities";

import SCMap from "./map/SCMap";
import "./helpers/SC.css";
import fr_Config from "./config_fr.json";
import en_Config from "./config_en.json";
import ReactGA from "react-ga";
ReactGA.initialize("UA-3104541-53");
ReactGA.pageview(window.location.pathname + window.location.search);

class App extends Component {
  constructor(props){
    super(props);
    window.appConfig=en_Config;
    if(props.enableFR){
       window.appConfig=fr_Config;
    }

    // switch(props.language) {
    //   case window.language.FR:
    //     window.appConfig=fr_Config;
    //     break;
    //   case window.language.EN:
    //   default:
    //     window.appConfig=en_Config;
    //     break;
    // };
  }
  componentWillMount() {
    document.title = window.appConfig.title;
    window.displayLayers=Util_SortedArray.getArray();
    //output the log file
    window.debuggingLog= infor=>{
      if(window.appConfig.BLI_Under_Dev.Dev_enabeDebugLog)
      {
        console.log(infor);
      }

    }
  };
  render() {
    return (
      <div>
        <div id="portal-root" />
          <Header />
          <Sidebar /> 
        <SCMap />
      </div>
    );
  }
}

export default App;
