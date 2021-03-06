#!/usr/bin/env python
## -*- coding: utf-8 -*-
# Much of this code is from a tutorial: http://oinksoft.com/blog/view/3/
import os
import json
from mako import exceptions
from mako.lookup import TemplateLookup
import tornado.ioloop
import tornado.web
from tornado import httpclient
from tornado.web import RequestHandler
from elasticsearch import Elasticsearch

port = 8701
root = os.path.dirname(__file__) # __file__ is the path of this file

# application, then dir 'site'
# root = os.path.join(os.path.dirname(__file__), 'site')
template_root = os.path.join(root, 'templates')
blacklist_templates = ('layouts',)
es = Elasticsearch()

template_lookup = TemplateLookup(input_encoding='utf-8',
                                 output_encoding='utf-8',
                                 encoding_errors='replace',
                                 directories=[template_root])

def render_template(filename):
    if os.path.isdir(os.path.join(template_root, filename)):
        filename = os.path.join(filename, 'index.html')
    else:
        filename = '%s.html' % filename
    if any(filename.lstrip('/').startswith(p) for p in blacklist_templates):
        raise httpclient.HTTPError(404)
    try:
        # rendering happens here
        return template_lookup.get_template(filename).render()
    except exceptions.TopLevelLookupException:
        raise httpclient.HTTPError(404)

class DefaultHandler(tornado.web.RequestHandler):
    def get_error_html(self, status_code, exception, **kwargs):
        if hasattr(exception, 'code'):
            self.set_status(exception.code)
            if exception.code == 500:
                return exceptions.html_error_template().render()
            return render_template(str(exception.code))
        return exceptions.html_error_template().render()


class MainHandler(DefaultHandler):
    def get(self, filename):
         self.write(render_template(filename))

class JsonHandler(RequestHandler):
    def get(self, filename):
        f = open('json/nodes.json', 'r')
        # self.write(f.read())
        json_obj = json.loads(f.read())

        # unpack parameters
        num_requested = int(RequestHandler.get_argument(self, name='num', default=10))
        first_entry_requested = int(RequestHandler.get_argument(self, name='start', default=0))
        last_entry_requested = first_entry_requested + num_requested;

        json_to_return = []

        for i in range(first_entry_requested, last_entry_requested):
            print("i+1: {}".format(i+1))
            print(type(json_obj))
            try:
                json_to_return.append(json_obj[u'data'][i])
            except IndexError:
                break;

        self.write(json.dumps(json_to_return))

class ESHandler(RequestHandler):
    def get(self, filename):
        index = RequestHandler.get_argument(self, name='index',
            default='papers')
        # allow query to be passed to body:
        body = RequestHandler.get_argument(self, name='body',
            default={'query': {'match_all': {}}})
        response = es.search(index=index, body=body)
        hits = response['hits']['hits']
        self.write(json.dumps(hits))

application = tornado.web.Application([
    (r'^/json/(.*)$', JsonHandler),
    (r'^/static/(.*)$', MainHandler),
    (r'^/es/(.*)$', ESHandler),
], debug=True,
static_path=os.path.join(root, 'static') # sets static path to be root/static
)

if __name__ == "__main__":
    application.listen(port)
    tornado.ioloop.IOLoop.instance().start() # instance vs current?
