# Birthday

Simple website with information about my birthday.

As I want to provide non public information (Link to Live location) this is more than a static website. Instead we use Cloudflare Worker as it is free for the first requests.

We use simple Basic Authentication to protect the website.

We store the non public information in cloudflare's key value store.
