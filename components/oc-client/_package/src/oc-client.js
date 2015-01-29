'use strict';

var oc = oc || {};

(function(Handlebars, $document, debug){

  var headScripts = [],
      $ = typeof(jQuery) !== 'undefined' ? jQuery : undefined,
      JQUERY_URL = 'https://ajax.googleapis.com/ajax/libs/jquery/2.0.0/jquery.min.js',
      RETRY_INTERVAL = 5000,
      noop = function(){};

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

  var _require = function(hrefs, callback){

    if(!Array.isArray(hrefs)){
      hrefs = [hrefs];
    }

    var callbacks = hrefs.length,
        $head = $document.getElementsByTagName('head')[0];

    var tryExit = function(){ 
      callbacks--;
      if(callbacks === 0 && typeof(callback) === 'function'){ 
        callback();
        callback = noop;
      }
    };

    var appendScript = function(href){
      headScripts.push(href);
      var $script = $document.createElement('script');

      $script.type = 'text/javascript';
      $script.src = href;
      $script.onload = tryExit;
      $head.appendChild($script);
    };

    for(var i = 0; i < hrefs.length; i++){
      if(_indexOf(headScripts, hrefs[i]) < 0){
        appendScript(hrefs[i]);
      } else {
        tryExit();
      }
    }
  };

  var processHtml = function($component, data, callback){

    var newId = Math.floor(Math.random()*9999999999);

    $component.html(data.html);
    $component.attr('id', newId);
    $component.attr('data-hash', data.key);
    $component.attr('data-rendered', true);
    $component.attr('data-version', data.version);
    
    oc.setEventListeners($component);
    callback();
  };

  oc.render = function(component, model, callback){
    if(!oc.components[component]){
      callback('Error loading ' + component + ' component', null);
    } else {
      var linkedComponent = Handlebars.template(oc.components[component], []),
          compiledComponent = linkedComponent(model);
      
      callback(null, compiledComponent);
    }
  };

  oc.resolveNestedComponents = function(html, components){
    if(components){
      for(var componentName in components){
        if(components.hasOwnProperty(componentName)){
          var nestedComponentSnippet = '@component(\'' + componentName + '\')';
          while(html.indexOf(nestedComponentSnippet) >= 0){
            html = html.replace(nestedComponentSnippet, '<oc-component href="' + components[componentName].href + '"></oc-component>');
          }
        }
      }
    }
    return html;
  };

  oc.renderNestedComponent = function($component, callback){
    $component.html('<div class="loading">LOADING...</div>');

    oc.renderByHref($component.attr('href'), function(err, data){
      if(err || !data || !data.html){
        return logger.error(err);
      }

      processHtml($component, data, callback);
    });
  };

  oc.renderByHref = function(href, callback){
    if(href !== ''){
      $.ajax({
        url: href,
        headers: { 'render-mode': 'pre-rendered' }, 
        success: function(apiResponse){
          _require(apiResponse.template.src, function(){
            oc.render(apiResponse.template.key, apiResponse.data, function(err, html){
              if(err){
                return callback('Error rendering component: ' + apiResponse.href + ', error: ' + err, null);
              }
              html = oc.resolveNestedComponents(html, apiResponse.components);
              logger.info('Component \'' + apiResponse.template.src + '\' correctly loaded.');
              callback(null, {
                html: html, 
                key: apiResponse.template.key,
                version: apiResponse.version
              });
            });
          });
        },
        error: function(){
          logger.error('Failed to retrieve the component. Retrying in 5 seconds...');
          setTimeout(function() {
            oc.renderByHref(href, callback);
          }, RETRY_INTERVAL);
        }
      });
    } else {
      return callback('Failed to retrieve the component. Href parameter missing.', null);
    }
  };

  oc.renderUnloadedComponents = oc.refresh = function(){
    var $unloadedComponents = $('oc-component[data-rendered!=true]');

    var renderUnloadedComponent = function($unloadedComponents, i){
      logger.info('Unloaded component found. Trying to retrieve it...');
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
  };

  oc.setEventListeners = function(component){
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
  };

  oc.load = function(placeholder, href, callback){
    if($(placeholder)){
      $(placeholder).html('<oc-component href="' + href + '" />');
      var newComponent = $('oc-component', placeholder);
      oc.renderNestedComponent(newComponent, function(){
        if(typeof callback === 'function'){
          callback(newComponent);
        }
      });
    }
  };

  if(!$){
    _require(JQUERY_URL, function(){
      $ = jQuery;
      oc.renderUnloadedComponents();
    });
  } else {
    oc.renderUnloadedComponents();
  }

})(Handlebars, document, true); // jshint ignore:line
