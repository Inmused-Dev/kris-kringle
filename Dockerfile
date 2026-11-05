# Pinned exactly, never a floating tag (estate rule).
FROM caddy:2.10.2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY site/ /srv/
