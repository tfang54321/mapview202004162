import $ from 'jquery'

const debugEnabled=0;

/**
 * Parsing Json object with JQuery
 * */
export default class JsonPaser{
    //default 
    constructor(props){
        this.caseSensitive =props.caseSensitive;
        this.allLevel = props.allLevel;
        this.objOnly=props.objOnly;
        this.searchByOrder=props.searchByOrder;
        this.setSearchObjOnly=this.setSearchObjOnly.bind(this);
        this.findInObj=this.findInObj.bind(this);
        this.findWMSInfo=this.findWMSInfo.bind(this);
        this.setScanTree=this.setScanTree.bind(this);
    };
    setScanTree(enable){
        this.allLevel=enable;
    }
    /**
     * Set searching current object only;
     * @param {bool} enabled 
     */
    setSearchObjOnly(enabled)
    {
        this.objOnly = enabled;
    }

    //True if the data key "data_key" is matched to the key looking for;
    // False otherwise.
    static isSameKey(data_key,search_key,caseSensitive) {
        let dKey_str=caseSensitive?String(data_key):String(data_key).toUpperCase();
        let sKey_str=caseSensitive?String(search_key):String(search_key).toUpperCase();
        if(dKey_str === sKey_str) {
            return true;
        }
        return false;
    }
    /**
     * Parse the json object to find the objects with specified key.
     * The function will return the matching objects stored in the json formation.
     * When there are children with same key value of parent, the "children" will be fulfilled
     * with an array. 
     * @param {string} data_key 
     * @param {Object} data 
     * @param {Array(string)} requestKeys 
     * @param {boolean} deepSearch 
     * @param {boolean} objectOnly 
     * @param {boolean} caseSensitve 
     * @param {Array} outputList 
     */
    static scanChildren(data_key,data,requestKeys,deepSearch,objectOnly,caseSensitve,outputList)
    {   
        let searchChild=(!objectOnly);
        //the value of final result should be a object, children shuld be 
        //the array of object with same key value as the final result record.
        let finalResult= {key:data_key, value: data};
        let match = false;

        if(data_key != null ) {
            for(let index in requestKeys) {
                if(JsonPaser.isSameKey(data_key,requestKeys[index],caseSensitve)) {
                    match=true;
                    break;
                }
            }
            
            if(match) {
                //keep this record;(process the array object as children)
                outputList.push(finalResult);
                if(!deepSearch)
                {
                    //stop search child if the "deepSearch" is false;
                    searchChild=false;
                }
            }
            else if(deepSearch)
            {
                searchChild=true;
            }
        }
        if(searchChild ||data_key===null ) {
            let newRequestKeys=match?{data_key}:requestKeys;
            //look for children
            if($.type(data)==='object')
            {
                //search children
                for(let key in data) {
                    //check children of current data;
                    JsonPaser.scanChildren(key,data[key],newRequestKeys,deepSearch,objectOnly,
                        caseSensitve,outputList);
                }
            }
            else if ($.type(data)==='array')
            {
                //loop the value of array 
                $.grep(data,function(it,index){
                    //change the object
                    if($.type(it)==='object')
                    {
                        JsonPaser.scanChildren(null,it,newRequestKeys,deepSearch,objectOnly,
                            caseSensitve,outputList);
                    }
                });
            }
        }
        return match;
    }
    
    //Looking for records from the json object data based on
    //sepecified object key. the array of matched reords will be 
    //return,  otherwise empty array returned;
    findInObj(data,requestKeys) {
        let result = new Array();
        const caseSensitive = this.caseSensitive;
        const allLevel =this.allLevel;
        const noChildren=this.objOnly


        if($.type(data)==='object')
        {    
            $.fn.scanChildren = JsonPaser.scanChildren;
            $.each(data,function(index,value) {
                if(debugEnabled) console.log(value);
                $.fn.scanChildren(index,value,requestKeys,allLevel,noChildren,caseSensitive,result);
                }
            );
        }
        else if ($.type(data)==='array')
        {
            //loop the value of array 
            $.grep(data,function(it,index){
                //change the object
                if($.type(it)==='object')
                {
                    JsonPaser.scanChildren(null,it,requestKeys,allLevel,noChildren,caseSensitive,result);
                }
            });
        }
        return  result;
     }
     //get the basic information for build WMS layer
     findWMSInfo(json_data) {
        let requestInfor=['layer','getmap'];
        this.setSearchObjOnly(true);
        this.setScanTree(true);
        let result =this.findInObj(json_data,requestInfor);
        return  result;

     };
}

