export default `
var oc = oc || {};
oc.cmd = oc.cmd || [];

oc.cmd.push(function() {
  $('#versions').change(function() {
    window.location = thisComponentHref + $(this).val() + '/~info';
  });

  var refreshPreview = function() {
    var splitted = $('#href')
        .val()
        .split('?'),
      url = splitted[0],
      lang = $('#lang').val();

    if (url.slice(-1) !== '/') {
      url += '/';
    }

    url = url.replace('http://', '//').replace('https://', '//');
    url += '~preview/?__ocAcceptLanguage=' + lang + '&';

    if (splitted.length > 1) {
      url += splitted[1];
    }

    $('.preview-iframe').attr('src', url);

    return false;
  };

  var updateHrefFromParameters = function() {
    var baseUrl = $('#href').val().split('?')[0];
    var params = {};
    
    // Collect all parameter values
    $('.parameter-input').each(function() {
      var paramName = $(this).data('parameter');
      var paramValue;
      
      // Handle different input types
      if ($(this).attr('type') === 'checkbox') {
        paramValue = $(this).is(':checked') ? 'true' : 'false';
      } else {
        paramValue = $(this).val();
      }
      
      if (paramValue && paramValue.trim() !== '' && paramValue !== 'false') {
        params[paramName] = paramValue.trim();
      }
    });
    
    // Build query string
    var queryString = Object.keys(params).map(function(key) {
      return encodeURIComponent(key) + '=' + encodeURIComponent(params[key]);
    }).join('&');
    
    // Update href
    var newHref = baseUrl + (queryString ? '?' + queryString : '');
    $('#href').val(newHref);
    
    return newHref;
  };

  $('.refresh-preview').click(refreshPreview);

  // Add Enter key handler for the href input field
  $('#href').keypress(function(e) {
    if (e.which === 13) { // Enter key
      refreshPreview();
      return false;
    }
  });

  // Handle parameter input changes
  $('.parameter-input').on('input blur change', function() {
    updateHrefFromParameters();
  });

  // Handle Enter key on parameter inputs (for text and number inputs)
  $('.parameter-input[type="text"], .parameter-input[type="number"]').keypress(function(e) {
    if (e.which === 13) { // Enter key
      updateHrefFromParameters();
      refreshPreview();
      return false;
    }
  });

  // Handle checkbox changes - immediately refresh preview
  $('.parameter-input[type="checkbox"]').on('change', function() {
    updateHrefFromParameters();
    refreshPreview();
  });

  $('.open-preview').click(function() {
    refreshPreview();
    var url = $('.preview-iframe').attr('src');

    window.open(url, '_blank');
    return false;
  });

  // Collapsible sections functionality
  function initCollapsibleSections() {
    // Check if we're on mobile (screen width <= 1024px)
    var isMobile = window.innerWidth <= 1024;
    
    $('.collapsible-header').each(function() {
      var header = $(this);
      var content = $('#' + header.data('target'));
      var toggle = header.find('.collapse-toggle');
      
      // On mobile, start collapsed; on desktop, start expanded
      if (isMobile) {
        content.addClass('collapsed').removeClass('expanded');
        header.addClass('collapsed');
      } else {
        content.addClass('expanded').removeClass('collapsed');
        header.removeClass('collapsed');
      }
      
      // Handle click on header or toggle button
      header.on('click', function(e) {
        e.preventDefault();
        toggleSection(header, content);
      });
      
      toggle.on('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        toggleSection(header, content);
      });
    });
  }
  
  function toggleSection(header, content) {
    if (content.hasClass('collapsed')) {
      content.removeClass('collapsed').addClass('expanded');
      header.removeClass('collapsed');
    } else {
      content.removeClass('expanded').addClass('collapsed');
      header.addClass('collapsed');
    }
  }
  
  // Initialize collapsible sections on page load
  initCollapsibleSections();
  
  // Re-initialize on window resize
  $(window).on('resize', function() {
    initCollapsibleSections();
  });

});`;
