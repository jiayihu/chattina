[![David](https://david-dm.org/jiayihu/chattina.svg)](https://david-dm.org/jiayihu/chattina.svg)
[![Codacy Badge](https://api.codacy.com/project/badge/grade/32903457402d47f2bb1fc5d544701458)](https://www.codacy.com/app/steph-jiayi/chattina)
![Love](https://img.shields.io/badge/Made%20with-%E2%99%A5-red.svg)

#Chattina *Work still in progress*

An [MVP](https://addyosmani.com/resources/essentialjsdesignpatterns/book/#detailmvp) (slightly different from MVC) Chat, built in native Javascript for fun and learning. No JQuery/MV* Framework dependency.

>This is not meant to be used for any production since it doesn't provide polyfills to old browsers. I'm using for instance CSS Flexbox and Viewport units.

##Main libraries used:
 - [Page.js](https://github.com/visionmedia/page.js) for routing and hash management
 - [localForage](https://github.com/mozilla/localForage) for offline client Storage
 - [PubSub.js](https://github.com/mroderick/PubSubJS) for Publish/Subscribe Event System

##Browser Support
 - Evergreen browsers (IE10+)

##Documentation

Javascript files are commented with [JSDoc 3](https://github.com/jsdoc3/jsdoc) format, therefore you can generate automatic API documentation by running the following command:
```
jsdoc app/javascripts -r -d docs
```
