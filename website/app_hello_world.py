import tornado.ioloop
import tornado.web

port = 8701

class MainHandler(tornado.web.RequestHandler):
    def get(self):
        self.write("Hello, world!")

# favicon_path = '/path/to/favicon.ico'
static_path = 'static/static_file.html'

settings = {'debug': True}

handlers = [   
    # (r'/favicon.ico', tornado.web.StaticFileHandler, {'path': favicon_path}),
    # (r'/static/(.*)', tornado.web.StaticFileHandler, {'path': static_path}),
    (r'/(static_file)', tornado.web.StaticFileHandler, {'path': static_path}),
    (r'/', MainHandler)
    ]

application = tornado.web.Application(handlers, **settings)

# TODO make ES queries here.

if __name__ == "__main__":
    application.listen(port)
    tornado.ioloop.IOLoop.current().start()