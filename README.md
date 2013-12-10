
# DarkDOM

> * Design your own markup languages on a higher level of abstraction than HTML
> * Build responsive cross-screen UI components
> * Better separation of concerns
> * Separate the presentation layer and business layer from the traditional content layer

## Examples

[http://codepen.io/dexteryy/pen/niuCG](http://codepen.io/dexteryy/pen/niuCG)

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

## API and usage

Comming soon...

## More References

See [OzJS Project Homepage](http://ozjs.org/)

## Release History

See [OzJS Release History](http://ozjs.org/#release)

## License

Copyright (c) 2010 - 2014 dexteryy  
Licensed under the MIT license.

