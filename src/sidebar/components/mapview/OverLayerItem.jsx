import React, { Component } from "react";
import * as helpers from "../../../helpers/helpers";
import Highlighter from "react-highlight-words";
import "./OverLayerItem.css";
class LayerItem extends Component {
  constructor(props) {
    super(props);

    this.state = {};
  }

  componentWillReceiveProps(nextProps) {
    console.log(nextProps);
  }
  render() {
    const { layerInfo } = this.props;
    return (
      <div>
        <div className={layerInfo.visible ? "mv-layer-item-container on" : "mv-layer-item-container"}>
          {/* <div className="mv-layer-item-plus-minus-container" onClick={() => this.props.onLegendToggle(this.props.layerInfo)}>
            <img src={this.props.layerInfo.showLegend ? images["minus.png"] : images["plus.png"]} alt="minus" />
            <div className="mv-layer-item-plus-minus-sign" />
            <div className="mv-layer-item-lines-expanded" />
          </div> */}
          <div className="mv-layer-item-checkbox">
            <input id="mv-layer-item-checkbox" key={helpers.getUID()} type="checkbox" onChange={() => this.props.onCheckboxChange(this.props.layerInfo)} checked={layerInfo.visible} />
          </div>
          {/**Highlighter is used to display the layer name */}
          <Highlighter
            className="mv-layer-item-layer-label"
            highlightClassName="sc-search-toc-highlight-words"
            searchWords={[this.props.searchText]}
            textToHighlight={layerInfo.displayName}
          />
          <div
            className={this.props.layerInfo.liveLayer === null || !this.props.layerInfo.liveLayer ? "sc-hidden" : "mv-layer-item-layer-info-live-layer"}
            title="This layer is Interactable in the map."
          >
            <img src={images["callout.png"]}></img>
          </div>
        </div>
        {/**This is "..." button */}
        <div className="mv-layer-item-toolbox" title="Layer Options" onClick={evt => this.props.onLayerOptionsClick(evt, this.props.layerInfo)}>
          <img src={images["more-options.png"]} />
        </div>
      </div>
    );
  }
}

export default LayerItem;

// IMPORT ALL IMAGES
const images = importAllImages(require.context("./images", false, /\.(png|jpe?g|svg|gif)$/));
function importAllImages(r) {
  let images = {};
  r.keys().map((item, index) => (images[item.replace("./", "")] = r(item)));
  return images;
}
