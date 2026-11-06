import multiprocessing
import os

bind = os.getenv("BIND", "0.0.0.0:5000")
workers = int(os.getenv("GUNICORN_WORKERS", "2"))
worker_class = os.getenv("GUNICORN_WORKER_CLASS", "geventwebsocket.gunicorn.workers.GeventWebSocketWorker")
worker_connections = 1000
timeout = 60
keepalive = 5

accesslog = "-"
errorlog = "-"
loglevel = os.getenv("LOG_LEVEL", "info")

# Lifecycle Hooks
def on_starting(server):
    server.log.info("Starting QueueSmart AI Production Application Server...")

def post_fork(server, worker):
    server.log.info(f"Worker spawned (pid: {worker.pid})")
