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

    /* width, height, location of svg */
    var w = 200;
    var h = 230;
    var locationInDOM = "body";

    /* for storing preferences for the barChart and wordCloud */
    var barChart = {};
    var wordCloud = {};

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

    /* don't run automatically; allow user to load in their own parameters */
    var buildBarChart = function(params){
        barChart.dataURL = params.dataURL || dataURL;
        barChart.w = params.width || w;
        barChart.h = params.height || h;
        barChart.locationInDOM = params.locationInDOM || locationInDOM;
        barChart.tagNameColor = params.tagNameColor || tagNameColor;
        barChart.clickHandler = params.clickHandler || clickHandler;

        barPadding = params.barPadding || barPadding;
        barColor = params.barColor || barColor;
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


    /* Note: JS doesn't mind if I have the right number of params */
    function getTagCounts(docList, selectedTagName) {
        var tagsObj = {}; // obj to collect counts
        var i;
        var tempTags;

        var dataLen = docList.length;
        for (i=0; i<dataLen; i++){
            tempTags = docList[i]._source.tags;
            if (selectedTagName == undefined || (tempTags.indexOf(selectedTagName) > -1)) {
                console.log("hello");
                // TODO instead of forEach --> get the title --> could use filter funtion.
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
        }
        return tagsObj;
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

        var svg = d3.select(locationInDOM).append("svg");
        svg.attr("width", barChart.w)
           .attr("height", barChart.h);
        var rects = svg.selectAll("rect")
                       .data(tagNames) // pass in the list of properties
                       .enter()
                       .append("rect")
                       .attr("x", function(d) {
                           return xScale(0);
                       })
                       .attr("y", function(d, i) {
                           return i * (barChart.h / tagNames.length);
                       })
                       .attr("width", function(d){
                           return xScale(dataset[d]) - left_margin; // TODO best way to manage left margin?
                       })
                       .attr("height", barChart.h / tagNames.length - barPadding)
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
               return ((i * (barChart.h / tagNames.length)
                    + (barChart.h / tagNames.length - barPadding + 7) / 2));
           })
           .attr("font-family", "sans-serif")
           .attr("font-size", "11px")
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
               return ((i * (barChart.h / tagNames.length)
                    + (barChart.h / tagNames.length - barPadding + 7) / 2));
           })
           .style("font-family", "sans-serif")
           .style("font-size", "13px")
           .style("fill", barChart.tagNameColor) // TODO put this in the CSS
           .style("text-anchor", "left")
           .attr("class", "labels");
    }

    var buildWordCloud = function(params){
        wordCloud.dataURL = params.dataURL || dataURL;
        wordCloud.w = params.width || w;
        wordCloud.h = params.height || h;
        wordCloud.locationInDOM = params.locationInDOM || locationInDOM;
        wordCloud.barPadding = params.barPadding || barPadding;
        wordCloud.barColor = params.barColor || barColor;
        wordCloud.barLabelColor = params.barLabelColor || barLabelColor;
        wordCloud.tagNameColor = params.tagNameColor || tagNameColor;
        wordCloud.clickHandler = params.clickHandler || clickHandler;

        /* 'function' is a callback function to be run once /es/ has
         * been fetched. */
        d3.json(wordCloud.dataURL, function(error, jsonList) {
            if (error) return console.warn(error);

            dataset = getTagCounts(jsonList, "COS"); // pass the jsonList dict to separate its tags
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
        // cloud.attr("width", wordCloud.w) // TODO put within div?
        //    .attr("height", wordCloud.h);
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

})(app);
