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

  // Client-side pagination for the components list. Enabled only once the
  // registry has more components than a single page so smaller registries keep
  // the simple single-page view.
  var COMPONENTS_PAGE_SIZE = 50;
  var paginationEnabled = componentsList.length > COMPONENTS_PAGE_SIZE;
  var currentPage = 1;

  var renderComponentsPagination = function(totalMatching, totalPages) {
    var container = $('#components-pagination');
    if (!paginationEnabled || totalMatching <= COMPONENTS_PAGE_SIZE) {
      container.addClass('hide').empty();
      return;
    }

    // Build a compact list of page numbers: first, last, and a window around
    // the current page, with ellipses for the gaps.
    var pages = [];
    var windowSize = 1;
    var start = Math.max(2, currentPage - windowSize);
    var end = Math.min(totalPages - 1, currentPage + windowSize);
    pages.push(1);
    if (start > 2) {
      pages.push('...');
    }
    for (var p = start; p <= end; p++) {
      pages.push(p);
    }
    if (end < totalPages - 1) {
      pages.push('...');
    }
    if (totalPages > 1) {
      pages.push(totalPages);
    }

    var html =
      '<button type="button" class="pagination-btn pagination-prev" data-page="' +
      (currentPage - 1) +
      '"' +
      (currentPage <= 1 ? ' disabled' : '') +
      '>Prev</button>';
    for (var k = 0; k < pages.length; k++) {
      if (pages[k] === '...') {
        html += '<span class="pagination-ellipsis">…</span>';
      } else {
        html +=
          '<button type="button" class="pagination-btn pagination-page' +
          (pages[k] === currentPage ? ' active' : '') +
          '" data-page="' +
          pages[k] +
          '">' +
          pages[k] +
          '</button>';
      }
    }
    html +=
      '<button type="button" class="pagination-btn pagination-next" data-page="' +
      (currentPage + 1) +
      '"' +
      (currentPage >= totalPages ? ' disabled' : '') +
      '>Next</button>';

    container.html(html).removeClass('hide');
  };

  var applyComponentsView = function() {
    var s = $('#search-filter').val(),
      a = $('#author-filter').val(),
      r = safeRegExp(s, ''),
      ar = safeRegExp(a, 'i'),
      selectedCheckboxes = $('input[type=checkbox]:checked'),
      hiddenStates = [],
      matchingNames = [],
      i;

    for (i = 0; i < selectedCheckboxes.length; i++) {
      hiddenStates.push($(selectedCheckboxes[i]).attr('name'));
    }

    // First pass: figure out which components match the current filters.
    for (i = 0; i < componentsList.length; i++) {
      var matches = !s || !!componentsList[i].name.match(r),
        matchesAuthor =
          !a ||
          (componentsList[i].author.name &&
            !!componentsList[i].author.name.match(ar)),
        isHidden = false;

      for (var j = 0; j < hiddenStates.length; j++) {
        if (componentsList[i].state.toLowerCase() === hiddenStates[j]) {
          isHidden = true;
        }
      }

      if (matches && matchesAuthor && !isHidden) {
        matchingNames.push(componentsList[i].name);
      }
    }

    var totalMatching = matchingNames.length;
    var totalPages = paginationEnabled
      ? Math.max(1, Math.ceil(totalMatching / COMPONENTS_PAGE_SIZE))
      : 1;
    if (currentPage > totalPages) {
      currentPage = totalPages;
    }
    if (currentPage < 1) {
      currentPage = 1;
    }

    var startIdx = paginationEnabled
      ? (currentPage - 1) * COMPONENTS_PAGE_SIZE
      : 0;
    var endIdx = paginationEnabled ? startIdx + COMPONENTS_PAGE_SIZE : totalMatching;
    var visibleNames = {};
    for (i = startIdx; i < endIdx && i < totalMatching; i++) {
      visibleNames[matchingNames[i]] = true;
    }

    // Second pass: only rows that match the filters AND fall on the current
    // page are shown.
    for (i = 0; i < componentsList.length; i++) {
      var name = componentsList[i].name,
        show = visibleNames[name] === true;
      $('#component-' + name)[show ? 'removeClass' : 'addClass']('hide');
    }

    var result =
      totalMatching + (totalMatching === 1 ? ' component' : ' components');

    if (s) {
      result += ' matching "' + s + '"';
      if (a) {
        result += ' and';
      }
    }
    if (a) {
      result += ' by author "' + a + '"';
    }
    if (paginationEnabled && totalMatching > COMPONENTS_PAGE_SIZE) {
      result +=
        ' (showing ' +
        (startIdx + 1) +
        '–' +
        Math.min(endIdx, totalMatching) +
        ')';
    }

    $('#results-count').text(result);
    $('#components-empty')[totalMatching === 0 ? 'removeClass' : 'addClass'](
      'hide'
    );

    renderComponentsPagination(totalMatching, totalPages);

    return false;
  };

  var componentsListChanged = function() {
    // Any filter change resets back to the first page.
    currentPage = 1;
    return applyComponentsView();
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

  $('#components-pagination').on('click', '.pagination-btn', function() {
    var $btn = $(this);
    if ($btn.is('[disabled]')) {
      return;
    }
    var page = parseInt($btn.attr('data-page'), 10);
    if (isNaN(page)) {
      return;
    }
    currentPage = page;
    applyComponentsView();
    // Bring the top of the list back into view after switching pages.
    var listEl = document.getElementById('components-list');
    if (listEl && listEl.scrollIntoView) {
      listEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

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
