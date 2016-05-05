Examples
---

Assuming you've installed the [oc cli](https://github.com/opentable/oc#install-the-cli) you can now run the examples!

1. `cd examples`
2. `oc dev . 3030` (start the oc dev registry)
2. [http://localhost:3030/](http://localhost:3030/) (browse to the registry page)
3. Explore the components!

####[hello-world](http://localhost:3030/hello-world/1.0.0/~info)
Says hello!

parameters:
- `name`
- `age`

###[github-api](http://localhost:3030/github-api/1.0.0/~info)
uses the github api to get a list of public repos for a given user

parameters:
- `username` github username
