'use strict';

var oc = oc || {};
oc.cmd = oc.cmd || [];

oc.cmd.push(function(){

  var componentsListChanged = function(){
    $('.componentRow').removeClass('hide');
    var s = $('.search').val(),
        r = new RegExp(s),
        selectedCheckboxes = $('input[type=checkbox]:checked'),
        hiddenStates = [],
        hidden = 0,
        i;

    for(i = 0; i < selectedCheckboxes.length; i++){
      hiddenStates.push($(selectedCheckboxes[i]).attr('name'));
    }

    for(i = 0; i < componentsList.length; i++){
      var matches = !s || !!componentsList[i].name.match(r),
          selector = $('#component-' + componentsList[i].name),
          isHidden = false;

      for(var j = 0; j < hiddenStates.length; j++){
        if(componentsList[i].state.toLowerCase() === hiddenStates[j]){
          isHidden = true;
        }
      }

      var show = matches && !isHidden;
      selector[show ? 'removeClass' : 'addClass']('hide');
      if(!show){
        hidden += 1;
      }
    }

    var totalShowing = componentsList.length - hidden,
        result = 'Showing ' + totalShowing + ' components';

    if(!!s){
      result += ' matching search query: ' + s;
    }

    $('.componentRow.header .title').text(result);

    return false;
  };

  $('#filter-components').submit(componentsListChanged).keyup(componentsListChanged);
  $('#filter-components input[type=checkbox').change(componentsListChanged);

  if(!!q){
    $('.search').val(q);
  }

  componentsListChanged();
});
