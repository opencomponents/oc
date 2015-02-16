'use strict';

var oc = oc || {};

(function(Handlebars, head, $document, $window, debug){

  // Constants
  var IE89_AJAX_POLYFILL_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jquery-ajaxtransport-xdomainrequest/1.0.3/jquery.xdomainrequest.min.js',
      JQUERY_URL = 'https://ajax.googleapis.com/ajax/libs/jquery/1.11.2/jquery.js',
      RETRY_INTERVAL = 5000,
      OC_TAG = 'oc-component',
      MESSAGES_ERRORS_HREF_MISSING = 'Href parameter missing',
      MESSAGES_ERRORS_LOADING_COMPONENT = 'Error loading {0} component',
      MESSAGES_ERRORS_RENDERING = 'Error rendering component: {0}, error: {1}',
      MESSAGES_ERRORS_RETRIEVING = 'Failed to retrieve the component. Retrying in {0} seconds...'.replace('{0}', RETRY_INTERVAL/1000),
      MESSAGES_ERRORS_VIEW_ENGINE_NOT_SUPPORTED = 'Error loading component: view engine {0} not supported',
      MESSAGES_LOADING_COMPONENT = 'Loading...',
      MESSAGES_RENDERED = 'Component \'{0}\' correctly rendered',
      MESSAGES_RETRIEVING = 'Unrendered component found. Trying to retrieve it...';

  // The code
  var headScripts = [],
      $ = typeof(jQuery) !== 'undefined' ? jQuery : undefined,
      noop = function(){},
      nav = $window.navigator.userAgent,
      is8 = !!(nav.match(/MSIE 8/)),
      is9 = !!(nav.match(/MSIE 9/)),
      initialised = false,
      initialising = false,
      readySubscribers = [];

  var logger = {
    error: function(msg){
      return console.log(msg);
    },
    info: function(msg){
      if(debug){
        return console.log(msg);
      }
    }
  };

  var _indexOf = function(arr, val){
    for(var i = 0; i < arr.length; i++){
      if(arr[i] === val){
        return i;
      }
    }
    return -1;
  };

  var processHtml = function($component, data, callback){

    var newId = Math.floor(Math.random()*9999999999);

    $component.html(data.html);
    $component.attr('id', newId);
    $component.attr('data-rendered', true);
    $component.attr('data-version', data.version);

    if(!!data.key){
      $component.attr('data-hash', data.key);
      oc.setEventListeners($component);
    }

    callback();
  };

  oc.ready = function(callback){

    if(initialised){
      return callback();
    } else if(initialising) {
      readySubscribers.push(callback);
    } else {

      initialising = true;

      var requirePolyfills = function(cb){
        if(is8 || is9){
          head.load(IE89_AJAX_POLYFILL_URL, cb);
        } else {
          cb();
        }
      };

      var done = function(){
        initialised = true;
        initialising = false;
        callback();
        for(var i = 0; i < readySubscribers.length; i++){
          readySubscribers[i]();
        }
      };

      if(!$){
        head.load(JQUERY_URL, function(){
          $ = jQuery;
          requirePolyfills(done);
        });
      } else {
        requirePolyfills(done);
      }
    }
  };

  oc.render = function(compiledView, model, callback){
    oc.ready(function(){
      if(!oc.components[compiledView.key]){
        callback(MESSAGES_ERRORS_LOADING_COMPONENT.replace('{0}', compiledView.key));
      } else {
        var compiledComponent = '';

        if(compiledView.type === 'handlebars'){
          var linkedComponent = Handlebars.template(oc.components[compiledView.key], []);
          compiledComponent = linkedComponent(model);
        } else if(compiledView.type === 'jade'){
          compiledComponent = oc.components[compiledView.key](model);
        } else {
          return callback(MESSAGES_ERRORS_VIEW_ENGINE_NOT_SUPPORTED.replace('{0}', compiledView.type));
        }
        callback(null, compiledComponent);
      }
    });
  };

  oc.renderNestedComponent = function($component, callback){
    oc.ready(function(){
      $component.html('<div class="oc-loading">' + MESSAGES_LOADING_COMPONENT + '</div>');

      oc.renderByHref($component.attr('href'), function(err, data){
        if(err || !data || !data.html){
          return logger.error(err);
        }

        processHtml($component, data, callback);
      });
    });
  };

  oc.renderByHref = function(href, callback){
    oc.ready(function(){
      if(href !== ''){
        $.ajax({
          url: href,
          headers: { 'render-mode': 'pre-rendered' }, 
          crossDomain: true,
          async: true,
          success: function(apiResponse){
            if(apiResponse.renderMode === 'pre-rendered'){
              head.load([apiResponse.template.src], function(){
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
              });
            } else if(apiResponse.renderMode === 'rendered'){
              logger.info(MESSAGES_RENDERED.replace('{0}', apiResponse.href));

              var innerHtmlPlusEnding = apiResponse.html.slice(apiResponse.html.indexOf('>') + 1),
                  innerHtml = innerHtmlPlusEnding.slice(0, innerHtmlPlusEnding.indexOf('<'));

              callback(null, {
                html: innerHtml, 
                version: apiResponse.version
              });            
            }
          },
          error: function(){
            logger.error(MESSAGES_ERRORS_RETRIEVING);
            setTimeout(function() {
              oc.renderByHref(href, callback);
            }, RETRY_INTERVAL);
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
        logger.info(MESSAGES_RETRIEVING);
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

  oc.setEventListeners = function(component){
    oc.ready(function(){
      component.off('reRender');
      component.on('reRender', function(event, href){
        var self = $(event.target);
        if(!!href && href !== ''){
          self.attr('href', href);
        }
        self.attr('data-hash', '');
        self.attr('data-rendered', false);
        oc.renderUnloadedComponents();
        return false;
      });
      component.trigger('loaded');
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

})(Handlebars, head, document, window, true); // jshint ignore:line