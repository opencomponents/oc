'use strict';

const oc = oc || {};
oc.cmd = oc.cmd || [];

oc.cmd.push(function(){

  $('#versions').change(function(){
    window.location = thisComponentHref + $(this).val() + '/~info';
  });

  $('.refresh-preview').click(function(){

    let url = splitted[0];
    const splitted = $('#href').val().split('?'),
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
