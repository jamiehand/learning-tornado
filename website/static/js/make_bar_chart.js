/*
 * make_bar_chart.js
 *
 * Visualize tag counts with a horizontal bar chart.
 */

var app = app || {}; // Could have 3 files that add things to this one object.
                     // (if size of this file gets unmanageable).

(function(exports){

    /* declare dataset; set address of where to access data */
    var dataset;
    var dataURL = "/es/";

    /* width, height, location of svg */
    var w = {};
    var h = {};
    w.default = 200;
    h.default = 230;
    var locationInDOM = "body";

    /* bar formatting */
    var minBarPlusPaddingHeight = 17; // min due to label height
    var isEveryTagDisplayedInBarChart = true;
    var barPadding = 3;
    var barColor = "rgb(0,200,50)";
    var barLabelColor = "white";
    var tagNameColor = "black";

    var clickHandler = function(d,i){
        console.log(d);
    };

    /* Key function, to be used whenever we bind data to elements.
     * This function specifies to take the key value of whatever
     * d object is passed into it. */
    // TODO is this being used? Should I change it to involve tagNames
    // or remove it?
    // var key = function(d) {
    //     return d.key;
    // };

    /* don't run automatically; allow user to load in their own parameters */
    var buildBarChart = function(params){
        dataURL = params.dataURL || dataURL;
        w.bars = params.width || w.default;
        h.bars = params.height || h.default;
        locationInDOM = params.locationInDOM || locationInDOM;
        barPadding = params.barPadding || barPadding;
        barColor = params.barColor || barColor;
        barLabelColor = params.barLabelColor || barLabelColor;
        tagNameColor = params.tagNameColor || tagNameColor;
        clickHandler = params.clickHandler || clickHandler;
        // key = params.keyFunction || key;

        /* 'function' is a callback function to be run once /es/ has
         * been fetched. */
        d3.json(dataURL, function(
            error, jsonList) {
            if (error) return console.warn(error);

            dataset = getTagCounts(jsonList); // pass the jsonList dict to separate its tags
            console.log(dataset);
            /* pass it a function as to what to do on click */
            drawBarsAndLabels(dataset, locationInDOM, clickHandler);
        });

    };

    function getTagCounts(docList) {
        var tagsObj = {};
        var i;
        var tempTags;

        var dataLen = docList.length;
        for (i=0; i<dataLen; i++){  // can use forEach
            tempTags = docList[i]._source.tags;
            tempTags.forEach(
                function(tagName){  // tagName is the element out of the array
                    if (!tagsObj.hasOwnProperty(tagName)) {
                        tagsObj[tagName] = 1;
                    } else { // increment count each time we see tag again
                        tagsObj[tagName] += 1;
                    }
                }
            );

        }
        return tagsObj;
    }

    /* dataset: an object */
    /* NOTE: this stores only the tag names in the DOM, and not their
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
            w.bars/3
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
                              [left_margin, w.bars - barPadding * 2]);

        console.log("right side: " + (w.bars - barPadding * 2));


        /* sort tagNames according to tag count */
        tagNames.sort(function(tag1, tag2){
            return dataset[tag2] - dataset[tag1]; // compare function
        });

        console.log(d3.extent(tagNames, function(d){
            return dataset[d];
        }))


        /* make list smaller if it's too many tags */
        var maxNumTags = Math.floor(h.bars/minBarPlusPaddingHeight);
        if(tagNames.length > maxNumTags){
            isEveryTagDisplayedInBarChart = false;
            var tempTagNames = [];
            for(var i=0; i<maxNumTags; i++){
                tempTagNames[i] = tagNames[i];
            }
            tagNames = tempTagNames;
        }

        var svg = d3.select(locationInDOM).append("svg");
        svg.attr("width", w.bars)
           .attr("height", h.bars);
        var rects = svg.selectAll("rect")
                       .data(tagNames) // pass in the list of properties
                       .enter()
                       .append("rect")
                       .attr("x", function(d) {
                           return xScale(0);
                       })
                       .attr("y", function(d, i) {
                           return i * (h.bars / tagNames.length);
                       })
                       .attr("width", function(d){
                           return xScale(dataset[d]) - left_margin; // TODO best way to manage left margin?
                       })
                       .attr("height", h.bars / tagNames.length - barPadding)
                       .attr("fill", barColor);

        rects.on("click", clickHandler);

        svg.selectAll("text.values") // these are 'text' tags with class 'values'
           .data(tagNames)
           .enter()
           .append("text")
           .text(function(d){
               return dataset[d];
           })
           .attr("x", function(d) {
               return xScale(dataset[d]) - char_width;
           })
           .attr("y", function(d, i){
               return ((i * (h.bars / tagNames.length)
                    + (h.bars / tagNames.length - barPadding + 7) / 2));
           })
           .attr("font-family", "sans-serif")  // TODO why does changing color/size not
           .attr("font-size", "11px")          // seem to affect the visualization?
           .attr("fill", barLabelColor)
           .attr("text-anchor", "middle")
           .attr("class", "values");

        svg.selectAll("text.labels")
           .data(tagNames)
           .enter()
           .append("text")
           .text(function(d){
               /* modified from http://stackoverflow.com/a/7463674/4979097 */
               var trimmedString = d.length > max_tagName_len_chars ?
                   d.substring(0, max_tagName_len_chars - 3) + "..." :
                   d.substring(0, max_tagName_len_chars);
               return trimmedString;
           })
           .attr("x", 10) // indent 10
           .attr("y", function(d, i){
               return ((i * (h.bars / tagNames.length)
                    + (h.bars / tagNames.length - barPadding + 7) / 2));
           })
           .style("font-family", "sans-serif")  // TODO why does changing color/size not
           .style("font-size", "13px")          // seem to affect the visualization?
           .style("fill", tagNameColor) // TODO put this in the CSS
           .style("text-anchor", "left")
           .attr("class", "labels");
    }

    var buildWordCloud = function(params){
        dataURL = params.dataURL || dataURL;
        w.cloud = params.width || w.default;
        h.cloud = params.height || h.default;
        locationInDOM = params.locationInDOM || locationInDOM;
        barPadding = params.barPadding || barPadding;
        barColor = params.barColor || barColor;
        barLabelColor = params.barLabelColor || barLabelColor;
        tagNameColor = params.tagNameColor || tagNameColor;
        clickHandler = params.clickHandler || clickHandler;
        // key = params.keyFunction || key;

        /* 'function' is a callback function to be run once /es/ has
         * been fetched. */
        d3.json(dataURL, function(
            error, jsonList) {
            if (error) return console.warn(error);

            dataset = getTagCounts(jsonList); // pass the jsonList dict to separate its tags
            console.log(dataset);
            /* pass it a function as to what to do on click */
            drawWordCloud(dataset, locationInDOM, clickHandler);
        });

    };

    var drawWordCloud = function(dataset, locationInDOM, clickHandler) {

        var max_tagName_len_pixels;
        var left_margin;
        var char_width = 6; // assume char width is 6 pixels
                            // TODO better soln for this?

        var min_text_size = 8;
        var max_text_size = 32;

        var tagNames = Object.getOwnPropertyNames(dataset);

        /* don't let tagNames be more than 1/3 of svg width */
        max_tagName_len_pixels = Math.min(
            (d3.max(tagNames, function(tag){ return tag.length; }) * char_width),
            w.cloud/3
        );
        max_tagName_len_chars = max_tagName_len_pixels / char_width;

        left_margin = 0;
        console.log(max_tagName_len_pixels);

        var wordSizeScale = d3.scale.linear()
                              .domain([0, d3.max(tagNames, function(d) {
                                    return dataset[d];
                                  })])
                              .range([min_text_size, max_text_size]);

        console.log("right side: " + (w.cloud - barPadding * 2));


        /* sort tagNames according to tag count */
        tagNames.sort(function(tag1, tag2){
            return dataset[tag2] - dataset[tag1]; // compare function
        });

        console.log(d3.extent(tagNames, function(d){
            return dataset[d];
        }))


        /* make list smaller if it's too many tags */
        var maxNumTags = Math.floor(h.cloud/minBarPlusPaddingHeight);
        if(tagNames.length > maxNumTags){
            isEveryTagDisplayedInBarChart = false;
            var tempTagNames = [];
            for(var i=0; i<maxNumTags; i++){
                tempTagNames[i] = tagNames[i];
            }
            tagNames = tempTagNames;
        }

        /* TODO use p and span */

        var cloud = d3.select(locationInDOM).append("p");
        // cloud.attr("width", w.cloud)  TODO put within div?
        //    .attr("height", h.cloud);
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
                           .style("color", "black");


            // TODO how to account for diff. widths of text?

        tagTexts.on("click", clickHandler);

        // /* TODO remove this? or use it for adding values separately from above? */
        // cloud.selectAll("text.values")
        //    .data(tagNames)
        //    .enter()
        //    .append("text")
        //    .text(function(d){
        //        return ("");
        //    })
        //    .attr("x", function(d) {
        //        return wordSizeScale(dataset[d]) * char_width; // TODO ? how to go between size of string in
        //                             // chars vs in pixels? esp. when pixel size of chars can be variable?
        //    })
        //    .attr("y", function(d, i){
        //        return ((i * (h.cloud / tagNames.length)
        //             + (h.cloud / tagNames.length - barPadding + 7) / 2));
        //    })
        //    .attr("font-family", "sans-serif")  // TODO why does changing color/size not
        //    .attr("font-size", "11px")          // seem to affect the visualization?
        //    .attr("fill", barLabelColor)
        //    .attr("text-anchor", "middle");


    };


    /* expose to the user the variables/fcns we want exposed */
    exports.buildBarChart = buildBarChart; // no () bc we want the fcn, not
                                           // the result of calling the fcn.
    exports.isEveryTagDisplayedInBarChart = isEveryTagDisplayedInBarChart;

    exports.buildWordCloud = buildWordCloud;

})(app);
