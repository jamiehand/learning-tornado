#!/usr/bin/env python
## -*- coding: utf-8 -*-
import os
from mako import exceptions
from mako.lookup import TemplateLookup
import tornado.ioloop
import tornado.web
from tornado import httpclient

port = 8701
root = os.path.dirname(__file__)
template_root = os.path.join(root, 'templates')
blacklist_templates = ('layouts',)

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

application = tornado.web.Application([
    (r'^/(.*)$', MainHandler),
], debug=True, static_path=os.path.join(root, 'static'))


# # favicon_path = '/path/to/favicon.ico'
# static_path = 'static/static_file.html'

# settings = {'debug': True}

# handlers = [   
#     # (r'/favicon.ico', tornado.web.StaticFileHandler, {'path': favicon_path}),
#     # (r'/static/(.*)', tornado.web.StaticFileHandler, {'path': static_path}),
#     (r'/(static_file)', tornado.web.StaticFileHandler, {'path': static_path}),
#     (r'/', MainHandler)
#     ]

# application = tornado.web.Application(handlers, **settings)

# TODO make ES queries here.

if __name__ == "__main__":
    application.listen(port)
    tornado.ioloop.IOLoop.instance().start() # instance vs current?





