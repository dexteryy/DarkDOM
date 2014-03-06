
# DarkDOM

> * Design your own markup languages on a higher level of abstraction than HTML
> * Build responsive cross-screen UI components
> * Better separation of concerns
> * Separate the presentation layer and business layer from the traditional content layer

## Examples

* Learning DarkDOM Visually

  [![](http://douban-f2e.github.io/cardkit-demo-darkdom/darkdom_thumbnail.png)](http://douban-f2e.github.io/cardkit-demo-darkdom/darkdom.pdf)

  * [PDF version](http://douban-f2e.github.io/cardkit-demo-darkdom/darkdom.pdf)
  * [PNG version](http://douban-f2e.github.io/cardkit-demo-darkdom/darkdom.png)
  * [Source code](https://github.com/douban-f2e/cardkit-demo-darkdom)
  * [Online demo (folder)](http://douban-f2e.github.io/cardkit-demo-darkdom/folder.html)
  * [Online demo (list)](http://douban-f2e.github.io/cardkit-demo-darkdom/index.html)
  * [Online demo (deck)](http://douban-f2e.github.io/cardkit-demo-darkdom/deck.html)

* codepen
  * [http://codepen.io/dexteryy/pen/niuCG](http://codepen.io/dexteryy/pen/niuCG)

## Usage

### AMD and OzJS

* DarkDOM can either be viewed as an independent library, or as a part of [OzJS mirco-framework](http://ozjs.org/#framework).
* It's wrapped as a number of mutually independent [AMD (Asynchronous Module Definition)](https://github.com/amdjs/amdjs-api/wiki/AMD) modules. You should use them with [oz.js](http://ozjs.org/#start) (or require.js or [similar](http://wiki.commonjs.org/wiki/Implementations) for handling dependencies). 
* If you want to make them available for both other AMD code and traditional code based on global namespace. OzJS provides [a mini define/require implementation](http://ozjs.org/examples/adapter/) to transform AMD module into traditional [module pattern](http://www.adequatelygood.com/2010/3/JavaScript-Module-Pattern-In-Depth).
* See [http://ozjs.org](http://ozjs.org) for details.

### Get the code

Add to your project as new dependency

* via [bower](http://bower.io/) - `bower install darkdom`
* via [istatic](http://ozjs.org/istatic)

Or [download directly from Github](https://github.com/dexteryy/DarkDOM/blob/master/darkdom.js)

## Dependencies

* [mo/lang/es5](https://github.com/dexteryy/mo)
* [mo/lang/mix](https://github.com/dexteryy/mo)
* [dollar](https://github.com/dexteryy/DollarJS) (or other jQuery-compatible library + [dollar/jquery](https://github.com/dexteryy/DollarJS/blob/master/dollar/jquery.js))  

## API and Usage

### DarkComponent API

```javascript
var darkdom = require('darkdom');
var component = darkdom(options); // see component.set(options)
```

* `component.set(options)` -- 
    * options --
        * `unique: false` -- 
        * `enableSource: false` --
        * `entireAsContent: false` --
        * `sourceAsContent: false` --
        * `render: function(data){ return '<...>...</...>'; }` -- 
            * `data.state`
            * `data.content` 
            * `data.component`
            * `data.context`
* `component.state(stateName, attrName)` --
* `component.state(stateName, getter, setter)` --
* `component.state({ stateName: attrName, stateName: getter, stateName: [getter, setter], ... })` --
* `component.contain(childComponentName, otherComponent)` --
* `component.contain(childComponentName, function(childComponent){ ...;return childComponent; })` --
* `component.contain({ childComponentName: otherComponent, ... })` --
* `component.forward('eventType selector', eventName)` --
* `component.response(updateEvent, function(changes){ ...; return resolved; })` --
    * updateEvent -- "state:name", "component:name", "content", "remove"...
    * changes --
    * resolved -- 
* `component.component(childComponentName)` --
* `component.createGuard()` --

### DarkGuard API

```javascript
var guard = component.createGuard();
```

* `guard.state()` -- see `component.state`
* `guard.component(childComponentName, function(childGuard){ /*spec*/  })` --
* `guard.component({ childComponentName: spec, ... })` --
* `guard.forward(eventName, 'eventType selector')` --
* `guard.forward(eventName, handler)` --
* `guard.source()` --
* `guard.watch(selector)` --
* `guard.watch(element)` --
* `guard.unwatch(selector)` --
* `guard.unwatch(element)` --
* `guard.unwatch()` --
* `guard.mount()` --
* `guard.unmount()` --
* `guard.update()` --
* `guard.render()` --
* `guard.stateGetter(name)` --
* `guard.stateSetter(name)` --
* `guard.createRoot()` --
* `guard.createSource()` --

### DOM API

```javascript
var root = $(selector)[0];
guard.watch(root);
```

* `root.darkGuard()` --
* `root.mountDarkDOM()` --
* `root.unmountDarkDOM()` --
* `root.resetDarkDOM()` --
* `root.getDarkState(name)` --
* `root.setDarkState(name, value, options)` --
    * options --
        * `update: false` -- 
* `root.updateDarkStates()` --
* `root.updateDarkDOM()` --
* `root.feedDarkDOM(sourceData)` --
* `root.feedDarkDOM(function(sourceData){...})` --
* `root.responseDarkDOM(updateEvent, function(changes){...})` -- see `component.response`
* `root.addEventListener(darkEvent, handler)`
    * darkEvent --
        * `darkdom:willMount` --
        * `darkdom:mounted` --
        * `darkdom:willUpdate` --
        * `darkdom:updated` --
        * `darkdom:rendered` --
        * `darkdom:removed` --

More coming soon...


## More References

See [OzJS Project Homepage](http://ozjs.org/)

## Release History

See [OzJS Release History](http://ozjs.org/#release)

## License

Copyright (c) 2010 - 2014 dexteryy  
Licensed under the MIT license.

