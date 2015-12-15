# learning-tornado
A repository for learning how to use tornado, combined with elasticsearch
and d3.js for visualizations.

### To view main visualization:
* create elasticsearch documents in 'papers' index as found in [elasticsearch-documents](./elasticsearch-documents)
* run elasticsearch on localhost:9200
* access: /static/visualize\_es\_data.html

### TODO:

* Separate "make_bar_chart.js" into "make_bar_chart.js", "make_title_list.js",
and "make_word_cloud.js" (or separate code in another way that makes sense).
* TODOs found throughout make_bar_chart.js
