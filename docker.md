docker build -t node-connector .
docker run -p 80:80 -e JWT_SECRET=your_secret -e REFRESH_TOKEN_SECRET=your_refresh_secret -e INTERNAL_API_KEY=your_key node-connector


docker build -t node-connector .
docker run -p 80:80 node-connector

Important: When running inside Docker, this plugin operates on the container's filesystem. To rename files on the host, you'll need to mount a host directory as a volume when running the container:
docker run -d -p 80:80 -v /path/on/host:/data node-connector

docker run -d -p 80:80 -v C:\Users\Kamal\Desktop:/data node-connector
