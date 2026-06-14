export default `'use strict';

var oc = oc || {};
oc.cmd = oc.cmd || [];

oc.cmd.push(function() {
  var escapeRegExp = function(s) {
    return String(s).replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&');
  };

  var safeRegExp = function(pattern, flags) {
    try {
      return new RegExp(pattern, flags);
    } catch (e) {
      return new RegExp(escapeRegExp(pattern), flags);
    }
  };

  var componentsListChanged = function() {
    $('.componentRow').removeClass('hide');
    var s = $('#search-filter').val(),
      a = $('#author-filter').val(),
      r = safeRegExp(s, ''),
      ar = safeRegExp(a, 'i'),
      selectedCheckboxes = $('input[type=checkbox]:checked'),
      hiddenStates = [],
      hidden = 0,
      i;

    for (i = 0; i < selectedCheckboxes.length; i++) {
      hiddenStates.push($(selectedCheckboxes[i]).attr('name'));
    }

    for (i = 0; i < componentsList.length; i++) {
      var matches = !s || !!componentsList[i].name.match(r),
        matchesAuthor =
          !a ||
          (componentsList[i].author.name &&
            !!componentsList[i].author.name.match(ar)),
        selector = $('#component-' + componentsList[i].name),
        isHidden = false;

      for (var j = 0; j < hiddenStates.length; j++) {
        if (componentsList[i].state.toLowerCase() === hiddenStates[j]) {
          isHidden = true;
        }
      }

      var show = matches && matchesAuthor && !isHidden;
      selector[show ? 'removeClass' : 'addClass']('hide');
      if (!show) {
        hidden += 1;
      }
    }

    var totalShowing = componentsList.length - hidden,
      result = totalShowing + (totalShowing === 1 ? ' component' : ' components');

    if (s) {
      result += ' matching "' + s + '"';
      if (a) {
        result += ' and';
      }
    }
    if (a) {
      result += ' by author "' + a + '"';
    }

    $('#results-count').text(result);
    $('#components-empty')[totalShowing === 0 ? 'removeClass' : 'addClass']('hide');

    return false;
  };

  var historyData = [];
  var historyRenderedCount = 0;
  var historyBatchSize = 50; // Number of items to render per batch
  var isLoadingMore = false;

  var renderHistoryBatch = function() {
    if (historyRenderedCount >= historyData.length || isLoadingMore) {
      return;
    }

    isLoadingMore = true;
    var historyContent = $('#history-content');
    var batchEnd = Math.min(historyRenderedCount + historyBatchSize, historyData.length);
    var batchHtml = '';

    for (var i = historyRenderedCount; i < batchEnd; i++) {
      var item = historyData[i];
      var templateSizeText = item.templateSize ? 
        ' [' + Math.round(item.templateSize / 1024) + ' kb]' : '';
      
      batchHtml += '<a href="' + item.name + '/' + item.version + '/~info">' +
                  '<div class="componentRow row table">' +
                  '<p class="release">' +
                  item.publishDate + ' - Published ' + item.name + '@' + item.version +
                  templateSizeText +
                  '</p>' +
                  '</div>' +
                  '</a>';
    }

    // Append new batch to existing content
    historyContent.append(batchHtml);
    historyRenderedCount = batchEnd;
    
    // Add loading indicator if there are more items
    if (historyRenderedCount < historyData.length) {
      historyContent.append('<div id="history-loading-more" class="loading-more">Loading more...</div>');
    }
    
    isLoadingMore = false;
  };

  var setupHistoryScrollListener = function() {
    var historyContainer = $('#components-history');
    var checkScroll = function() {
      if (historyRenderedCount >= historyData.length) {
        return;
      }

      var containerTop = historyContainer.offset().top;
      var containerHeight = historyContainer.outerHeight();
      var scrollTop = $(window).scrollTop();
      var windowHeight = $(window).height();
      
      // Check if user scrolled close to the bottom of the history container
      var distanceFromBottom = (containerTop + containerHeight) - (scrollTop + windowHeight);
      
      if (distanceFromBottom < 200) { // Load more when 200px from bottom
        $('#history-loading-more').remove();
        renderHistoryBatch();
      }
    };

    $(window).on('scroll.history', checkScroll);
    
    // Also check on resize
    $(window).on('resize.history', checkScroll);
  };

  var loadComponentsHistory = function() {
    var historyLoader = $('#history-loader');
    var historyContent = $('#history-content');
    var historyError = $('#history-error');

    // Show loader
    historyLoader.show();
    historyContent.hide();
    historyError.hide();

    // Reset state
    historyData = [];
    historyRenderedCount = 0;
    isLoadingMore = false;

    // Remove any existing scroll listeners
    $(window).off('scroll.history resize.history');

    // Fetch history data
    fetch('~registry/history')
      .then(function(response) {
        if (!response.ok) {
          throw new Error('Failed to fetch history');
        }
        return response.json();
      })
      .then(function(data) {
        historyData = data.componentsHistory || [];
        
        // Clear content and show container
        historyContent.empty();
        historyLoader.hide();
        historyContent.show();
        
        if (historyData.length === 0) {
          historyContent.html('<p class="empty-state">No components history available.</p>');
          return;
        }

        // Render first batch
        renderHistoryBatch();
        
        // Setup scroll listener for infinite loading
        setupHistoryScrollListener();
      })
      .catch(function(error) {
        console.error('Error loading components history:', error);
        historyLoader.hide();
        historyError.show();
      });
  };

  var isHistoryLoaded = false;

  var initialiseTabs = function() {
    var selectItem = function(target) {
      var $target = $(target);
      $('.box').hide();
      $target.show();
      $('#menuList a').removeClass('selected');
      $('#menuList a[href="' + target + '"]').addClass('selected');

      // Keep URL in sync so tab survives refresh and back/forward
      try {
        if (history && history.replaceState && location.hash !== target) {
          history.replaceState(null, '', target);
        }
      } catch (e) {}

      // Clean up scroll listeners when leaving history tab
      if (target !== '#components-history') {
        $(window).off('scroll.history resize.history');
      }
      
      // Load history data when history tab is selected for the first time
      if (target === '#components-history' && !isHistoryLoaded) {
        loadComponentsHistory();
        isHistoryLoaded = true;
      }
      // Re-enable scroll listeners when returning to history tab
      else if (target === '#components-history' && isHistoryLoaded && historyRenderedCount < historyData.length) {
        setupHistoryScrollListener();
      }
    };

    var hash = location.href.split('#')[1] || '';
    var isHashValid = hash && $('#' + hash);
    var target = isHashValid ? '#' + hash : $($('#menuList a')[0]).attr('href');
    selectItem(target);

    $('#menuList a').click(function() {
      selectItem($(this).attr('href'));
    });
  };

  var debounce = function(fn, wait) {
    var t;
    return function() {
      var ctx = this, args = arguments;
      clearTimeout(t);
      t = setTimeout(function(){ fn.apply(ctx, args); }, wait);
    };
  };

  $('#filter-components')
    .submit(componentsListChanged)
    .keyup(debounce(componentsListChanged, 80));
  $('#filter-components input[type=checkbox]').change(componentsListChanged);

  if (q) {
    $('.search').val(q);
  }

  // Keyboard shortcuts: "/" focuses search, "Esc" clears the focused filter
  $(document).on('keydown', function(e) {
    var tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
    var typing = tag === 'input' || tag === 'textarea' || tag === 'select';

    if (e.key === '/' && !typing) {
      var $s = $('#search-filter');
      if ($s.length) {
        e.preventDefault();
        $s.focus();
      }
    } else if (e.key === 'Escape' && typing && $(e.target).closest('#filter-components').length) {
      $(e.target).val('');
      componentsListChanged();
    }
  });

  // Focus the search input only on a fresh load (no tab hash, no in-page nav)
  if (!location.hash) {
    var $searchInput = $('#search-filter');
    if ($searchInput.length) { $searchInput.focus(); }
  }

  componentsListChanged();
  initialiseTabs();
});`;
