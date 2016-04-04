var oc = oc || {};
oc.cmd = oc.cmd || [];

oc.cmd.push(function(){

  var componentsListChanged = function(){
    $('.componentRow').removeClass('hide');
    var s = $('.search').val(),
        r = new RegExp(s),
        selectedCheckboxes = $('input[type=checkbox]:checked'),
        hiddenStates = [];

    for(var i = 0; i < selectedCheckboxes.length; i++){
      hiddenStates.push($(selectedCheckboxes[i]).attr('name'));
    }

    for(var i = 0; i < componentsList.length; i++){
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
    }

    return false;
  };

  $('#filter-components').submit(componentsListChanged).keyup(componentsListChanged);
  $('#filter-components input[type=checkbox').change(componentsListChanged);
});
