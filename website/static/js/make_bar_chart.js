/*
 * make_bar_chart.js
 *
 * Visualize tag counts with a horizontal bar chart.
 */

var app = app || {};

(function(exports){

    /* declare dataset; set address of where to access data */
    var dataset;
    var dataURL = "/es/";
    var dataCache = {};

    /* width, height, location of svg */
    var w = 200;
    var h = 230;
    var locationInDOM = "body";

    /* for storing preferences for the barChart and wordCloud */
    var barChart = {};
    var wordCloud = {};
    var titleNames = {};

    /* bar formatting */
    var minBarPlusPaddingHeight = 17; // min due to label height
    var isEveryTagDisplayedInBarChart = true;
    var barPadding = 3;
    var barColorBack = "rgb(200,235,188)";
    var barColorFront = "rgb(0,100,100)";
    var barLabelColor = "white";
    var tagNameColor = "black";

    var barsClickHandler = cloudClickHandler; // TODO change back to updateBarsAndLabels
    var titleNameClickHandler = cloudClickHandler; // TODO change this

    var fetchData = function(url, callback){
        if (dataCache[url]){ // if it's in the cache, return it
            callback(undefined, dataCache[url])
        } else { // otherwise, fetch it
            d3.json(url, function(error, data) {
                if (error) return console.warn(error);
                dataCache[url] = data;
                callback(error, data);
            });
        }
    };

    var cloudClickHandler = function(d,i){
        // console.log(d);
        fetchData(wordCloud.dataURL, function(error, jsonList) {
            if (error) return console.warn(error);

            dataset = getTagCounts(jsonList, d); // pass the jsonList dict to separate its tags
            console.log(dataset);
            /* pass it a function as to what to do on click */
            drawWordCloud(dataset, wordCloud.locationInDOM, wordCloud.clickHandler);
        });
    };

    /* don't run automatically; allow user to load in their own parameters */
    var buildBarChart = function(params){
        barChart.dataURL = params.dataURL || dataURL;
        barChart.w = params.width || w;
        barChart.h = params.height || h;
        barChart.locationInDOM = params.locationInDOM || locationInDOM;
        barChart.tagNameColor = params.tagNameColor || tagNameColor;
        barChart.clickHandler = params.clickHandler || barsClickHandler;
        barChart.titlesLists = params.titlesLists || undefined;  // TODO can't set this as "undefined" -- how to do it?

        barPadding = params.barPadding || barPadding;
        barColorBack = params.barColorBack || barColorBack;
        barColorFront = params.barColorFront || barColorFront;
        barLabelColor = params.barLabelColor || barLabelColor;

        /* 'function' is a callback function to be run once /es/ has
         * been fetched. */
        d3.json(barChart.dataURL, function(
            error, jsonList) {
            if (error) return console.warn(error);

            dataset = getTagCounts(jsonList); // pass the jsonList dict to separate its tags
            console.log(dataset);
            /* pass it a function as to what to do on click */
            drawBarsAndLabels(dataset, barChart.locationInDOM, barChart.clickHandler);
        });

    };


    /* pass in only the docList param to full count of all tags;
     * pass in both docList and selectedTagName to filter counts
     * by documents that contain the selectedTagName */
    function getTagCounts(docList, selectedTagName) {
        var tagsObj = {}; // obj to collect counts
        var i;
        var tempTags;

        var dataLen = docList.length;
        for (i=0; i<dataLen; i++){
            tempTags = docList[i]._source.tags;
            if (selectedTagName == undefined ||
                (tempTags.indexOf(selectedTagName) > -1)) {
                // TODO instead of forEach --> get the title --> could use filter funtion.
                tempTags.forEach(
                    function(tagName){  // tagName is an element of tempTags
                        if (!tagsObj.hasOwnProperty(tagName)) {
                            tagsObj[tagName] = 1;
                        } else { // increment count each time we see tag again
                            tagsObj[tagName] += 1;
                        }
                    }
                );
            }
        }
        return tagsObj;
    }

    /* pass in only the docList param to full count of all tags;
     * pass in both docList and selectedTagName to filter counts
     * by documents that contain the selectedTagName */
    function getTitleNames(docList, selectedTagName) {
        var titlesObj = {}; // obj to collect titles
        var i;
        var tempTags;
        var tempTitle;
        var titlesWithTag = [];
        var titlesWithoutTag = [];

        var dataLen = docList.length;
        for (i=0; i<dataLen; i++){
            tempTags = docList[i]._source.tags;
            tempTitle = docList[i]._source.title;
            /* if there is no tag parameter, or the tag is in the tag
             * list (tempTags) of this document, add title to titlesWithTag */
            if (selectedTagName == undefined ||
                (tempTags.indexOf(selectedTagName) > -1)) {
                titlesWithTag.push(tempTitle);
                console.log("pushed to With: " + tempTitle);
                // TODO instead of forEach --> get the title --> could use filter funtion.
                // tempTags.forEach(
                    // function(tagName){  // tagName is an element of tempTags
                        // if (!tagsObj.hasOwnProperty(tagName)) {
                        //     tagsObj[tagName] = 1;
                        // } else { // increment count each time we see tag again
                        //     tagsObj[tagName] += 1;
                        // }
                    // }
                // );
            } else {
                titlesWithoutTag.push(tempTitle);
                console.log("pushed to Without: " + tempTitle);
            }
        }
        titlesObj.titlesWithTag = titlesWithTag;
        titlesObj.titlesWithoutTag = titlesWithoutTag;
        return titlesObj;
    }

    /* dataset is an object
     * NOTE: this stores only the tag names in the DOM, and not their
     * counts. If I need the counts to be stored in the DOM later, I
     * can create an array of tag-count pair objects (e.g.
     * {tag: "foo", count: 2}) */

    function drawBarsAndLabels(dataset, locationInDOM, clickHandler) {

        var max_tagName_len_pixels;
        var left_margin;
        var char_width = 6; // assume char width is 6 pixels
                            // TODO better soln for this?

        var tagNames = Object.getOwnPropertyNames(dataset);

        /* don't let tagNames be more than 1/3 of svg width */
        max_tagName_len_pixels = Math.min(
            (d3.max(tagNames, function(tag){ return tag.length; }) * char_width),
            barChart.w/3
        );
        max_tagName_len_chars = max_tagName_len_pixels / char_width;

        left_margin = max_tagName_len_pixels + 5;
        console.log(max_tagName_len_pixels);

        /* scales
         * Note: min/max/extent takes in an array, and a fcn saying how
         * to process the objects in the array to get the value to
         * look at. */
        var xScale = d3.scale.linear()
                             // iterate over tagNames in order to iterate
                             // over the tags in the dataset (which are
                             // accessed by the tagName as the key).
                             .domain([0, d3.max(tagNames, function(d) {
                                return dataset[d];
                              })])
                             .range(
                              [left_margin, barChart.w - barPadding * 2]);

        console.log("right side: " + (barChart.w - barPadding * 2));


        /* sort tagNames according to tag count */
        tagNames.sort(function(tag1, tag2){
            return dataset[tag2] - dataset[tag1]; // compare function
        });

        console.log(d3.extent(tagNames, function(d){
            return dataset[d];
        }))


        /* make list smaller if it's too many tags */
        var maxNumTags = Math.floor(barChart.h/minBarPlusPaddingHeight);
        if(tagNames.length > maxNumTags){
            isEveryTagDisplayedInBarChart = false;
            var tempTagNames = [];
            for(var i=0; i<maxNumTags; i++){
                tempTagNames[i] = tagNames[i];
            }
            tagNames = tempTagNames;
        }

        // TODO better way to manage left margin than '- left_margin' ?

        var svg = d3.select(locationInDOM).append("svg");
        svg.attr("width", barChart.w)
           .attr("height", barChart.h);
        var rectsBack = svg.selectAll("rect.back")
                           .data(tagNames) // pass in the list of properties
                           .enter()
                           .append("rect")
                           .attr("class", "back")
                           .attr("x", function(d) {
                               return xScale(0);
                           })
                           .attr("y", function(d, i) {
                               return i * (barChart.h / tagNames.length);
                           })
                           .attr("width", function(d){
                               return xScale(dataset[d]) - left_margin;
                           })
                           .attr("height", barChart.h / tagNames.length - barPadding)
                           .attr("fill", barColorBack);

        var rectsFront = svg.selectAll("rect.front")
                            .data(tagNames) // pass in the list of properties
                            .enter()
                            .append("rect")
                            .attr("class", "front")
                            .attr("x", function(d) {
                                return xScale(0);
                            })
                            .attr("y", function(d, i) {
                                return i * (barChart.h / tagNames.length);
                            })
                            .attr("width", function(d){
                                return xScale(dataset[d]) - left_margin;
                            })
                            .attr("height", barChart.h / tagNames.length - barPadding)
                            .attr("fill", barColorFront);

        /*  make 'text' tags with class 'values' */
        var rectValues = svg.selectAll("text.values")
                            .data(tagNames)
                            .enter()
                            .append("text")
                            .attr("class", "values")
                            .text(function(d){
                                return dataset[d];
                            })
                            .attr("x", function(d) {
                                return xScale(dataset[d]) - char_width;
                            })
                            .attr("y", function(d, i){
                                return ((i * (barChart.h / tagNames.length)
                                     + (barChart.h / tagNames.length - barPadding + 7) / 2));
                            })
                            .attr("font-family", "sans-serif")
                            .attr("font-size", "11px")
                            .attr("fill", barLabelColor)
                            .attr("text-anchor", "middle");

        /* labels to go along side of chart */
        var rectLabels = svg.selectAll("text.labels")
                            .data(tagNames)
                            .enter()
                            .append("text")
                            .attr("class", "labels")
                            .text(function(d){
                                /* modified from http://stackoverflow.com/a/7463674/4979097 */
                                var trimmedString = d.length > max_tagName_len_chars ?
                                    d.substring(0, max_tagName_len_chars - 3) + "..." :
                                    d.substring(0, max_tagName_len_chars);
                                return trimmedString;
                            })
                            .attr("x", 10) // indent 10
                            .attr("y", function(d, i){
                                return ((i * (barChart.h / tagNames.length)
                                     + (barChart.h / tagNames.length - barPadding + 7) / 2));
                            })
                            .style("font-family", "sans-serif")
                            .style("font-size", "13px")
                            .style("fill", barChart.tagNameColor) // TODO put this in the CSS
                            .style("text-anchor", "left");

        // TODO make this function more generic and simply have s'th like:
        // rectsFront.on("click", updateBarsAndLabels(rectsFront, rectValues));
        // (i.e. be able to pass in the bars and values that I want to move),
        // enabling me to move 'updateBarsAndLabels()' outside this method.
        // But my problem is: .on() automatically passes the params of d, i,
        // and s'th else ('this?' - see https://github.com/mbostock/d3/wiki/Selections#on),
        // so how can I pass my own parameters?

        var updateBarsAndLabels = function(tagName){
            d3.json(barChart.dataURL, function(error, jsonList) {
                if (error) return console.warn(error);
                dataset = getTagCounts(jsonList, tagName);
                rectsFront.transition()
                          .delay(function(d, i) {
                               return i / dataset.length * 100;
                          })
                          .duration(1000)
                          .attr("width", function(d){
                              if (!(dataset.hasOwnProperty(d))){
                                  return xScale(0) - left_margin;
                              } else {
                                  return xScale(dataset[d]) - left_margin;
                              }
                          });
                rectValues.transition()
                          .delay(function(d, i) {
                               return i / dataset.length * 100;
                          })
                          .duration(1000)
                          .text(function(d){
                              if (!(dataset.hasOwnProperty(d))){
                                  return "";
                              } else {
                                  return dataset[d];
                              }
                          })
                          .attr("x", function(d){
                              if (!(dataset.hasOwnProperty(d))){
                                  return xScale(0) - char_width;
                              } else {
                                  return xScale(dataset[d]) - char_width;
                              }
                          });
            });
        };

        rectsFront.on("click", updateBarsAndLabels);
        rectsBack.on("click",  updateBarsAndLabels);
        rectLabels.on("click", updateBarsAndLabels);
        rectValues.on("click", updateBarsAndLabels);
    }

    var buildTitleNames = function(params){
        titleNames.dataURL = params.dataURL || dataURL;
        titleNames.w = params.width || w;
        titleNames.h = params.height || h;
        titleNames.locationInDOM = params.locationInDOM || locationInDOM;
        titleNames.tagNameColor = params.tagNameColor || tagNameColor;
        titleNames.clickHandler = params.clickHandler || titleNameClickHandler;

        /* 'function' is a callback function to be run once /es/ has
         * been fetched. */
        d3.json(wordCloud.dataURL, function(error, jsonList) {
            if (error) return console.warn(error);

            dataset = getTitleNames(jsonList); // pass the jsonList dict to separate its tags
            console.log(dataset);
            /* pass it a function as to what to do on click */
            return drawTitleNames(dataset, titleNames.locationInDOM,
                                  titleNames.clickHandler);
        });
    }

    var drawTitleNames = function(dataset, locationInDOM, clickHandler) {
        var titlesWithTag = dataset.titlesWithTag;
        var titlesWithoutTag = dataset.titlesWithoutTag;
        var text_size = 20;

        /* sort titles alphabetically */
        titlesWithTag.sort();
        titlesWithoutTag.sort();

        console.log(titlesWithTag);
        console.log(titlesWithoutTag);

        var titleList = d3.select(locationInDOM).append("p");
        titleList.append("span")
                 .attr("class", "heading")
                 .text("Project Titles: ")
                 .style("color", titleNames.tagNameColor);

        var titleTextsWithTag = titleList.selectAll("span")
                                  .data(titlesWithTag)
                                  .enter()
                                  .append("span")
                                  .attr("class", "titleOfDocWithTag")
                                  .text(function(d){
                                      /* modified from http://stackoverflow.com/a/7463674/4979097 */
                                      return ("- " + d);
                                  })
                                  .style("color", titleNames.tagNameColor);

        var titleTextsWithoutTag = titleList.selectAll("span")
                                  .data(titlesWithoutTag)
                                  .enter()
                                  .append("span")
                                  .attr("class", "titleOfDocWithoutTag")
                                  .text(function(d){
                                      /* modified from http://stackoverflow.com/a/7463674/4979097 */
                                      return ("- " + d);
                                  })
                                  .style("color", titleNames.tagNameColor);

        // titleTextsWithTag.on("click", clickHandler);
        // titleTextsWithoutTag.on("click", clickHandler);
        var titlesLists;
        titlesLists.titlesWithTag = titleTextsWithTag;
        titlesLists.titlesWithoutTag = titleTextsWithoutTag;
        return titlesLists;
    };

    var buildWordCloud = function(params){
        wordCloud.dataURL = params.dataURL || dataURL;
        wordCloud.w = params.width || w;
        wordCloud.h = params.height || h;
        wordCloud.locationInDOM = params.locationInDOM || locationInDOM;
        wordCloud.tagNameColor = params.tagNameColor || tagNameColor;
        wordCloud.clickHandler = params.clickHandler || cloudClickHandler;

        /* 'function' is a callback function to be run once /es/ has
         * been fetched. */
        d3.json(wordCloud.dataURL, function(error, jsonList) {
            if (error) return console.warn(error);

            dataset = getTagCounts(jsonList); // pass the jsonList dict to separate its tags
            console.log(dataset);
            /* pass it a function as to what to do on click */
            drawWordCloud(dataset, wordCloud.locationInDOM, wordCloud.clickHandler);
        });
    };

    var drawWordCloud = function(dataset, locationInDOM, clickHandler) {
        var tagNames = Object.getOwnPropertyNames(dataset);

        var min_text_size = 8;
        var max_text_size = 32;
        var wordSizeScale = d3.scale.linear()
                              .domain([0, d3.max(tagNames, function(d) {
                                    return dataset[d];
                                  })])
                              .range([min_text_size, max_text_size]);


        /* sort tagNames according to tag count */
        tagNames.sort(function(tag1, tag2){
            return dataset[tag2] - dataset[tag1]; // compare function
        });

        console.log(d3.extent(tagNames, function(d){
            return dataset[d];
        }))

        var cloud = d3.select(locationInDOM).append("p");
        cloud.append("span")
             .attr("class", "heading")
             .text("Tag Cloud: ")
             .style("color", titleNames.tagNameColor);
        var tagTexts = cloud.selectAll("span")
                           .data(tagNames)
                           .enter()
                           .append("span")
                           .attr("class", "cloudSpan")
                           .text(function(d){
                               /* modified from http://stackoverflow.com/a/7463674/4979097 */
                               return (d +"("+ dataset[d] +")");
                           })
                           .style("font-family", "sans-serif")
                           .style("font-size", function(tagName){
                               return Math.floor(wordSizeScale(dataset[tagName]))+"px";})
                           .style("color", wordCloud.tagNameColor);

        tagTexts.on("click", clickHandler);

    };


    /* expose to the user the variables/fcns we want exposed */
    exports.buildBarChart = buildBarChart;
    exports.isEveryTagDisplayedInBarChart = isEveryTagDisplayedInBarChart;
    exports.buildWordCloud = buildWordCloud;
    exports.buildTitleNames = buildTitleNames;


})(app);
