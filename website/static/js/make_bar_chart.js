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

    /* width, height, location of svg; padding between bars */
    var w = 200;
    var h = 230;
    var locationInDOM = "body";
    var barPadding = 3;

    /* Key function, to be used whenever we bind data to elements.
     * This function specifies to take the key value of whatever
     * d object is passed into it. */
    // TODO is this being used? Should I change it to involve tagNames
    // or remove it?
    var key = function(d) {
        return d.key;
    };

    /* don't run automatically; allow user to load in their own parameters */
    var buildBarChart = function(params){
        dataURL = params.dataURL || dataURL;
        w = params.width || w;
        h = params.height || h;
        locationInDOM = params.locationInDOM || locationInDOM;
        barPadding = params.barPadding || barPadding;
        key = params.keyFunction || key;

        /* 'function' is a callback function to be run once /es/ has
         * been fetched. */
        d3.json(dataURL, function(
            error, jsonList) {
            if (error) return console.warn(error);
            // console.log(jsonList[0]._source.authors)
            console.log(jsonList);
            console.log(dataset);


            dataset = getTagCounts(jsonList); // pass the jsonList dict to separate its tags
            console.log(dataset);
            /* pass it a function as to what to do on click */
            makeBarChart(dataset, locationInDOM, function(d,i){
                console.log(d);
            });
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

    function makeBarChart(dataset, locationInDOM, clickHandler) {
        /* TODO label on left with tagName and use range
         * Extent */

        var tagNames = Object.getOwnPropertyNames(dataset);

        /* scales */
        console.log(dataset);
        console.log(dataset["Center for Open Science"]);

        console.log(d3.max(tagNames, function(d) { return dataset[d]; }) );


        /* Note: min/max/extent takes in an array, and a fcn saying how
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
                              [barPadding, w - barPadding * 2]);

        /* sort tagNames according to count */
        tagNames.sort(function(tag1, tag2){
            return dataset[tag2] - dataset[tag1]; // compare function
        });


        console.log(d3.extent(tagNames, function(d){
            return dataset[d];
        }))
        var svg = d3.select(locationInDOM).append("svg");
        svg.attr("width", w)
           .attr("height", h);
        var rects = svg.selectAll("rect")
                       .data(tagNames) // pass in the list of properties
                       .enter()
                       .append("rect")
                       .attr("x", function(d) {
                           return xScale(0);
                       })
                       .attr("y", function(d, i) {
                           return i * (h / tagNames.length);
                       })
                       .attr("width", function(d){
                           return xScale(dataset[d]);
                       })
                       .attr("height", h / tagNames.length - barPadding)
                       .attr("fill", function(d) {
                           return "rgb(0,200,"+ (dataset[d]*10) +")";
                       });

        rects.on("click", clickHandler);

        svg.selectAll("text")
           .data(tagNames)
           .enter()
           .append("text")
           .text(function(d){
               return dataset[d];
           })
           .attr("x", function(d) {
               return xScale(dataset[d]) - 5;
           })
           .attr("y", function(d, i){
               return ((i * (h / tagNames.length)
                    + (h / tagNames.length - barPadding + 7) / 2));
           })
           .attr("font-family", "sans-serif")
           .attr("font-size", "11px")
           .attr("fill", "white")
           .attr("text-anchor", "middle");
    }

    /* assign it the fcn, not the result of calling the fcn */
    exports.buildBarChart = buildBarChart;

})(app);
