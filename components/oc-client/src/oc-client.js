'use strict';

var oc = oc || {};

(function(head, $document, $window){

  oc.conf = oc.conf || {};
  oc.cmd = oc.cmd || [];

  // Constants
  var CDNJS_BASEURL = 'https://cdnjs.cloudflare.com/ajax/libs/',
      IE89_AJAX_POLYFILL_URL = CDNJS_BASEURL + 'jquery-ajaxtransport-xdomainrequest/1.0.3/jquery.xdomainrequest.min.js',
      HANDLEBARS_URL = CDNJS_BASEURL + 'handlebars.js/3.0.1/handlebars.runtime.js',
      JADE_URL = CDNJS_BASEURL + 'jade/1.9.2/runtime.min.js',
      JQUERY_URL = CDNJS_BASEURL + 'jquery/1.11.2/jquery.min.js',
      RETRY_INTERVAL = oc.conf.retryInterval || 5000,
      RETRY_LIMIT = oc.conf.retryLimit || 30,
      RETRY_SEND_NUMBER = oc.conf.retrySendNumber || true,
      POLLING_INTERVAL = oc.conf.pollingInterval || 500,
      OC_TAG = oc.conf.tag || 'oc-component',
      MESSAGES_ERRORS_HREF_MISSING = 'Href parameter missing',
      MESSAGES_ERRORS_RETRY_FAILED = 'Failed to load {0} component {1} times. Giving up'.replace('{1}', RETRY_LIMIT),
      MESSAGES_ERRORS_LOADING_COMPILED_VIEW = 'Error getting compiled view: {0}',
      MESSAGES_ERRORS_RENDERING = 'Error rendering component: {0}, error: {1}',
      MESSAGES_ERRORS_RETRIEVING = 'Failed to retrieve the component. Retrying in {0} seconds...'.replace('{0}', RETRY_INTERVAL/1000),
      MESSAGES_ERRORS_VIEW_ENGINE_NOT_SUPPORTED = 'Error loading component: view engine "{0}" not supported',
      MESSAGES_LOADING_COMPONENT = 'Loading...',
      MESSAGES_RENDERED = 'Component \'{0}\' correctly rendered',
      MESSAGES_RETRIEVING = 'Unrendered component found. Trying to retrieve it...';

  // The code
  var debug = oc.conf.debug || false,
      headScripts = [],
      $,
      noop = function(){},
      nav = $window.navigator.userAgent,
      is8 = !!(nav.match(/MSIE 8/)),
      is9 = !!(nav.match(/MSIE 9/)),
      initialised = false,
      initialising = false;

  var logger = {
    error: function(msg){
      return console.log(msg);
    },
    info: function(msg){
      return !!debug ? console.log(msg) : false;
    }
  };

  var retries = {};

  var retry = function(component, cb, failedRetryCb){
    if(retries[component] === undefined){
      retries[component] = RETRY_LIMIT;
    }

    if(retries[component] <= 0){
      return failedRetryCb();
    }

    setTimeout(function(){
      cb(RETRY_LIMIT - retries[component] + 1);
    }, RETRY_INTERVAL);
    retries[component]--;
  };
  
  var addParametersToHref = function (href, parameters) {
    if(href && parameters) {
      var param = $.param(parameters);
      if(href.indexOf('?') > -1) {
        return href + '&' + param;
      } else {
        return href + '?' + param;
      }
    }

    return href;
  };

  // A minimal require.js-ish that uses head.js
  oc.require = function(nameSpace, url, callback){
    if(typeof(url) === 'function'){
      callback = url;
      url = nameSpace;
      nameSpace = undefined;
    }

    if(typeof(nameSpace) === 'string'){
      nameSpace = [nameSpace];
    }

    var needsToBeLoaded = function(){
      var base = $window;

      if(typeof(nameSpace) === 'undefined'){
        return true;
      }

      for(var i = 0; i < nameSpace.length; i++){
        base = base[nameSpace[i]];
        if(!base){
          return true;
        }
      }

      return false;
    };

    var getObj = function(){
      var base = $window;

      if(typeof(nameSpace) === 'undefined'){
        return undefined;
      }

      for(var i = 0; i < nameSpace.length; i++){
        base = base[nameSpace[i]];
        if(!base){
          return undefined;
        }
      }

      return base;
    };

    if(needsToBeLoaded()){
      head.load(url, function(){
        callback(getObj());
      });
    } else {
      callback(getObj());
    }
  };


  var processHtml = function($component, data, callback){

    var newId = Math.floor(Math.random()*9999999999);

    $component.html(data.html);
    $component.attr('id', newId);
    $component.attr('data-rendered', true);
    $component.attr('data-rendering', false);
    $component.attr('data-version', data.version);

    if(!!data.key){
      $component.attr('data-hash', data.key);
    }

    callback();
  };

  oc.build = function(options){

    if(!options.baseUrl){
      throw 'baseUrl parameter is required';
    }

    if(!options.name){
      throw 'name parameter is required';
    }

    var withFinalSlash = function(s){
      s = s || '';

      if(s.slice(-1) !== '/'){
        s += '/';
      }

      return s;
    };

    var href = withFinalSlash(options.baseUrl) + withFinalSlash(options.name);

    if(!!options.version){
      href += withFinalSlash(options.version);
    }

    if(!!options.parameters){
      href += '?';
      for(var parameter in options.parameters){
        if(options.parameters.hasOwnProperty(parameter)){
          href += parameter + '=' + options.parameters[parameter] + '&';
        }
      }
      href = href.slice(0, -1);
    }

    return is8 ? '<div data-oc-component="true" href="' + href + '"></div>' : '<' + OC_TAG + ' href="' + href + '"></' + OC_TAG + '>';

  };

  oc.ready = function(callback){

    if(initialised){
      return callback();
    } else if(initialising) {
      oc.cmd.push(callback);
    } else {

      initialising = true;

      var requirePolyfills = function(cb){
        if((is8 || is9) && !$.IE_POLYFILL_LOADED){
          oc.require(IE89_AJAX_POLYFILL_URL, cb);
        } else {
          cb();
        }
      };

      var done = function(){
        initialised = true;
        initialising = false;
        callback();
        for(var i = 0; i < oc.cmd.length; i++){
          oc.cmd[i](oc);
        }

        oc.cmd = {
          push: function(f){
            f(oc);
          }
        };
      };

      oc.require('jQuery', JQUERY_URL, function(jQuery){
        $ = jQuery;
        requirePolyfills(done);
      });
    }
  };

  oc.render = function(compiledViewInfo, model, callback){
    oc.ready(function(){
      if(!!compiledViewInfo.type.match(/jade|handlebars/g)){
        oc.require(['oc', 'components', compiledViewInfo.key], compiledViewInfo.src, function(compiledView){
          if(!compiledView){
            callback(MESSAGES_ERRORS_LOADING_COMPILED_VIEW.replace('{0}', compiledViewInfo.src));
          } else {
            if(compiledViewInfo.type === 'handlebars'){
              oc.require('Handlebars', HANDLEBARS_URL, function(Handlebars){
                var linkedComponent = Handlebars.template(compiledView, []);
                callback(null, linkedComponent(model));
              });
            } else if(compiledViewInfo.type === 'jade'){
              oc.require('jade', JADE_URL, function(jade){
                callback(null, compiledView(model));
              });
            }
          }
        });
      } else {
        callback(MESSAGES_ERRORS_VIEW_ENGINE_NOT_SUPPORTED.replace('{0}', compiledViewInfo.type));
      }
    });
  };

  oc.renderNestedComponent = function($component, callback){
    oc.ready(function(){
      var dataRendering = $component.attr('data-rendering'),
          dataRendered = $component.attr('data-rendered'),
          isRendering = typeof(dataRendering) === 'boolean' ? dataRendering : (dataRendering === 'true'),
          isRendered = typeof(dataRendered) === 'boolean' ? dataRendered : (dataRendered === 'true');

      if(!isRendering && !isRendered){
        logger.info(MESSAGES_RETRIEVING);
        $component.attr('data-rendering', true);
        $component.html('<div class="oc-loading">' + MESSAGES_LOADING_COMPONENT + '</div>');

        oc.renderByHref($component.attr('href'), function(err, data){
          if(err || !data){
            logger.error(err);
            return callback();
          }

          processHtml($component, data, callback);
        });
      } else {
        setTimeout(callback, POLLING_INTERVAL);
      }
    });
  };

  oc.renderByHref = function(href, callback){
    console.log(RETRY_INTERVAL);
    console.log(href);
    oc.ready(function(){
      if(href !== ''){
        $.ajax({
          url: href,
          headers: { 'Accept': 'application/vnd.oc.unrendered+json' },
          contentType: 'text/plain',
          crossDomain: true,
          async: true,
          success: function(apiResponse){
            if(apiResponse.renderMode === 'pre-rendered' ||
               apiResponse.renderMode === 'unrendered'){
              oc.render(apiResponse.template, apiResponse.data, function(err, html){
                if(err){
                  return callback(MESSAGES_ERRORS_RENDERING.replace('{0}', apiResponse.href).replace('{1}', err));
                }
                logger.info(MESSAGES_RENDERED.replace('{0}', apiResponse.template.src));
                callback(null, {
                  html: html,
                  key: apiResponse.template.key,
                  version: apiResponse.version
                });
              });
            } else if(apiResponse.renderMode === 'rendered'){
              logger.info(MESSAGES_RENDERED.replace('{0}', apiResponse.href));

              if(apiResponse.html.indexOf('<' + OC_TAG) === 0){

                var innerHtmlPlusEnding = apiResponse.html.slice(apiResponse.html.indexOf('>') + 1),
                    innerHtml = innerHtmlPlusEnding.slice(0, innerHtmlPlusEnding.lastIndexOf('<'));
                apiResponse.html = innerHtml;
              }

              callback(null, {
                html: apiResponse.html,
                version: apiResponse.version
              });
            }
          },
          error: function(){
            logger.error(MESSAGES_ERRORS_RETRIEVING);
            var hrefWithoutCount = href;
            if(RETRY_SEND_NUMBER) {
              hrefWithoutCount = hrefWithoutCount.replace(/[\?\&]__oc_Retry=[0-9]+/, '');
            }

            retry(hrefWithoutCount, function(requestNumber) {
              var hrefWithCount = hrefWithoutCount;
              if(RETRY_SEND_NUMBER) {
                hrefWithCount = addParametersToHref(hrefWithCount, {
                  '__oc_Retry': requestNumber
                });
                console.log(hrefWithCount);
              }

              oc.renderByHref(hrefWithCount, callback);
            }, function(){
              callback(MESSAGES_ERRORS_RETRY_FAILED.replace('{0}', href));
            });
          }
        });
      } else {
        return callback(MESSAGES_ERRORS_RENDERING.replace('{1}', MESSAGES_ERRORS_HREF_MISSING));
      }
    });
  };

  oc.renderUnloadedComponents = function(){
    oc.ready(function(){
      var selector = (is8 ? 'div[data-oc-component=true]' : OC_TAG),
          $unloadedComponents = $(selector + '[data-rendered!=true]');

      var renderUnloadedComponent = function($unloadedComponents, i){
        oc.renderNestedComponent($($unloadedComponents[i]), function(){
          i++;
          if(i < $unloadedComponents.length){
            renderUnloadedComponent($unloadedComponents, i);
          } else {
            oc.renderUnloadedComponents();
          }
        });
      };

      if($unloadedComponents.length > 0){
        renderUnloadedComponent($unloadedComponents, 0);
      }
    });
  };

  oc.load = function(placeholder, href, callback){
    oc.ready(function(){
      if(typeof(callback) !== 'function'){
        callback = noop;
      }

      if($(placeholder)){
        $(placeholder).html('<' + OC_TAG + ' href="' + href + '" />');
        var newComponent = $(OC_TAG, placeholder);
        oc.renderNestedComponent(newComponent, function(){
          callback(newComponent);
        });
      }
    });
  };

  oc.ready(oc.renderUnloadedComponents);

})(head, document, window); // jshint ignore:line
