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

  $('#versions').change(function(){
    window.location = thisComponentHref + $(this).val() + '/~info';
  });

  $('.refresh-preview').click(function(){

    var splitted = $('#href').val().split('?'),
        url = splitted[0],
        lang = $('#lang').val();

    if(url.slice(-1) !== '/'){
      url += '/';
    }

    url = url.replace('http\:\/\/', '\/\/').replace('https\:\/\/', '\/\/');
    url += '~preview/?__ocAcceptLanguage=' + lang + '&';

    if(splitted.length > 1){
      url += splitted[1];
    }

    $('.preview').attr('src', url);

    return false;
  });
});
