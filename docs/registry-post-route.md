Registry BATCH endpoint
=======================

It allows to retrieve a set of components with a single request to the API. While this should be convenient during the server-side rendering, it is not a good practice for client-side rendering.

# Server-side rendering via rest API using the post route

```sh
curl http://my-components-registry.mydomain.com/
  -X POST
  -d '{components:[{"name": hello-world", "version": "1.X.X"}, {"name": "my-component", "parameters": { "something": 2345 }}]}'

[{
  "href": "https://my-components-registry.mydomain.com/hello-world/1.X.X",
  "name": "hello-world",
  "version": "1.0.0",
  "requestVersion": "1.X.X",
  "html": "Hello John doe!",
  "type": "oc-component",
  "renderMode": "rendered"
},{
  "href": "https://my-components-registry.mydomain.com/my-component/?something=2345",
  "name": "my-component",
  "version": "1.0.0",
  "requestVersion": "",
  "html": "Bla bla",
  "type": "oc-component",
  "renderMode": "rendered"
}]
```
