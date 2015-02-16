# Advanced operations

1. [Add some logic](#add-some-logic)


## Add some logic

We can create components which provide static content. In that case our view could look like that:

```html
<div>hello world</div>
```
and we don't need to modify any other files.

But when we want to provide some additional logic in our view:

```html
<div>hello {{name}}</div>
```
we have to modify our `server.js` (model provider).

In given example, we want to pass name parameter to our view. To achieve this goal, we can modify server file in that way:

```js
'use strict';

module.exports.data = function(req, callback){
  callback(null,
    {
      name: "John"
    });
};
```
