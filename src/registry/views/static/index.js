module.exports = `'use strict';

var oc = oc || {};
oc.cmd = oc.cmd || [];

oc.cmd.push(function() {
  var componentsListChanged = function() {
    $('.componentRow').removeClass('hide');
    var s = $('.search-filter').val(),
      a = $('.author-filter').val(),
      r = new RegExp(s),
      ar = new RegExp(a, 'i'),
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
      result = 'Showing ' + totalShowing + ' components';

    if (s) {
      result += ' matching search query: "' + s + '"';
      if (a) {
        result += ' and';
      }
    }
    if (a) {
      result += ' matching author query: "' + a + '"';
    }

    $('.componentRow.header .title').text(result);

    return false;
  };

  var initialiseTabs = function() {
    var selectItem = function(target) {
      var $target = $(target);
      $('.box').hide();
      $target.show();
      $('#menuList a').removeClass('selected');
      $('#menuList a[href="' + target + '"]').addClass('selected');
    };

    var hash = location.href.split('#')[1] || '';
    var isHashValid = hash && $('#' + hash);
    var target = isHashValid ? '#' + hash : $($('#menuList a')[0]).attr('href');
    selectItem(target);

    $('#menuList a').click(function() {
      selectItem($(this).attr('href'));
    });
  };

  $('#filter-components')
    .submit(componentsListChanged)
    .keyup(componentsListChanged);
  $('#filter-components input[type=checkbox]').change(componentsListChanged);

  if (q) {
    $('.search').val(q);
  }

  componentsListChanged();
  initialiseTabs();
});`;
